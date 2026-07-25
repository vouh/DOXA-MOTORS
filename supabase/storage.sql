-- Storage buckets + policies for Alubonets
-- Run in Supabase SQL Editor after policies.sql
--
-- Supabase may warn about "destructive operations" because of DROP POLICY IF EXISTS.
-- That only replaces storage access rules — it does not delete files already in buckets.
-- Confirm Run if you intend to apply these policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'gallery',
    'gallery',
    true,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    -- event cover images are stored under the event-covers/ prefix in this bucket
  ),
  (
    'documents',
    'documents',
    false,
    5242880,
    array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ]
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Gallery: public read; staff / active members can upload
drop policy if exists gallery_storage_public_read on storage.objects;
create policy gallery_storage_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'gallery');

drop policy if exists gallery_storage_upload on storage.objects;
create policy gallery_storage_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'gallery'
    and (
      public.is_admin()
      or public.current_app_role() = 'ORGANIZER'
      or public.is_active_member()
    )
  );

drop policy if exists gallery_storage_update on storage.objects;
create policy gallery_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'gallery' and (public.is_admin() or public.current_app_role() = 'ORGANIZER'))
  with check (bucket_id = 'gallery' and (public.is_admin() or public.current_app_role() = 'ORGANIZER'));

drop policy if exists gallery_storage_delete on storage.objects;
create policy gallery_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'gallery' and (public.is_admin() or public.current_app_role() = 'ORGANIZER'));

-- Documents: authenticated members read; secretary/admin write (use signed URLs for private access)
drop policy if exists documents_storage_read on storage.objects;
create policy documents_storage_read on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and public.is_active_member());

drop policy if exists documents_storage_upload on storage.objects;
create policy documents_storage_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (public.is_admin() or public.current_app_role() = 'SECRETARY')
  );

drop policy if exists documents_storage_update on storage.objects;
create policy documents_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'documents' and (public.is_admin() or public.current_app_role() = 'SECRETARY'))
  with check (bucket_id = 'documents' and (public.is_admin() or public.current_app_role() = 'SECRETARY'));

drop policy if exists documents_storage_delete on storage.objects;
create policy documents_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and public.is_admin());
