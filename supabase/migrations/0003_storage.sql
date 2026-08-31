-- =============================================================================
-- Traveling Roots — Storage buckets
-- =============================================================================
-- Media lives in Storage, not in the database. Postgres is a poor blob store:
-- a 40 MB hero video inside a row bloats every backup, and cannot be streamed
-- with HTTP range requests, which is exactly what a <video> element needs to
-- start playing before the file has finished downloading.
--
-- Three public-read buckets, admin-only write.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'hero',
    'hero',
    true,
    209715200, -- 200 MB. Resumable uploads are used above ~6 MB (see lib/upload.ts).
    array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'menu',
    'menu',
    true,
    10485760,  -- 10 MB
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'gallery',
    'gallery',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  )
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Policies on storage.objects
-- -----------------------------------------------------------------------------
-- Buckets marked `public` are readable over the CDN URL without a policy, but
-- the SELECT policy is still needed for the JS client to list/inspect objects.

drop policy if exists "Public read of site media" on storage.objects;
create policy "Public read of site media" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('hero', 'menu', 'gallery'));

drop policy if exists "Admins upload site media" on storage.objects;
create policy "Admins upload site media" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('hero', 'menu', 'gallery') and public.is_admin());

drop policy if exists "Admins replace site media" on storage.objects;
create policy "Admins replace site media" on storage.objects
  for update to authenticated
  using (bucket_id in ('hero', 'menu', 'gallery') and public.is_admin())
  with check (bucket_id in ('hero', 'menu', 'gallery') and public.is_admin());

drop policy if exists "Admins delete site media" on storage.objects;
create policy "Admins delete site media" on storage.objects
  for delete to authenticated
  using (bucket_id in ('hero', 'menu', 'gallery') and public.is_admin());
