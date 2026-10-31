-- AlterTable
ALTER TABLE "users" ADD COLUMN "notificationsViewedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "staff_notifications" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'info',
    "eventAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "staff_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_notifications_sourceKey_key" ON "staff_notifications"("sourceKey");
CREATE INDEX "staff_notifications_deletedAt_createdAt_idx" ON "staff_notifications"("deletedAt", "createdAt");
