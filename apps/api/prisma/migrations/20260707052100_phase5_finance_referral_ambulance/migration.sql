-- CreateTable
CREATE TABLE "income_head" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "income_head_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_head" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "expense_head_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "headId" UUID,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "income_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "headId" UUID,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_person" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "phone" TEXT,
    "commissionPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "referral_person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_payment" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "referralPersonId" UUID NOT NULL,
    "invoiceId" UUID,
    "patientName" TEXT,
    "billNo" TEXT,
    "billAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "commissionPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "commissionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "referral_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambulance_vehicle" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "vehicleNo" TEXT NOT NULL,
    "model" TEXT,
    "driverName" TEXT,
    "driverContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ambulance_vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambulance_call" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "patientId" UUID,
    "invoiceId" UUID,
    "patientName" TEXT NOT NULL,
    "patientAddress" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ambulance_call_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "income_head_branchId_deletedAt_idx" ON "income_head"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "expense_head_branchId_deletedAt_idx" ON "expense_head"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "income_branchId_deletedAt_date_idx" ON "income"("branchId", "deletedAt", "date");

-- CreateIndex
CREATE UNIQUE INDEX "income_branchId_invoiceNo_key" ON "income"("branchId", "invoiceNo");

-- CreateIndex
CREATE INDEX "expense_branchId_deletedAt_date_idx" ON "expense"("branchId", "deletedAt", "date");

-- CreateIndex
CREATE UNIQUE INDEX "expense_branchId_invoiceNo_key" ON "expense"("branchId", "invoiceNo");

-- CreateIndex
CREATE INDEX "referral_person_branchId_deletedAt_idx" ON "referral_person"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "referral_payment_branchId_deletedAt_createdAt_idx" ON "referral_payment"("branchId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "ambulance_vehicle_branchId_deletedAt_idx" ON "ambulance_vehicle"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "ambulance_call_branchId_deletedAt_date_idx" ON "ambulance_call"("branchId", "deletedAt", "date");

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_headId_fkey" FOREIGN KEY ("headId") REFERENCES "income_head"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_headId_fkey" FOREIGN KEY ("headId") REFERENCES "expense_head"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_payment" ADD CONSTRAINT "referral_payment_referralPersonId_fkey" FOREIGN KEY ("referralPersonId") REFERENCES "referral_person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_call" ADD CONSTRAINT "ambulance_call_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "ambulance_vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
