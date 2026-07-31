-- Drop leftover SACCO / member-portal tables from Supabase Postgres.
-- Keep car-hire tables: car_*, vehicle_documents, attachments, users, audit_logs, message_logs, etc.

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

-- Obsolete enums from the old member portal
DROP TYPE IF EXISTS "ProjectStatus" CASCADE;
DROP TYPE IF EXISTS "WelfareStatus" CASCADE;
DROP TYPE IF EXISTS "MeetingStatus" CASCADE;
DROP TYPE IF EXISTS "Role" CASCADE;
DROP TYPE IF EXISTS "MemberStatus" CASCADE;
