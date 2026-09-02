-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'APPRAISER', 'CASHIER', 'STAFF');

-- CreateEnum
CREATE TYPE "KycDocType" AS ENUM ('AADHAAR', 'PAN', 'DRIVING_LICENCE', 'VOTER_ID', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BiometricStatus" AS ENUM ('NOT_ENROLLED', 'ENROLLED', 'ENROLLMENT_FAILED');

-- CreateEnum
CREATE TYPE "BiometricResult" AS ENUM ('MATCH', 'NO_MATCH', 'DEVICE_ERROR');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('DRAFT', 'APPRAISAL_PENDING', 'APPRAISED', 'APPROVAL_PENDING', 'APPROVED', 'DOCUMENT_PENDING', 'DISBURSED', 'ACTIVE', 'OVERDUE', 'NOTICE', 'AUCTION_ELIGIBLE', 'AUCTIONED', 'HOLD', 'CLOSED');

-- CreateEnum
CREATE TYPE "JewelleryStatus" AS ENUM ('PLEDGED', 'PART_RELEASE_PENDING', 'RELEASED');

-- CreateEnum
CREATE TYPE "AppraisalStatus" AS ENUM ('DRAFT', 'APPRAISER_CONFIRMED', 'MANAGER_APPROVED', 'LOCKED');

-- CreateEnum
CREATE TYPE "InterestType" AS ENUM ('MONTHLY_SIMPLE', 'DAILY_SIMPLE', 'ANNUAL_SIMPLE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('DISBURSEMENT', 'PAYMENT', 'INTEREST_ACCRUED', 'INTEREST_PAID', 'PRINCIPAL_PAID', 'PENALTY_CHARGED', 'PENALTY_PAID', 'CHARGE', 'REVERSAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "PacketStatus" AS ENUM ('CREATED', 'SEALED', 'STORED', 'IN_CLOSURE_PROCESS', 'RETRIEVED', 'RELEASED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PLEDGE_AGREEMENT', 'APPRAISAL_SHEET', 'PAYMENT_RECEIPT', 'RENEWAL', 'CLOSURE', 'GOLD_RELEASE_RECEIPT', 'CUSTOMER_STATEMENT', 'NOTICE');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('GENERATED', 'PRINTED', 'SIGNED_PHYSICALLY', 'PACKET_CREATED', 'STORED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "RecordLifecycle" AS ENUM ('ACTIVE', 'VOIDED', 'CANCELLED', 'REVERSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "HoldReason" AS ENUM ('IDENTITY_DISPUTE', 'OWNERSHIP_DISPUTE', 'PAYMENT_DISPUTE', 'LEGAL_NOTICE', 'MISSING_PACKET', 'JEWELLERY_MISMATCH', 'SUSPECTED_FRAUD', 'SYSTEM_DISCREPANCY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "customerCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "guardianName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "mobile" TEXT NOT NULL,
    "alternateMobile" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "occupation" TEXT,
    "photoUrl" TEXT,
    "signatureUrl" TEXT,
    "kycStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "biometricStatus" "BiometricStatus" NOT NULL DEFAULT 'NOT_ENROLLED',
    "status" "RecordLifecycle" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_documents" (
    "id" TEXT NOT NULL,
    "documentCode" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "docType" "KycDocType" NOT NULL,
    "docNumberMasked" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_enrollments" (
    "id" TEXT NOT NULL,
    "enrollmentCode" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "templateRef" TEXT NOT NULL,
    "status" "BiometricStatus" NOT NULL DEFAULT 'ENROLLED',
    "enrolledById" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biometric_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_verification_logs" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "loanId" TEXT,
    "deviceId" TEXT NOT NULL,
    "result" "BiometricResult" NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "fallbackReason" TEXT,
    "verifiedById" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biometric_verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_schemes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "interestType" "InterestType" NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "ltvThreshold" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,

    CONSTRAINT "loan_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "loanCode" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "schemeId" TEXT,
    "status" "LoanStatus" NOT NULL DEFAULT 'DRAFT',
    "principalAmount" DOUBLE PRECISION,
    "interestRate" DOUBLE PRECISION,
    "interestType" "InterestType",
    "processingCharges" DOUBLE PRECISION DEFAULT 0,
    "otherCharges" DOUBLE PRECISION DEFAULT 0,
    "sanctionedDate" TIMESTAMP(3),
    "maturityDate" TIMESTAMP(3),
    "holdReason" "HoldReason",
    "holdNotes" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jewellery_items" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "grossWeight" DOUBLE PRECISION NOT NULL,
    "stoneWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netWeight" DOUBLE PRECISION NOT NULL,
    "purityKarat" TEXT NOT NULL,
    "fineness" INTEGER,
    "valuationRate" DOUBLE PRECISION NOT NULL,
    "valuation" DOUBLE PRECISION NOT NULL,
    "hallmarkDetails" TEXT,
    "identifyingMarks" TEXT,
    "condition" TEXT,
    "ownershipDeclaration" BOOLEAN NOT NULL DEFAULT false,
    "appraisalRemarks" TEXT,
    "status" "JewelleryStatus" NOT NULL DEFAULT 'PLEDGED',
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jewellery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jewellery_photos" (
    "id" TEXT NOT NULL,
    "jewelleryItemId" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "capturedById" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jewellery_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appraisals" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "appraiserId" TEXT NOT NULL,
    "status" "AppraisalStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "goldRateSource" TEXT,
    "goldRateValue" DOUBLE PRECISION,
    "goldRateAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appraisals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "paymentCode" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" "PaymentMode" NOT NULL,
    "principalComponent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interestComponent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "penaltyComponent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashierId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "transactionRef" TEXT,
    "notes" TEXT,
    "lifecycle" "RecordLifecycle" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "relatedPaymentId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_locations" (
    "id" TEXT NOT NULL,
    "branch" TEXT NOT NULL DEFAULT 'Main Branch',
    "safe" TEXT NOT NULL,
    "locker" TEXT NOT NULL,
    "shelf" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "storage_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packets" (
    "id" TEXT NOT NULL,
    "packetCode" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "status" "PacketStatus" NOT NULL DEFAULT 'CREATED',
    "storageLocationId" TEXT,
    "sealedAt" TIMESTAMP(3),
    "storedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packet_movements" (
    "id" TEXT NOT NULL,
    "packetId" TEXT NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "reason" TEXT NOT NULL,
    "movedById" TEXT NOT NULL,
    "returned" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packet_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "documentCode" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'GENERATED',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "verificationCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "reason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedSignedCopyUrl" TEXT,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "loanId" TEXT,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "id_sequences" (
    "prefix" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "id_sequences_pkey" PRIMARY KEY ("prefix","year")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleAtTime" "UserRole" NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "approvedById" TEXT,
    "ipAddress" TEXT,
    "deviceId" TEXT,
    "result" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeCode_key" ON "users"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customerCode_key" ON "customers"("customerCode");

-- CreateIndex
CREATE INDEX "customers_mobile_idx" ON "customers"("mobile");

-- CreateIndex
CREATE INDEX "customers_fullName_idx" ON "customers"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "customer_documents_documentCode_key" ON "customer_documents"("documentCode");

-- CreateIndex
CREATE UNIQUE INDEX "biometric_enrollments_enrollmentCode_key" ON "biometric_enrollments"("enrollmentCode");

-- CreateIndex
CREATE UNIQUE INDEX "biometric_enrollments_customerId_key" ON "biometric_enrollments"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "loans_loanCode_key" ON "loans"("loanCode");

-- CreateIndex
CREATE INDEX "loans_status_idx" ON "loans"("status");

-- CreateIndex
CREATE UNIQUE INDEX "jewellery_items_itemCode_key" ON "jewellery_items"("itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentCode_key" ON "payments"("paymentCode");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receiptNumber_key" ON "payments"("receiptNumber");

-- CreateIndex
CREATE INDEX "ledger_entries_loanId_createdAt_idx" ON "ledger_entries"("loanId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "storage_locations_label_key" ON "storage_locations"("label");

-- CreateIndex
CREATE UNIQUE INDEX "storage_locations_branch_safe_locker_shelf_position_key" ON "storage_locations"("branch", "safe", "locker", "shelf", "position");

-- CreateIndex
CREATE UNIQUE INDEX "packets_packetCode_key" ON "packets"("packetCode");

-- CreateIndex
CREATE UNIQUE INDEX "packets_loanId_key" ON "packets"("loanId");

-- CreateIndex
CREATE UNIQUE INDEX "documents_documentCode_key" ON "documents"("documentCode");

-- CreateIndex
CREATE UNIQUE INDEX "documents_verificationCode_key" ON "documents"("verificationCode");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_documentId_versionNumber_key" ON "document_versions"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "customer_documents" ADD CONSTRAINT "customer_documents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_enrollments" ADD CONSTRAINT "biometric_enrollments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_verification_logs" ADD CONSTRAINT "biometric_verification_logs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_verification_logs" ADD CONSTRAINT "biometric_verification_logs_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "loan_schemes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jewellery_items" ADD CONSTRAINT "jewellery_items_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jewellery_photos" ADD CONSTRAINT "jewellery_photos_jewelleryItemId_fkey" FOREIGN KEY ("jewelleryItemId") REFERENCES "jewellery_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisals" ADD CONSTRAINT "appraisals_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packets" ADD CONSTRAINT "packets_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packets" ADD CONSTRAINT "packets_storageLocationId_fkey" FOREIGN KEY ("storageLocationId") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packet_movements" ADD CONSTRAINT "packet_movements_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "packets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packet_movements" ADD CONSTRAINT "packet_movements_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packet_movements" ADD CONSTRAINT "packet_movements_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
