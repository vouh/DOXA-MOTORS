-- Car-hire app uses Prisma + service role for most writes.
-- Keep RLS enabled on auth.users; application tables are accessed via Prisma (service role bypasses RLS).
-- Storage policies: see storage.sql

-- Example: deny anon direct table access if exposing PostgREST later
-- (Prisma service role is unaffected)

-- No legacy SACCO policies.
