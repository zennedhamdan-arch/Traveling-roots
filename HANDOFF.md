# Session handoff

The coding session that produced the Supabase work was closed before its final
commit could be pushed. This note exists so the next session can orient in
about ten seconds.

## State

| Where | What it has |
| --- | --- |
| **GitHub** (`arena/01a056f8-traveling-roots`) | Everything up to `ff860b2` — real frame sequence, logo, full menu, Vercel prep |
| **Local commit `2f49142`** | All of the above **plus** the Supabase backend, admin dashboard and hero video |

`2f49142` is a complete snapshot of all 145 files, not a partial diff.

## What still needs pushing

Only the Supabase layer:

```
supabase/migrations/0001_schema.sql
supabase/migrations/0002_rls.sql
supabase/migrations/0003_storage.sql
supabase/seed.sql                    (generated — npm run seed:generate)
supabase/README.md
scripts/generate-seed.mjs
scripts/test-db.mjs
lib/supabase/{env,server,client,public,types}.ts
lib/content.ts
lib/upload.ts
middleware.ts
components/HeroVideo.tsx + .module.css
app/admin/**
.env.example
```

Modified: `app/page.tsx`, `components/Menu.tsx`, `package.json`, `README.md`,
`.gitignore`.

## Verify before pushing

```bash
npm run db:test     # 39 checks — RLS against a real Postgres
npm run typecheck
npm run lint
npm run build
```

`npm run db:test` is the important one: it applies the real migration files to
an in-process Postgres and asserts that an anonymous visitor cannot read the
reservation list, cannot self-approve a booking, and cannot see unpublished
content, and that a signed-up non-admin can change nothing.

## Nothing here is blocked on me

The site runs with no Supabase configured — it falls back to the committed
content in `data/`. Setup instructions for the database are in
`supabase/README.md`.
