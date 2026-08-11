-- Insta Pay: allow STK before booking reconcile; store failure reasons
ALTER TABLE "car_payments" ALTER COLUMN "bookingId" DROP NOT NULL;

ALTER TABLE "car_payments" ADD COLUMN IF NOT EXISTS "failureReason" TEXT;
ALTER TABLE "car_payments" ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE INDEX IF NOT EXISTS "car_payments_status_createdAt_idx" ON "car_payments"("status", "createdAt");
