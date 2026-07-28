-- AlterTable
ALTER TABLE "medicine" ADD COLUMN     "companyId" UUID,
ADD COLUMN     "groupId" UUID,
ADD COLUMN     "unitId" UUID;

-- CreateTable
CREATE TABLE "pharma_company" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pharma_company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_group" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "medicine_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharma_unit" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pharma_unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dosage_interval" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "dosage_interval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dosage_duration" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "dosage_duration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharma_supplier" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "drugLicenseNumber" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pharma_supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_dosage" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "categoryId" UUID,
    "dosage" TEXT NOT NULL,
    "unitId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "medicine_dosage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pharma_company_branchId_deletedAt_idx" ON "pharma_company"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "medicine_group_branchId_deletedAt_idx" ON "medicine_group"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "pharma_unit_branchId_deletedAt_idx" ON "pharma_unit"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "dosage_interval_branchId_deletedAt_idx" ON "dosage_interval"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "dosage_duration_branchId_deletedAt_idx" ON "dosage_duration"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "pharma_supplier_branchId_deletedAt_idx" ON "pharma_supplier"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "medicine_dosage_branchId_deletedAt_idx" ON "medicine_dosage"("branchId", "deletedAt");

-- AddForeignKey
ALTER TABLE "medicine_dosage" ADD CONSTRAINT "medicine_dosage_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "medicine_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_dosage" ADD CONSTRAINT "medicine_dosage_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "pharma_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine" ADD CONSTRAINT "medicine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "pharma_company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine" ADD CONSTRAINT "medicine_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "medicine_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine" ADD CONSTRAINT "medicine_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "pharma_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
