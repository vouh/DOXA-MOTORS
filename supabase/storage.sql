-- Private storage for car-hire PII documents (run in Supabase SQL editor)
-- Bucket: car-hire-docs — max 5 MB; PDF / Office / CSV / JPEG / PNG only.
-- Uploads & downloads go through the app (service role). These policies lock
-- down direct anon/authenticated Storage API access and show up in the dashboard.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'car-hire-docs',
  'car-hire-docs',
  false,
  5242880, -- 5 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/csv',
    'image/jpeg',
    'image/png',
    'application/octet-stream'
  ]::text[]
),
(
  'vehicles',
  'vehicles',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/octet-stream']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── car-hire-docs: deny all direct client access (service role bypasses RLS) ──
drop policy if exists "car_hire_docs_no_public_read" on storage.objects;
drop policy if exists "car_hire_docs_no_public_select" on storage.objects;
drop policy if exists "car_hire_docs_select" on storage.objects;
drop policy if exists "car_hire_docs_insert" on storage.objects;
drop policy if exists "car_hire_docs_update" on storage.objects;
drop policy if exists "car_hire_docs_delete" on storage.objects;

create policy "car_hire_docs_select"
  on storage.objects for select
  using (bucket_id = 'car-hire-docs' and false);

create policy "car_hire_docs_insert"
  on storage.objects for insert
  with check (bucket_id = 'car-hire-docs' and false);

create policy "car_hire_docs_update"
  on storage.objects for update
  using (bucket_id = 'car-hire-docs' and false)
  with check (bucket_id = 'car-hire-docs' and false);

create policy "car_hire_docs_delete"
  on storage.objects for delete
  using (bucket_id = 'car-hire-docs' and false);

-- ── vehicles: authenticated read; no public write ──
drop policy if exists "vehicles_no_public_read" on storage.objects;
drop policy if exists "vehicles_authenticated_read" on storage.objects;
drop policy if exists "vehicles_select" on storage.objects;
drop policy if exists "vehicles_insert" on storage.objects;
drop policy if exists "vehicles_update" on storage.objects;
drop policy if exists "vehicles_delete" on storage.objects;

create policy "vehicles_select"
  on storage.objects for select
  using (bucket_id = 'vehicles' and auth.role() = 'authenticated');

create policy "vehicles_insert"
  on storage.objects for insert
  with check (bucket_id = 'vehicles' and false);

create policy "vehicles_update"
  on storage.objects for update
  using (bucket_id = 'vehicles' and false)
  with check (bucket_id = 'vehicles' and false);

create policy "vehicles_delete"
  on storage.objects for delete
  using (bucket_id = 'vehicles' and false);
