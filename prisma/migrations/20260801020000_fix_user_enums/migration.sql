-- Repair: ensure users.status / users.staffRole match Prisma enums.
-- Safe to run if Stage 1 already applied correctly (no-ops via guards).
-- Fixes environments where MemberStatus was dropped before status was converted,
-- or where staffRole was left as TEXT.

DO $$ BEGIN
  CREATE TYPE "StaffRole" AS ENUM ('DIRECTOR', 'CLERK', 'YARD', 'ACCOUNTANT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "staffRole" TEXT;

UPDATE "users" SET "staffRole" = 'CLERK'
WHERE "staffRole" IS NULL
   OR "staffRole" NOT IN ('DIRECTOR', 'CLERK', 'YARD', 'ACCOUNTANT');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'staffRole'
      AND udt_name = 'text'
  ) THEN
    ALTER TABLE "users" ALTER COLUMN "staffRole" DROP DEFAULT;
    ALTER TABLE "users"
      ALTER COLUMN "staffRole" TYPE "StaffRole"
      USING ("staffRole"::text::"StaffRole");
  END IF;
END $$;

ALTER TABLE "users" ALTER COLUMN "staffRole" SET DEFAULT 'CLERK'::"StaffRole";
UPDATE "users" SET "staffRole" = 'CLERK'::"StaffRole" WHERE "staffRole" IS NULL;
ALTER TABLE "users" ALTER COLUMN "staffRole" SET NOT NULL;

-- Recreate status column if the old MemberStatus type was CASCADE-dropped
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'status'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE'::"UserStatus";
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'status'
      AND udt_name <> 'UserStatus'
  ) THEN
    ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "users"
      ALTER COLUMN "status" TYPE "UserStatus"
      USING (
        CASE "status"::text
          WHEN 'ACTIVE' THEN 'ACTIVE'::"UserStatus"
          WHEN 'INACTIVE' THEN 'INACTIVE'::"UserStatus"
          WHEN 'SUSPENDED' THEN 'SUSPENDED'::"UserStatus"
          WHEN 'PENDING' THEN 'INACTIVE'::"UserStatus"
          ELSE 'INACTIVE'::"UserStatus"
        END
      );
    ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"UserStatus";
    ALTER TABLE "users" ALTER COLUMN "status" SET NOT NULL;
  END IF;
END $$;

-- Clean leftover enums if unused
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MemberStatus')
     AND NOT EXISTS (
       SELECT 1 FROM pg_attribute a
       JOIN pg_type t ON a.atttypid = t.oid
       WHERE t.typname = 'MemberStatus' AND a.attnum > 0 AND NOT a.attisdropped
     ) THEN
    DROP TYPE "MemberStatus";
  END IF;
END $$;
