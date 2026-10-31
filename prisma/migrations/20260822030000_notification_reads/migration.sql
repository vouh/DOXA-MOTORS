CREATE TABLE IF NOT EXISTS "staff_notification_reads" (
  "userId" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "staff_notification_reads_pkey" PRIMARY KEY ("userId", "notificationId")
);

CREATE INDEX IF NOT EXISTS "staff_notification_reads_userId_readAt_idx"
  ON "staff_notification_reads"("userId", "readAt");

DO $$ BEGIN
  ALTER TABLE "staff_notification_reads" ADD CONSTRAINT "staff_notification_reads_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "staff_notification_reads" ADD CONSTRAINT "staff_notification_reads_notificationId_fkey"
    FOREIGN KEY ("notificationId") REFERENCES "staff_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
