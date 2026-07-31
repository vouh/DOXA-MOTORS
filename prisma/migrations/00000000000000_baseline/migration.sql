-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EXECUTIVE', 'TREASURER', 'SECRETARY', 'ORGANIZER', 'MEMBER');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "WelfareStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MPESA', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'HIRED', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('SALOON', 'SUV_4X4', 'VAN_MINIBUS', 'PICKUP', 'ECONOMY');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('RESERVED', 'DISPATCHED', 'OVERDUE', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CarPaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PenaltyRateUnit" AS ENUM ('HOUR', 'DAY');

-- CreateEnum
CREATE TYPE "ConditionStage" AS ENUM ('DISPATCH', 'RETURN');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('CLIENT', 'OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "VehicleDocumentType" AS ENUM ('INSURANCE', 'INSPECTION');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "location" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "status" "MemberStatus" NOT NULL DEFAULT 'PENDING',
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "dashboardAccess" "Role"[] DEFAULT ARRAY[]::"Role"[],
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "receivedBy" TEXT,
    "statementRef" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mpesaRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "welfare_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "status" "WelfareStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "welfare_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'UPCOMING',
    "imageUrl" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_photos" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "category" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "authorId" TEXT NOT NULL,
    "broadcast" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailSentAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_receipts" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "imageUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "category" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "agenda" TEXT,
    "minutes" TEXT,
    "opening" TEXT,
    "attendees" TEXT,
    "membersAbsent" TEXT,
    "membersApology" TEXT,
    "aob" TEXT,
    "nextMeetingAt" TIMESTAMP(3),
    "status" "MeetingStatus" NOT NULL DEFAULT 'DRAFT',
    "heldAt" TIMESTAMP(3) NOT NULL,
    "attendance" INTEGER NOT NULL DEFAULT 0,
    "recordedBy" TEXT NOT NULL,
    "publishedDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_owners" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "nationalId" TEXT NOT NULL,
    "kraPin" TEXT,
    "bankDetails" TEXT,
    "mpesaNumber" TEXT,
    "idCopyUrl" TEXT,
    "logbookUrl" TEXT,
    "agreementUrl" TEXT,
    "nextOfKin" TEXT,
    "commissionType" "CommissionType" NOT NULL DEFAULT 'PERCENTAGE',
    "commissionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recurringDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "car_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_vehicles" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "regNumber" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "color" TEXT,
    "type" "VehicleType" NOT NULL,
    "dailyRate" DOUBLE PRECISION NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "car_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_clients" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "idOrPassportNo" TEXT NOT NULL,
    "idCopyUrl" TEXT,
    "licenceNo" TEXT NOT NULL,
    "licenceCopyUrl" TEXT,
    "licenceExpiry" TIMESTAMP(3),
    "physicalAddress" TEXT,
    "nextOfKin" TEXT,
    "employer" TEXT,
    "secondContact" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "car_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penalty_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "graceMinutes" INTEGER NOT NULL DEFAULT 0,
    "rate" DOUBLE PRECISION NOT NULL,
    "rateUnit" "PenaltyRateUnit" NOT NULL,
    "cap" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "penalty_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_bookings" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "penaltyRuleId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "expectedReturnAt" TIMESTAMP(3) NOT NULL,
    "actualReturnAt" TIMESTAMP(3),
    "dailyRate" DOUBLE PRECISION NOT NULL,
    "days" INTEGER NOT NULL,
    "baseCharge" DOUBLE PRECISION NOT NULL,
    "additionalCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "penaltyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCharge" DOUBLE PRECISION NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'RESERVED',
    "dispatchNotes" TEXT,
    "returnNotes" TEXT,
    "createdBy" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "car_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condition_checks" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "stage" "ConditionStage" NOT NULL,
    "dentsNotes" TEXT,
    "fuelLevel" INTEGER,
    "odometer" INTEGER,
    "componentsOk" BOOLEAN NOT NULL DEFAULT true,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "checkedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "condition_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_hire_extensions" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "previousReturnAt" TIMESTAMP(3) NOT NULL,
    "newReturnAt" TIMESTAMP(3) NOT NULL,
    "extraDays" INTEGER NOT NULL,
    "extraAmount" DOUBLE PRECISION NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "car_hire_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_penalties" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "minutesLate" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "calculationNotes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "car_penalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_payments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "CarPaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "mpesaRef" TEXT,
    "checkoutId" TEXT,
    "phone" TEXT,
    "receivedBy" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "car_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_expenses" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "incurredAt" TIMESTAMP(3) NOT NULL,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "car_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_payouts" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossEarnings" DOUBLE PRECISION NOT NULL,
    "commission" DOUBLE PRECISION NOT NULL,
    "totalExpenses" DOUBLE PRECISION NOT NULL,
    "deductions" DOUBLE PRECISION NOT NULL,
    "netPay" DOUBLE PRECISION NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_documents" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "VehicleDocumentType" NOT NULL,
    "fileUrl" TEXT,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "alertSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_logs" (
    "id" TEXT NOT NULL,
    "recipientType" "RecipientType" NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientName" TEXT,
    "destination" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "template" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "providerRef" TEXT,
    "error" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_hire_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "car_hire_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_authUserId_key" ON "users"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "contributions_userId_idx" ON "contributions"("userId");

-- CreateIndex
CREATE INDEX "contributions_paidAt_idx" ON "contributions"("paidAt");

-- CreateIndex
CREATE INDEX "welfare_requests_userId_idx" ON "welfare_requests"("userId");

-- CreateIndex
CREATE INDEX "welfare_requests_status_idx" ON "welfare_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_receipts_announcementId_userId_key" ON "announcement_receipts"("announcementId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "meetings_publishedDocumentId_key" ON "meetings"("publishedDocumentId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "car_owners_nationalId_key" ON "car_owners"("nationalId");

-- CreateIndex
CREATE INDEX "car_owners_phone_idx" ON "car_owners"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "car_vehicles_regNumber_key" ON "car_vehicles"("regNumber");

-- CreateIndex
CREATE INDEX "car_vehicles_ownerId_idx" ON "car_vehicles"("ownerId");

-- CreateIndex
CREATE INDEX "car_vehicles_status_idx" ON "car_vehicles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "car_clients_phone_key" ON "car_clients"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "car_clients_idOrPassportNo_key" ON "car_clients"("idOrPassportNo");

-- CreateIndex
CREATE INDEX "car_clients_fullName_idx" ON "car_clients"("fullName");

-- CreateIndex
CREATE INDEX "penalty_rules_active_effectiveFrom_idx" ON "penalty_rules"("active", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "car_bookings_reference_key" ON "car_bookings"("reference");

-- CreateIndex
CREATE INDEX "car_bookings_clientId_idx" ON "car_bookings"("clientId");

-- CreateIndex
CREATE INDEX "car_bookings_vehicleId_idx" ON "car_bookings"("vehicleId");

-- CreateIndex
CREATE INDEX "car_bookings_status_expectedReturnAt_idx" ON "car_bookings"("status", "expectedReturnAt");

-- CreateIndex
CREATE UNIQUE INDEX "condition_checks_bookingId_stage_key" ON "condition_checks"("bookingId", "stage");

-- CreateIndex
CREATE INDEX "car_hire_extensions_bookingId_idx" ON "car_hire_extensions"("bookingId");

-- CreateIndex
CREATE INDEX "car_penalties_bookingId_idx" ON "car_penalties"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "car_payments_mpesaRef_key" ON "car_payments"("mpesaRef");

-- CreateIndex
CREATE UNIQUE INDEX "car_payments_checkoutId_key" ON "car_payments"("checkoutId");

-- CreateIndex
CREATE INDEX "car_payments_bookingId_status_idx" ON "car_payments"("bookingId", "status");

-- CreateIndex
CREATE INDEX "car_payments_paidAt_idx" ON "car_payments"("paidAt");

-- CreateIndex
CREATE INDEX "car_expenses_ownerId_incurredAt_idx" ON "car_expenses"("ownerId", "incurredAt");

-- CreateIndex
CREATE INDEX "car_expenses_vehicleId_incurredAt_idx" ON "car_expenses"("vehicleId", "incurredAt");

-- CreateIndex
CREATE INDEX "owner_payouts_status_idx" ON "owner_payouts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "owner_payouts_ownerId_periodStart_periodEnd_key" ON "owner_payouts"("ownerId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "vehicle_documents_expiryDate_idx" ON "vehicle_documents"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_documents_vehicleId_type_key" ON "vehicle_documents"("vehicleId", "type");

-- CreateIndex
CREATE INDEX "message_logs_status_scheduledFor_idx" ON "message_logs"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "message_logs_recipientType_recipientId_idx" ON "message_logs"("recipientType", "recipientId");

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "welfare_requests" ADD CONSTRAINT "welfare_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_photos" ADD CONSTRAINT "gallery_photos_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_receipts" ADD CONSTRAINT "announcement_receipts_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_receipts" ADD CONSTRAINT "announcement_receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_publishedDocumentId_fkey" FOREIGN KEY ("publishedDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_vehicles" ADD CONSTRAINT "car_vehicles_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "car_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_bookings" ADD CONSTRAINT "car_bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "car_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_bookings" ADD CONSTRAINT "car_bookings_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "car_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_bookings" ADD CONSTRAINT "car_bookings_penaltyRuleId_fkey" FOREIGN KEY ("penaltyRuleId") REFERENCES "penalty_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condition_checks" ADD CONSTRAINT "condition_checks_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "car_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_hire_extensions" ADD CONSTRAINT "car_hire_extensions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "car_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_penalties" ADD CONSTRAINT "car_penalties_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "car_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_penalties" ADD CONSTRAINT "car_penalties_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "penalty_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_payments" ADD CONSTRAINT "car_payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "car_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_expenses" ADD CONSTRAINT "car_expenses_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "car_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_expenses" ADD CONSTRAINT "car_expenses_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "car_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_payouts" ADD CONSTRAINT "owner_payouts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "car_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "car_vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
