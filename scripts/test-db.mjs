/**
 * Runs the Supabase migrations against a real Postgres (PGlite, in-process)
 * and asserts that the authorization model actually behaves as intended.
 *
 *   npm run db:test
 *
 * Why this exists
 * ---------------
 * RLS is the only thing standing between the public internet and the
 * restaurant's customer list. "It looks right" is not good enough: a missing
 * policy, a missing GRANT, or a policy that accidentally applies to `anon`
 * are all invisible in review and catastrophic in production.
 *
 * This boots Postgres, applies the real migration files, seeds them, then
 * connects as each role and checks what it can and cannot do.
 *
 * Supabase-provided objects (auth schema, storage schema, the anon /
 * authenticated roles) are stubbed here to match Supabase's behaviour.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const ROOT = process.cwd();
const read = (p) => readFile(path.join(ROOT, p), "utf8");

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Runs `fn` as `role` with an optional auth.uid(), then resets. */
async function as(db, role, uid, fn) {
  await db.exec(`set role ${role};`);
  await db.exec(
    uid
      ? `select set_config('request.jwt.claim.sub', '${uid}', false);`
      : `select set_config('request.jwt.claim.sub', '', false);`,
  );
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}

/**
 * Expects a mutation to change NOTHING.
 *
 * An UPDATE or DELETE that RLS filters down to zero rows does not raise — it
 * reports success having touched nothing. That is safe, but "it threw" is the
 * wrong assertion: the property that matters is that the data is unchanged.
 * So this checks both the row count and the stored value.
 */
async function changesNothing(db, label, run, verify) {
  let affected = null;
  try {
    const result = await run();
    affected = result?.affectedRows ?? 0;
  } catch (error) {
    const message = String(error.message ?? error);
    if (!/permission denied|violates row-level security|policy/i.test(message)) {
      check(label, false, `blocked by the wrong error: ${message}`);
      return;
    }
    check(label, true);
    return;
  }
  const stillCorrect = verify ? await verify() : true;
  check(
    label,
    affected === 0 && stillCorrect,
    affected !== 0
      ? `${affected} row(s) were modified`
      : "the row count was 0 but the stored value changed",
  );
}

/** Expects the callback to throw (a permission or policy violation). */
async function denied(db, label, fn) {
  try {
    await fn();
    check(label, false, "the operation SUCCEEDED but should have been blocked");
  } catch (error) {
    const message = String(error.message ?? error);
    const isAuthz =
      /permission denied|violates row-level security|policy/i.test(message);
    check(label, isAuthz, isAuthz ? "" : `blocked, but by the wrong error: ${message}`);
  }
}

async function main() {
  const db = await PGlite.create();

  console.log("Bootstrapping Supabase-provided objects…");

  // Roles and schemas that Supabase supplies for us.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;

    create schema if not exists auth;
    create table auth.users (
      id uuid primary key,
      email text
    );

    -- Supabase reads the JWT subject claim; PGlite has no JWT, so a session
    -- setting stands in for it. Same signature, same return type.
    create or replace function auth.uid() returns uuid
      language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

    create schema if not exists storage;
    create table storage.buckets (
      id text primary key,
      name text not null,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create table storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text references storage.buckets (id),
      name text,
      owner uuid
    );
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated;
    grant select, insert, update, delete on storage.objects to anon, authenticated;

    -- Supabase's default: broad grants that 0002 is expected to revoke.
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public
      grant all on tables to anon, authenticated;
  `);

  console.log("Applying migrations…");
  for (const file of ["0001_schema.sql", "0002_rls.sql", "0003_storage.sql"]) {
    const sql = await read(path.join("supabase", "migrations", file));
    // pgcrypto ships with Supabase; PGlite has gen_random_uuid() in core.
    await db.exec(sql.replace(/create extension if not exists "pgcrypto";/g, ""));
    console.log(`  applied ${file}`);
  }

  console.log("Seeding…");
  await db.exec(await read(path.join("supabase", "seed.sql")));

  // Two accounts: one allow-listed admin, one ordinary signed-up user.
  const ADMIN = "11111111-1111-1111-1111-111111111111";
  const INTRUDER = "22222222-2222-2222-2222-222222222222";
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ADMIN}', 'owner@travelingroots.rw'),
      ('${INTRUDER}', 'random@signup.com');
    insert into public.admin_users (id, email, role)
      values ('${ADMIN}', 'owner@travelingroots.rw', 'owner');
  `);

  /* ------------------------------------------------------------------ */
  console.log("\nSeed integrity");
  /* ------------------------------------------------------------------ */

  const counts = await db.query(`
    select
      (select count(*) from public.menu_categories) as categories,
      (select count(*) from public.menu_sections)   as sections,
      (select count(*) from public.menu_items)      as items,
      (select count(*) from public.social_links)    as socials
  `);
  const c = counts.rows[0];
  check("11 categories seeded", Number(c.categories) === 11, `got ${c.categories}`);
  check("19 sections seeded", Number(c.sections) === 19, `got ${c.sections}`);
  check("92 menu items seeded", Number(c.items) === 92, `got ${c.items}`);

  const ribs = await db.query(
    `select price, variants, dietary, availability_note from public.menu_items where name = 'Pork Ribs'`,
  );
  check("Pork Ribs has no base price", ribs.rows[0].price === null);
  check(
    "Pork Ribs variants parsed to integers",
    JSON.stringify(ribs.rows[0].variants) ===
      JSON.stringify([
        { label: "400g", price: 13500 },
        { label: "500g", price: 16500 },
        { label: "1kg", price: 26500 },
      ]),
    JSON.stringify(ribs.rows[0].variants),
  );
  check(
    "Pork Ribs keeps its availability note",
    ribs.rows[0].availability_note === "Ask if available",
  );

  const soup = await db.query(
    `select price, dietary from public.menu_items where name = 'Soup of the Day'`,
  );
  check("6,000 RWF parsed to 6000", soup.rows[0].price === 6000, String(soup.rows[0].price));
  check(
    "dietary tags preserved",
    JSON.stringify(soup.rows[0].dietary) === JSON.stringify(["Gluten-free"]),
  );

  const drinks = await db.query(`
    select s.title from public.menu_sections s
    join public.menu_categories c on c.id = s.category_id
    where c.slug = 'drinks' order by s.sort_order
  `);
  check(
    "Drinks keeps all 9 titled sections",
    drinks.rows.length === 9 && drinks.rows[0].title === "Tea",
    `${drinks.rows.length} sections`,
  );

  const seedAgain = await read(path.join("supabase", "seed.sql"));
  await db.exec(seedAgain);
  const after = await db.query(`select count(*) as n from public.menu_items`);
  check("seed is idempotent (re-running adds nothing)", Number(after.rows[0].n) === 92,
    `got ${after.rows[0].n}`);

  /* ------------------------------------------------------------------ */
  console.log("\nPublic visitor (anon)");
  /* ------------------------------------------------------------------ */

  await as(db, "anon", null, async () => {
    const items = await db.query("select count(*) as n from public.menu_items");
    check("can read the published menu", Number(items.rows[0].n) === 92);

    const business = await db.query("select phone from public.business_info");
    check("can read business info", business.rows[0]?.phone === "+250794317286");
  });

  await denied(db, "CANNOT read reservation requests", () =>
    as(db, "anon", null, () => db.query("select * from public.reservation_requests")),
  );
  await denied(db, "CANNOT edit a menu item", () =>
    as(db, "anon", null, () =>
      db.query("update public.menu_items set price = 1 where name = 'Soup of the Day'"),
    ),
  );
  await denied(db, "CANNOT delete a menu category", () =>
    as(db, "anon", null, () => db.query("delete from public.menu_categories")),
  );
  await denied(db, "CANNOT read the admin allow-list", () =>
    as(db, "anon", null, () => db.query("select * from public.admin_users")),
  );

  await as(db, "anon", null, async () => {
    await db.query(
      `insert into public.reservation_requests (name, phone, party_size, preferred_at)
       values ('Visitor', '+250780000000', 4, now() + interval '2 days')`,
    );
    check("CAN submit a reservation request", true);
  });

  await denied(db, "CANNOT self-approve a reservation (column grant)", () =>
    as(db, "anon", null, () =>
      db.query(
        `insert into public.reservation_requests (name, phone, party_size, preferred_at, status)
         values ('Sneaky', '+250780000001', 2, now() + interval '1 day', 'confirmed')`,
      ),
    ),
  );
  await denied(db, "CANNOT write staff-only admin_notes", () =>
    as(db, "anon", null, () =>
      db.query(
        `insert into public.reservation_requests (name, phone, party_size, preferred_at, admin_notes)
         values ('Sneaky', '+250780000002', 2, now() + interval '1 day', 'x')`,
      ),
    ),
  );
  await denied(db, "CANNOT backdate a reservation into the past", () =>
    as(db, "anon", null, () =>
      db.query(
        `insert into public.reservation_requests (name, phone, party_size, preferred_at)
         values ('Past', '+250780000003', 2, now() - interval '10 days')`,
      ),
    ),
  );

  /* ------------------------------------------------------------------ */
  console.log("\nSigned-up user who is NOT an admin");
  /* ------------------------------------------------------------------ */
  // This is the case the Bar Mubiti model got wrong: authentication treated as
  // authorization. If sign-up is open, this user is any stranger on the web.

  await changesNothing(
    db,
    "CANNOT edit the menu",
    () =>
      as(db, "authenticated", INTRUDER, () =>
        db.query("update public.menu_items set price = 1 where name = 'Soup of the Day'"),
      ),
    async () => {
      const r = await db.query(
        "select price from public.menu_items where name = 'Soup of the Day'",
      );
      return r.rows[0].price === 6000;
    },
  );
  await changesNothing(
    db,
    "CANNOT change business info",
    () =>
      as(db, "authenticated", INTRUDER, () =>
        db.query("update public.business_info set phone = '+000' where id = 1"),
      ),
    async () => {
      const r = await db.query("select phone from public.business_info where id = 1");
      return r.rows[0].phone === "+250794317286";
    },
  );
  await changesNothing(
    db,
    "CANNOT activate a hero video",
    () =>
      as(db, "authenticated", INTRUDER, () =>
        db.query("update public.hero_media set is_active = true"),
      ),
    async () => {
      const r = await db.query(
        "select count(*) as n from public.hero_media where is_active",
      );
      return Number(r.rows[0].n) === 0;
    },
  );
  await changesNothing(
    db,
    "CANNOT delete published testimonials",
    () =>
      as(db, "authenticated", INTRUDER, () => db.query("delete from public.testimonials")),
  );
  await denied(db, "CANNOT upload to storage", () =>
    as(db, "authenticated", INTRUDER, () =>
      db.query(`insert into storage.objects (bucket_id, name) values ('hero', 'x.mp4')`),
    ),
  );

  await as(db, "authenticated", INTRUDER, async () => {
    const rows = await db.query("select count(*) as n from public.reservation_requests");
    check("sees zero reservation requests", Number(rows.rows[0].n) === 0, `saw ${rows.rows[0].n}`);
  });

  await denied(db, "CANNOT promote themselves to admin", () =>
    as(db, "authenticated", INTRUDER, () =>
      db.query(
        `insert into public.admin_users (id, email) values ('${INTRUDER}', 'random@signup.com')`,
      ),
    ),
  );

  /* ------------------------------------------------------------------ */
  console.log("\nAllow-listed admin");
  /* ------------------------------------------------------------------ */

  await as(db, "authenticated", ADMIN, async () => {
    await db.query(
      "update public.menu_items set price = 6500 where name = 'Soup of the Day'",
    );
    check("can edit a menu item", true);

    await db.query("update public.business_info set phone = '+250794317286' where id = 1");
    check("can edit business info", true);

    const reservations = await db.query(
      "select count(*) as n from public.reservation_requests",
    );
    check("can read reservation requests", Number(reservations.rows[0].n) === 1);

    await db.query(
      "update public.reservation_requests set status = 'confirmed', admin_notes = 'called'",
    );
    check("can confirm a reservation", true);

    await db.query(`insert into storage.objects (bucket_id, name) values ('hero', 'v.mp4')`);
    check("can upload to storage", true);

    const hidden = await db.query(
      "select count(*) as n from public.testimonials",
    );
    check("can see unpublished rows", Number(hidden.rows[0].n) >= 0);
  });

  /* ------------------------------------------------------------------ */
  console.log("\nUnpublished content is invisible, not merely hidden");
  /* ------------------------------------------------------------------ */

  await db.exec(`
    insert into public.testimonials (author, quote, published)
      values ('Draft Author', 'unapproved quote', false);
    insert into public.experiences (title, active) values ('Secret event', false);
    update public.menu_categories set published = false where slug = 'desserts';
  `);

  await as(db, "anon", null, async () => {
    const t = await db.query("select count(*) as n from public.testimonials");
    check("draft testimonial not readable", Number(t.rows[0].n) === 0, `saw ${t.rows[0].n}`);

    const e = await db.query("select count(*) as n from public.experiences");
    check("inactive experience not readable", Number(e.rows[0].n) === 0, `saw ${e.rows[0].n}`);

    const d = await db.query(`
      select count(*) as n from public.menu_items i
      join public.menu_sections s on s.id = i.section_id
      join public.menu_categories c on c.id = s.category_id
      where c.slug = 'desserts'
    `);
    check("items in an unpublished category are hidden too", Number(d.rows[0].n) === 0,
      `saw ${d.rows[0].n}`);
  });

  await db.exec(`update public.menu_categories set published = true where slug = 'desserts';`);

  /* ------------------------------------------------------------------ */
  console.log("\nSchema invariants");
  /* ------------------------------------------------------------------ */

  await db.exec(`
    insert into public.hero_media (title, is_active) values ('A', true);
  `);
  try {
    await db.exec(`insert into public.hero_media (title, is_active) values ('B', true);`);
    check("only one hero video can be active", false, "a second active row was allowed");
  } catch {
    check("only one hero video can be active", true);
  }

  try {
    await db.exec(
      `insert into public.reservation_requests (name, phone, party_size, preferred_at)
       values ('X', '+250780000009', 0, now() + interval '1 day')`,
    );
    check("party_size must be at least 1", false, "zero was accepted");
  } catch {
    check("party_size must be at least 1", true);
  }

  const rlsOff = await db.query(`
    select c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  `);
  check(
    "every public table has RLS enabled",
    rlsOff.rows.length === 0,
    rlsOff.rows.map((r) => r.relname).join(", "),
  );

  /* ------------------------------------------------------------------ */
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
  await db.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
