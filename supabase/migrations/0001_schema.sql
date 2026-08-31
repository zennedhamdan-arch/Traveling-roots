-- =============================================================================
-- Traveling Roots — schema
-- =============================================================================
-- Run order: 0001_schema.sql → 0002_rls.sql → 0003_storage.sql → seed.sql
--
-- Design notes
--
-- * Every table has RLS enabled in 0002. Nothing here grants access.
-- * Singleton tables (site_settings, business_info) are constrained to exactly
--   one row, so the admin UI can always `update ... where id = 1` instead of
--   guessing which row is current.
-- * The menu keeps three levels — category → section → item — because the real
--   Traveling Roots menu has them: "Drinks" alone contains nine titled
--   sections (Tea, Coffee, Mocktails, Cocktails, Ciders, Beers, Hard Tac,
--   Wine, Soft Drinks). Flattening to the two levels in the original sketch
--   would have silently destroyed that structure.
-- * Prices are integers in Rwandan francs. RWF has no minor unit, so there are
--   no cents to lose and no float rounding to worry about.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_users — the authorization gate
-- -----------------------------------------------------------------------------
-- Being authenticated is NOT enough to change anything. A row must exist here.
-- This is the deliberate difference from the Bar Mubiti model, where any
-- authenticated user could write: there, a single public sign-up would hand a
-- stranger the whole site.

create table if not exists public.admin_users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'editor' check (role in ('owner', 'editor')),
  created_at  timestamptz not null default now()
);

comment on table public.admin_users is
  'Allow-list of accounts permitted to modify site content. Authentication alone grants nothing.';

-- SECURITY DEFINER so it can read admin_users without tripping the policies on
-- admin_users itself — a policy that queried the table it protects would
-- recurse infinitely. search_path is pinned so the function cannot be hijacked
-- by a caller-controlled schema.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_users where id = auth.uid()
  );
$$;

comment on function public.is_admin() is
  'True when the current request is authenticated AS an allow-listed admin.';

-- -----------------------------------------------------------------------------
-- Singletons
-- -----------------------------------------------------------------------------

create table if not exists public.site_settings (
  id                    smallint primary key default 1 check (id = 1),
  site_title            text not null default 'Traveling Roots | Restaurant in Musanze, Rwanda',
  meta_description      text not null default '',
  canonical_url         text,
  -- Turning this off hides the hero video and falls back to the still hero.
  hero_video_enabled    boolean not null default true,
  maintenance_mode      boolean not null default false,
  updated_at            timestamptz not null default now()
);

create table if not exists public.business_info (
  id             smallint primary key default 1 check (id = 1),
  name           text not null default 'Traveling Roots',
  legal_name     text,
  tagline        text,
  street         text,
  city           text,
  country        text,
  plus_code      text,
  phone          text,
  whatsapp       text,
  email          text,
  directions_url text,
  website        text,
  -- [{ "day": "Monday", "opens": "12:00", "closes": "22:00" }, ...]
  opening_hours  jsonb not null default '[]'::jsonb,
  updated_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- hero_media
-- -----------------------------------------------------------------------------
-- Rows are kept rather than overwritten so the owner can swap back to a
-- previous video without re-uploading. `is_active` picks the live one; the
-- partial unique index below makes "two active videos" unrepresentable.

create table if not exists public.hero_media (
  id            uuid primary key default gen_random_uuid(),
  title         text,
  subtitle      text,
  video_url     text,
  poster_url    text,
  -- Storage object paths, kept so deleting a row can also delete the file.
  video_path    text,
  poster_path   text,
  is_active     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists hero_media_single_active
  on public.hero_media (is_active)
  where is_active;

-- -----------------------------------------------------------------------------
-- Menu
-- -----------------------------------------------------------------------------

create table if not exists public.menu_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  intro       text,
  sort_order  integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.menu_sections (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.menu_categories (id) on delete cascade,
  -- NULL title = the category's default, unlabelled section.
  title        text,
  note         text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists menu_sections_category_idx
  on public.menu_sections (category_id, sort_order);

create table if not exists public.menu_items (
  id                uuid primary key default gen_random_uuid(),
  section_id        uuid not null references public.menu_sections (id) on delete cascade,
  name              text not null,
  description       text,
  -- NULL when the item is priced only through `variants` (e.g. half / full rack).
  price             integer check (price is null or price >= 0),
  image_url         text,
  image_path        text,
  -- ["Vegan", "Gluten-free"]
  dietary           text[] not null default '{}',
  -- [{ "label": "Half rack", "price": 12000 }, ...]
  variants          jsonb not null default '[]'::jsonb,
  availability_note text,
  available         boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists menu_items_section_idx
  on public.menu_items (section_id, sort_order);

-- -----------------------------------------------------------------------------
-- Experiences / Gallery / Offers / Testimonials
-- -----------------------------------------------------------------------------

create table if not exists public.experiences (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  image_url   text,
  image_path  text,
  price       integer check (price is null or price >= 0),
  duration    text,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.gallery_items (
  id          uuid primary key default gen_random_uuid(),
  image_url   text not null,
  image_path  text,
  caption     text,
  alt_text    text not null default '',
  published   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.offers (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  image_url   text,
  image_path  text,
  starts_at   date,
  ends_at     date,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint offers_date_order check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table if not exists public.testimonials (
  id          uuid primary key default gen_random_uuid(),
  author      text not null,
  quote       text not null,
  source      text,
  rating      smallint check (rating is null or rating between 1 and 5),
  published   boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- social_links
-- -----------------------------------------------------------------------------

create table if not exists public.social_links (
  id          uuid primary key default gen_random_uuid(),
  platform    text not null,
  label       text not null,
  url         text not null,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- reservation_requests
-- -----------------------------------------------------------------------------
-- A REQUEST, not a booking. The restaurant confirms out of band, by phone or
-- WhatsApp. Nothing here implies a table is held — the site must never claim
-- to have made a reservation it cannot honour.

create table if not exists public.reservation_requests (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(btrim(name)) between 1 and 120),
  phone        text not null check (length(btrim(phone)) between 3 and 40),
  email        text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  party_size   smallint not null check (party_size between 1 and 60),
  preferred_at timestamptz not null,
  notes        text check (notes is null or length(notes) <= 1000),
  status       text not null default 'new'
                 check (status in ('new', 'contacted', 'confirmed', 'declined', 'archived')),
  -- Staff-only field; never exposed to the public API.
  admin_notes  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists reservation_requests_status_idx
  on public.reservation_requests (status, preferred_at desc);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'site_settings', 'business_info', 'hero_media',
    'menu_categories', 'menu_sections', 'menu_items',
    'experiences', 'gallery_items', 'offers', 'testimonials',
    'social_links', 'reservation_requests'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t, t);
  end loop;
end;
$$;
