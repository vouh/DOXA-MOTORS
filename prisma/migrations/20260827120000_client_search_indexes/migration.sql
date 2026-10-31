-- Speed up client live search (name / phone / ID) with trigram indexes.
-- Unique indexes already cover exact phone + idOrPassportNo; trgm helps
-- startsWith / contains / ILIKE paths used by findClientsByLookupQuery.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Name search (startsWith + contains, case-insensitive)
CREATE INDEX IF NOT EXISTS "car_clients_fullName_trgm_idx"
  ON "car_clients"
  USING gin ("fullName" gin_trgm_ops);

-- Soft phone match (endsWith / contains) when exact unique miss
CREATE INDEX IF NOT EXISTS "car_clients_phone_trgm_idx"
  ON "car_clients"
  USING gin ("phone" gin_trgm_ops);

-- ID prefix search when exact unique miss
CREATE INDEX IF NOT EXISTS "car_clients_idOrPassportNo_trgm_idx"
  ON "car_clients"
  USING gin ("idOrPassportNo" gin_trgm_ops);

-- Licence lookup (not unique, but searched/displayed)
CREATE INDEX IF NOT EXISTS "car_clients_licenceNo_idx"
  ON "car_clients" ("licenceNo");

-- Active clients by name (common list filter + sort)
CREATE INDEX IF NOT EXISTS "car_clients_status_fullName_idx"
  ON "car_clients" ("status", "fullName");
