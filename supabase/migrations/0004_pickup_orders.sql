-- =============================================================================
-- 0004 — Pickup orders
--
-- A public order form: a guest picks items from the published menu, leaves a
-- name and phone number, and the kitchen sees the order in the dashboard.
--
-- The design follows reservation_requests, with one addition the reservations
-- never needed: MONEY. A reservation is just a request, but an order carries a
-- total, and a total the client computed is a total the client invented.
-- So the pricing rule is absolute:
--
--   The database computes the total. The client's numbers are never read.
--
-- A BEFORE INSERT trigger resolves every line against the LIVE published menu
-- (as the caller, so RLS applies — an item the guest cannot see cannot be
-- ordered), snapshots the price into the order, and sums the snapshot. The
-- stored order is therefore also a historical record: later menu edits do not
-- rewrite old orders.
--
-- As with reservations, nobody unauthenticated may read orders back — they
-- carry names and phone numbers. And "may insert" is column-scoped: a guest
-- cannot choose a status or write staff notes.
-- =============================================================================

create table if not exists public.pickup_orders (
  id            uuid primary key default gen_random_uuid(),
  customer_name text not null check (length(btrim(customer_name)) between 1 and 120),
  phone         text not null check (length(btrim(phone)) between 3 and 40),
  -- What the guest typed — allergies, "less spicy", landmarks for delivery.
  note          text check (note is null or length(note) <= 1000),
  -- NULL means "as soon as possible".
  pickup_at     timestamptz,
  -- Order lines. On INSERT the guest sends only menu_item_id / quantity /
  -- variant_label; the trigger rewrites this array, resolving each line
  -- against the live menu and snapshotting name + unit_price.
  items         jsonb not null default '[]',
  -- Computed by the trigger. Has a default so clients never need to send it;
  -- they cannot (the column grant does not include it).
  total         integer not null default 0 check (total >= 0),
  status        text not null default 'new'
                  check (status in ('new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled')),
  -- Staff-only field; never exposed to the public API.
  admin_notes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pickup_orders_status_idx
  on public.pickup_orders (status, created_at desc);

-- -----------------------------------------------------------------------------
-- Pricing / validation trigger
-- -----------------------------------------------------------------------------

create or replace function public.pickup_orders_resolve()
returns trigger
language plpgsql
as $$
declare
  line        jsonb;
  item        record;
  unit_price  integer;
  qty         integer;
  n           integer;
  resolved    jsonb := '[]'::jsonb;
  total       integer := 0;
begin
  if jsonb_typeof(new.items) <> 'array' then
    raise exception 'pickup order items must be an array';
  end if;

  n := jsonb_array_length(new.items);
  if n < 1 or n > 40 then
    raise exception 'a pickup order needs between 1 and 40 lines';
  end if;

  for line in select * from jsonb_array_elements(new.items)
  loop
    if line->>'menu_item_id' is null then
      raise exception 'every order line needs a menu_item_id';
    end if;

    qty := nullif(line->>'quantity', '')::int;
    if qty is null or qty < 1 or qty > 20 then
      raise exception 'quantity must be between 1 and 20';
    end if;

    -- Runs as the CALLER, not SECURITY DEFINER, so the menu_items read policy
    -- applies: an item in an unpublished category, or one marked unavailable,
    -- is simply "not found" and the whole order is refused.
    select mi.id, mi.name, mi.price, mi.variants
      into item
      from public.menu_items mi
      where mi.id = (line->>'menu_item_id')::uuid
        and mi.available;

    if not found then
      raise exception 'that menu item cannot be ordered right now';
    end if;

    if line->>'variant_label' is not null then
      select (v->>'price')::int
        into unit_price
        from jsonb_array_elements(coalesce(item.variants, '[]'::jsonb)) v
        where v->>'label' = line->>'variant_label';

      if unit_price is null then
        raise exception 'variant "%" is not offered for "%"', line->>'variant_label', item.name;
      end if;
    else
      unit_price := item.price;
    end if;

    if unit_price is null or unit_price <= 0 then
      raise exception '"%" has no online price — order it by phone', item.name;
    end if;

    total := total + (unit_price * qty);

    resolved := resolved || jsonb_build_object(
      'menu_item_id', item.id,
      'name',        item.name,
      'variant_label', line->>'variant_label',
      'unit_price',  unit_price,
      'quantity',    qty
    );
  end loop;

  new.items := resolved;
  new.total := total;
  return new;
end;
$$;

comment on function public.pickup_orders_resolve() is
  'Recomputes a pickup order from the live published menu. Client-sent prices and totals are never read.';

drop trigger if exists pickup_orders_resolve on public.pickup_orders;
create trigger pickup_orders_resolve
  before insert on public.pickup_orders
  for each row execute function public.pickup_orders_resolve();

-- updated_at, using the same function the other tables use.
drop trigger if exists set_updated_at on public.pickup_orders;
create trigger set_updated_at before update on public.pickup_orders
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.pickup_orders enable row level security;

-- Anyone may submit one. NULL pickup_at means "as soon as possible"; a set
-- time must be roughly now-to-two-weeks, so the queue cannot be filled with
-- noise from the past or the far future.
drop policy if exists pickup_orders_insert on public.pickup_orders;
create policy pickup_orders_insert on public.pickup_orders
  for insert to anon, authenticated
  with check (
    pickup_at is null
    or (
      pickup_at > now() - interval '30 minutes'
      and pickup_at < now() + interval '14 days'
    )
  );

drop policy if exists pickup_orders_admin_read on public.pickup_orders;
create policy pickup_orders_admin_read on public.pickup_orders
  for select to authenticated using (public.is_admin());

drop policy if exists pickup_orders_admin_write on public.pickup_orders;
create policy pickup_orders_admin_write on public.pickup_orders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Column grants: the public may create an order, but may not choose its
-- status, its total or its staff notes. total has a default and is written
-- only by the trigger, which is why it is not granted here.
--
-- The revoke first is not ceremony. Supabase's default privileges grant
-- ALL on every NEW table to anon and authenticated — the safety net only
-- exists for tables 0002 already knew about. Without this line, this table
-- would ship with the status and admin_notes columns writable by the public.
-- (This is exactly the gap `npm run db:test` was built to catch, and did.)
revoke all on public.pickup_orders from anon, authenticated;

grant insert (customer_name, phone, note, pickup_at, items)
  on public.pickup_orders to anon, authenticated;
grant select, update, delete on public.pickup_orders to authenticated;
