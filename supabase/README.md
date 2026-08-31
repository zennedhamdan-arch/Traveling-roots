# Supabase setup

Four steps. About ten minutes.

## 1. Create the project

[database.new](https://database.new) → new project → pick the region closest to
Rwanda (`eu-central-1` is currently the nearest low-latency option). Save the
database password somewhere safe.

## 2. Run the SQL

Supabase dashboard → **SQL Editor** → paste and run each file **in order**:

| Order | File | What it does |
| --- | --- | --- |
| 1 | `migrations/0001_schema.sql` | Tables, constraints, triggers |
| 2 | `migrations/0002_rls.sql` | Row Level Security and grants |
| 3 | `migrations/0003_storage.sql` | Storage buckets and their policies |
| 4 | `seed.sql` | The real menu, business info and social links |

`seed.sql` is idempotent — running it twice does not duplicate anything.

## 3. Create the owner account

**Authentication → Users → Add user.** Use a real email and a strong password,
and tick *Auto Confirm User*.

Then allow-list that account. This is the step that actually grants access —
creating the auth user alone does nothing:

```sql
insert into public.admin_users (id, email, role)
select id, email, 'owner' from auth.users where email = 'owner@example.com';
```

> **Turn off public sign-ups.** Authentication → Providers → Email → disable
> *Enable sign ups*. The allow-list already blocks a stranger from changing
> anything, but there is no reason to let them create accounts at all.

## 4. Point the site at it

Copy `.env.example` to `.env.local` and fill in the two values from
**Settings → API**. On Vercel, add the same two variables to the project and
redeploy.

---

## Verifying the security model

```bash
npm run db:test
```

This boots a real Postgres in-process, applies these exact migration files,
seeds them, then connects as an anonymous visitor, a signed-up non-admin, and
an allow-listed admin, and asserts what each can and cannot do — 39 checks,
including that a visitor cannot read the reservation list, cannot self-approve
a booking, and cannot see unpublished content.

Run it after any change to the SQL.

## The authorization model in one paragraph

Supabase Auth answers *who are you*. It does not answer *may you edit the
site* — with sign-ups enabled, "authenticated" describes any stranger with an
email address. So authorization is a row in `admin_users`, checked by an
`is_admin()` function that every write policy calls. The public may read
published content and create a reservation request; that is all. Column-level
grants add what RLS cannot express: a visitor may insert a reservation but may
not choose its `status` or write `admin_notes`.

There is no service-role key anywhere in the application. The dashboard runs
under the signed-in admin's own session and is subject to exactly the same
policies, so there is one authorization path rather than two.
