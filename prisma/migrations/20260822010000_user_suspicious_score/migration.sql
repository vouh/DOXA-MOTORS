-- Suspicious-activity tracking on staff users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspiciousScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "consecutiveDeletes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastDeleteAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "consecutiveDeleteAlerted" BOOLEAN NOT NULL DEFAULT false;
