-- =============================================================================
-- Gallery curation: a featured subset for the homepage loop, and categories.
--
-- The homepage gallery is a showcase, not the whole archive: it renders the
-- first ~8 rows that are published AND featured, in sort_order. The /gallery
-- page keeps showing every published photo. `featured` is curation, not
-- security — the public/private line remains `published`, enforced by the
-- existing gallery_items_read RLS policy, which needs no change: new columns
-- inherit the table's policies, and writes were already admin-only.
-- =============================================================================

alter table public.gallery_items
  add column if not exists featured boolean not null default false,
  add column if not exists category text
    constraint gallery_items_category_check
    check (
      category is null
      or category in ('Food', 'Restaurant', 'Garden', 'Events', 'Atmosphere')
    );

-- Serves the homepage showcase query: published, featured, ordered.
create index if not exists gallery_items_homepage_idx
  on public.gallery_items (published, featured, sort_order);
