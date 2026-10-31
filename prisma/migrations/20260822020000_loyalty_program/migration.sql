-- Loyalty + return condition rating
ALTER TABLE "car_clients" ADD COLUMN IF NOT EXISTS "loyaltyPoints" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "car_bookings" ADD COLUMN IF NOT EXISTS "loyaltyPointsEarned" INTEGER;
ALTER TABLE "car_bookings" ADD COLUMN IF NOT EXISTS "loyaltyPointsRedeemed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "car_bookings" ADD COLUMN IF NOT EXISTS "loyaltyDiscountKes" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "condition_checks" ADD COLUMN IF NOT EXISTS "conditionRating" INTEGER;
ALTER TABLE "condition_checks" ADD COLUMN IF NOT EXISTS "decreaseComment" TEXT;

DO $$ BEGIN
  CREATE TYPE "LoyaltyLedgerKind" AS ENUM ('EARN', 'REDEEM', 'ADJUST', 'RECALC');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "loyalty_ledger" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "bookingId" TEXT,
  "kind" "LoyaltyLedgerKind" NOT NULL,
  "points" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "note" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceKey" TEXT,
  CONSTRAINT "loyalty_ledger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_ledger_sourceKey_key" ON "loyalty_ledger"("sourceKey");
CREATE INDEX IF NOT EXISTS "loyalty_ledger_clientId_createdAt_idx" ON "loyalty_ledger"("clientId", "createdAt");
CREATE INDEX IF NOT EXISTS "loyalty_ledger_bookingId_idx" ON "loyalty_ledger"("bookingId");

DO $$ BEGIN
  ALTER TABLE "loyalty_ledger" ADD CONSTRAINT "loyalty_ledger_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "car_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "loyalty_ledger" ADD CONSTRAINT "loyalty_ledger_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "car_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
