-- Drop leftover SACCO / member-portal tables (not part of Doxa Car Hire).
-- Keep: vehicle_documents, attachments, car_*, users, audit_logs, message_logs, etc.
--
-- IMPORTANT: Never DROP TYPE ... CASCADE for MemberStatus/Role — that can destroy users.status.
-- Stage 1 converts users.status → UserStatus and drops users.role first.
-- These drops only run when no live columns still depend on the type.

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

DROP TYPE IF EXISTS "ProjectStatus" CASCADE;
DROP TYPE IF EXISTS "WelfareStatus" CASCADE;
DROP TYPE IF EXISTS "MeetingStatus" CASCADE;

-- Role: only if no columns (including Role[]) still use it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_attribute a
       JOIN pg_class c ON a.attrelid = c.oid
       JOIN pg_namespace n ON c.relnamespace = n.oid
       JOIN pg_type t ON a.atttypid = t.oid
       WHERE n.nspname = 'public'
         AND a.attnum > 0
         AND NOT a.attisdropped
         AND (t.typname = 'Role' OR t.typname = '_Role')
     ) THEN
    DROP TYPE "Role";
  END IF;
END $$;

-- MemberStatus: only after users.status has been moved to UserStatus
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MemberStatus')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_attribute a
       JOIN pg_class c ON a.attrelid = c.oid
       JOIN pg_namespace n ON c.relnamespace = n.oid
       JOIN pg_type t ON a.atttypid = t.oid
       WHERE n.nspname = 'public'
         AND a.attnum > 0
         AND NOT a.attisdropped
         AND t.typname = 'MemberStatus'
     ) THEN
    DROP TYPE "MemberStatus";
  END IF;
END $$;
