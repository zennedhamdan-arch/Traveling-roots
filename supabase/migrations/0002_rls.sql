-- =============================================================================
-- Traveling Roots — Row Level Security
-- =============================================================================
-- The authorization model, in one sentence:
--
--   The public may READ published content and CREATE a reservation request.
--   Only accounts listed in admin_users may change anything.
--
-- This is deliberately stricter than the Bar Mubiti schema this was adapted
-- from, where any authenticated user could write. With Supabase Auth, sign-up
-- can be a public endpoint — so "authenticated" is not an authorization
-- statement, it just means someone has an account. Membership of admin_users
-- is the actual permission.
--
-- Two mechanisms are used together, because RLS alone is not enough:
--
--   * RLS policies decide WHICH ROWS a request may touch.
--   * Column GRANTs decide WHICH COLUMNS. RLS cannot express "you may insert a
--     reservation but you may not set its status", so that is a grant.
-- =============================================================================

-- Supabase grants broad privileges to anon/authenticated by default. Start
-- from nothing and hand back only what each role genuinely needs.
revoke all on all tables in schema public from anon, authenticated;

alter table public.admin_users          enable row level security;
alter table public.site_settings        enable row level security;
alter table public.business_info        enable row level security;
alter table public.hero_media           enable row level security;
alter table public.menu_categories      enable row level security;
alter table public.menu_sections        enable row level security;
alter table public.menu_items           enable row level security;
alter table public.experiences          enable row level security;
alter table public.gallery_items        enable row level security;
alter table public.offers               enable row level security;
alter table public.testimonials         enable row level security;
alter table public.social_links         enable row level security;
alter table public.reservation_requests enable row level security;

-- -----------------------------------------------------------------------------
-- admin_users
-- -----------------------------------------------------------------------------
-- Readable only by admins, and only ever writable through the Supabase
-- dashboard or a service-role key. There is deliberately no INSERT policy:
-- an admin must not be able to promote a new admin through the public API,
-- because that turns one compromised session into permanent access.

drop policy if exists admin_users_select on public.admin_users;
create policy admin_users_select on public.admin_users
  for select to authenticated
  using (public.is_admin());

grant select on public.admin_users to authenticated;

-- -----------------------------------------------------------------------------
-- Published content: public reads, admin writes
-- -----------------------------------------------------------------------------

-- site_settings / business_info are always world-readable: they are the
-- restaurant's phone number and address, which the footer needs on every page.
drop policy if exists site_settings_read on public.site_settings;
create policy site_settings_read on public.site_settings
  for select to anon, authenticated using (true);

drop policy if exists site_settings_write on public.site_settings;
create policy site_settings_write on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists business_info_read on public.business_info;
create policy business_info_read on public.business_info
  for select to anon, authenticated using (true);

drop policy if exists business_info_write on public.business_info;
create policy business_info_write on public.business_info
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.site_settings, public.business_info to anon, authenticated;
grant insert, update, delete on public.site_settings, public.business_info to authenticated;

-- hero_media: the public only ever needs the active row.
drop policy if exists hero_media_read on public.hero_media;
create policy hero_media_read on public.hero_media
  for select to anon, authenticated using (is_active);

drop policy if exists hero_media_admin_read on public.hero_media;
create policy hero_media_admin_read on public.hero_media
  for select to authenticated using (public.is_admin());

drop policy if exists hero_media_write on public.hero_media;
create policy hero_media_write on public.hero_media
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.hero_media to anon, authenticated;
grant insert, update, delete on public.hero_media to authenticated;

-- Menu. A hidden category hides its sections and items too, which is why the
-- section and item policies walk back up to the category.
drop policy if exists menu_categories_read on public.menu_categories;
create policy menu_categories_read on public.menu_categories
  for select to anon, authenticated using (published);

drop policy if exists menu_categories_admin_read on public.menu_categories;
create policy menu_categories_admin_read on public.menu_categories
  for select to authenticated using (public.is_admin());

drop policy if exists menu_categories_write on public.menu_categories;
create policy menu_categories_write on public.menu_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists menu_sections_read on public.menu_sections;
create policy menu_sections_read on public.menu_sections
  for select to anon, authenticated
  using (exists (
    select 1 from public.menu_categories c
    where c.id = category_id and c.published
  ));

drop policy if exists menu_sections_admin_read on public.menu_sections;
create policy menu_sections_admin_read on public.menu_sections
  for select to authenticated using (public.is_admin());

drop policy if exists menu_sections_write on public.menu_sections;
create policy menu_sections_write on public.menu_sections
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists menu_items_read on public.menu_items;
create policy menu_items_read on public.menu_items
  for select to anon, authenticated
  using (exists (
    select 1
    from public.menu_sections s
    join public.menu_categories c on c.id = s.category_id
    where s.id = section_id and c.published
  ));

drop policy if exists menu_items_admin_read on public.menu_items;
create policy menu_items_admin_read on public.menu_items
  for select to authenticated using (public.is_admin());

drop policy if exists menu_items_write on public.menu_items;
create policy menu_items_write on public.menu_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.menu_categories, public.menu_sections, public.menu_items
  to anon, authenticated;
grant insert, update, delete on public.menu_categories, public.menu_sections, public.menu_items
  to authenticated;

-- Experiences / gallery / offers / testimonials.
-- NOTE: "unpublished" here means genuinely invisible to the public, not merely
-- hidden by the UI. Filtering in the client would leave the rows fetchable.
drop policy if exists experiences_read on public.experiences;
create policy experiences_read on public.experiences
  for select to anon, authenticated using (active);

drop policy if exists experiences_admin_read on public.experiences;
create policy experiences_admin_read on public.experiences
  for select to authenticated using (public.is_admin());

drop policy if exists experiences_write on public.experiences;
create policy experiences_write on public.experiences
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists gallery_items_read on public.gallery_items;
create policy gallery_items_read on public.gallery_items
  for select to anon, authenticated using (published);

drop policy if exists gallery_items_admin_read on public.gallery_items;
create policy gallery_items_admin_read on public.gallery_items
  for select to authenticated using (public.is_admin());

drop policy if exists gallery_items_write on public.gallery_items;
create policy gallery_items_write on public.gallery_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists offers_read on public.offers;
create policy offers_read on public.offers
  for select to anon, authenticated
  using (
    active
    and (starts_at is null or starts_at <= current_date)
    and (ends_at is null or ends_at >= current_date)
  );

drop policy if exists offers_admin_read on public.offers;
create policy offers_admin_read on public.offers
  for select to authenticated using (public.is_admin());

drop policy if exists offers_write on public.offers;
create policy offers_write on public.offers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists testimonials_read on public.testimonials;
create policy testimonials_read on public.testimonials
  for select to anon, authenticated using (published);

drop policy if exists testimonials_admin_read on public.testimonials;
create policy testimonials_admin_read on public.testimonials
  for select to authenticated using (public.is_admin());

drop policy if exists testimonials_write on public.testimonials;
create policy testimonials_write on public.testimonials
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists social_links_read on public.social_links;
create policy social_links_read on public.social_links
  for select to anon, authenticated using (active);

drop policy if exists social_links_admin_read on public.social_links;
create policy social_links_admin_read on public.social_links
  for select to authenticated using (public.is_admin());

drop policy if exists social_links_write on public.social_links;
create policy social_links_write on public.social_links
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on
  public.experiences, public.gallery_items, public.offers,
  public.testimonials, public.social_links
  to anon, authenticated;
grant insert, update, delete on
  public.experiences, public.gallery_items, public.offers,
  public.testimonials, public.social_links
  to authenticated;

-- -----------------------------------------------------------------------------
-- reservation_requests — write-only for the public
-- -----------------------------------------------------------------------------
-- Anyone may submit one. NOBODY unauthenticated may read them back: they hold
-- names, phone numbers and email addresses. There is no public SELECT policy,
-- and no SELECT grant, so a leaked anon key still cannot enumerate customers.

drop policy if exists reservations_insert on public.reservation_requests;
create policy reservations_insert on public.reservation_requests
  for insert to anon, authenticated
  with check (
    -- Refuse dates in the past, so the queue cannot be filled with noise.
    preferred_at > now() - interval '1 hour'
    and preferred_at < now() + interval '1 year'
  );

drop policy if exists reservations_admin_read on public.reservation_requests;
create policy reservations_admin_read on public.reservation_requests
  for select to authenticated using (public.is_admin());

drop policy if exists reservations_admin_write on public.reservation_requests;
create policy reservations_admin_write on public.reservation_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Column-level grants. RLS cannot say "you may insert a row but not choose its
-- status", so the grant does. Without this, a visitor could POST
-- status = 'confirmed' and appear in the dashboard as an accepted booking.
grant insert (name, phone, email, party_size, preferred_at, notes)
  on public.reservation_requests to anon, authenticated;
grant select, update, delete on public.reservation_requests to authenticated;

-- -----------------------------------------------------------------------------
-- Sequences / functions
-- -----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant execute on function public.is_admin() to authenticated;
