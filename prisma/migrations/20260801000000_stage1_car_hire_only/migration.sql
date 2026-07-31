-- Stage 1: car-hire only schema conversion
-- WARNING: drops legacy SACCO tables. Backup before applying to production.

-- Legacy tables
DROP TABLE IF EXISTS "announcement_receipts" CASCADE;
DROP TABLE IF EXISTS "announcements" CASCADE;
DROP TABLE IF EXISTS "contributions" CASCADE;
DROP TABLE IF EXISTS "welfare_requests" CASCADE;
DROP TABLE IF EXISTS "gallery_photos" CASCADE;
DROP TABLE IF EXISTS "meetings" CASCADE;
DROP TABLE IF EXISTS "documents" CASCADE;
DROP TABLE IF EXISTS "events" CASCADE;
DROP TABLE IF EXISTS "projects" CASCADE;
DROP TABLE IF EXISTS "email_logs" CASCADE;

-- New models
CREATE TABLE IF NOT EXISTS "attachments" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "attachments_entityType_entityId_idx" ON "attachments"("entityType", "entityId");

CREATE TABLE IF NOT EXISTS "broadcasts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'CLIENTS',
    "channel" TEXT NOT NULL DEFAULT 'SMS',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "broadcasts_createdAt_idx" ON "broadcasts"("createdAt");

-- Soften audit_logs FK to allow SetNull
ALTER TABLE "audit_logs" ALTER COLUMN "userId" DROP NOT NULL;

-- Drop URL columns superseded by attachments (ignore if already gone)
ALTER TABLE "car_clients" DROP COLUMN IF EXISTS "idCopyUrl";
ALTER TABLE "car_clients" DROP COLUMN IF EXISTS "licenceCopyUrl";
ALTER TABLE "car_owners" DROP COLUMN IF EXISTS "idCopyUrl";
ALTER TABLE "car_owners" DROP COLUMN IF EXISTS "logbookUrl";
ALTER TABLE "car_owners" DROP COLUMN IF EXISTS "agreementUrl";

-- Condition check photos moved to Attachment
ALTER TABLE "condition_checks" DROP COLUMN IF EXISTS "photos";

-- MessageLog broadcast link
ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "broadcastId" TEXT;
CREATE INDEX IF NOT EXISTS "message_logs_broadcastId_idx" ON "message_logs"("broadcastId");

-- Users: StaffRole + UserStatus enums (match prisma/schema.prisma)
DO $$ BEGIN
  CREATE TYPE "StaffRole" AS ENUM ('DIRECTOR', 'CLERK', 'YARD', 'ACCOUNTANT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add staffRole if missing (TEXT first so we can backfill safely)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "staffRole" TEXT;

-- Backfill from legacy Role column when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    EXECUTE $sql$
      UPDATE "users" SET "staffRole" = CASE
        WHEN "role"::text IN ('ADMIN', 'EXECUTIVE') THEN 'DIRECTOR'
        WHEN "role"::text = 'SECRETARY' THEN 'CLERK'
        WHEN "role"::text IN ('ORGANIZER', 'MEMBER') THEN 'YARD'
        WHEN "role"::text = 'TREASURER' THEN 'ACCOUNTANT'
        ELSE 'CLERK'
      END
      WHERE "staffRole" IS NULL
    $sql$;
  END IF;
END $$;

UPDATE "users" SET "staffRole" = 'CLERK'
WHERE "staffRole" IS NULL
   OR "staffRole" NOT IN ('DIRECTOR', 'CLERK', 'YARD', 'ACCOUNTANT');

-- Promote staffRole TEXT → StaffRole enum (skip if already StaffRole)
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
ALTER TABLE "users" ALTER COLUMN "staffRole" SET NOT NULL;

-- Convert users.status MemberStatus (or text) → UserStatus
DO $$
BEGIN
  IF EXISTS (
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
  END IF;
END $$;

ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"UserStatus";
ALTER TABLE "users" ALTER COLUMN "status" SET NOT NULL;

-- Drop legacy user columns that depended on Role / MemberStatus
ALTER TABLE "users" DROP COLUMN IF EXISTS "dashboardAccess";
ALTER TABLE "users" DROP COLUMN IF EXISTS "location";
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
