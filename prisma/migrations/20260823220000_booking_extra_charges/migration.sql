DO $$ BEGIN
  CREATE TYPE "ExtraChargeStage" AS ENUM ('BOOKING', 'RETURN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "booking_extra_charges" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "stage" "ExtraChargeStage" NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "booking_extra_charges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "booking_extra_charges_bookingId_idx"
  ON "booking_extra_charges"("bookingId");

DO $$ BEGIN
  ALTER TABLE "booking_extra_charges" ADD CONSTRAINT "booking_extra_charges_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "car_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
