-- Unique email on car clients (NULLs allowed / multiple without email).
-- Deduplicate any existing non-null emails before adding the constraint.
UPDATE "car_clients" AS c
SET "email" = NULL
WHERE c."email" IS NOT NULL
  AND c."id" NOT IN (
    SELECT DISTINCT ON (LOWER(TRIM(e."email"))) e."id"
    FROM "car_clients" e
    WHERE e."email" IS NOT NULL AND TRIM(e."email") <> ''
    ORDER BY LOWER(TRIM(e."email")), e."createdAt" ASC
  );

CREATE UNIQUE INDEX IF NOT EXISTS "car_clients_email_key" ON "car_clients"("email");
