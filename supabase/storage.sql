-- Private storage for car-hire PII documents (run in Supabase SQL editor)

insert into storage.buckets (id, name, public)
values
  ('car-hire-docs', 'car-hire-docs', false),
  ('vehicles', 'vehicles', false)
on conflict (id) do update set public = excluded.public;

-- Authenticated staff may read via signed URLs created server-side with service role.
-- Direct client uploads should go through server actions that use the service role.

drop policy if exists "car_hire_docs_no_public_read" on storage.objects;
create policy "car_hire_docs_no_public_select"
  on storage.objects for select
  using (bucket_id = 'car-hire-docs' and false);

drop policy if exists "vehicles_no_public_read" on storage.objects;
create policy "vehicles_authenticated_read"
  on storage.objects for select
  using (bucket_id = 'vehicles' and auth.role() = 'authenticated');
