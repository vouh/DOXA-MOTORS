-- AlterTable
ALTER TABLE "penalty_rules" ADD COLUMN IF NOT EXISTS "vehicleType" "VehicleType";

-- DropIndex
DROP INDEX IF EXISTS "penalty_rules_active_effectiveFrom_idx";

-- CreateIndex
CREATE INDEX "penalty_rules_active_vehicleType_effectiveFrom_idx" ON "penalty_rules"("active", "vehicleType", "effectiveFrom");
