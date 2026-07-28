-- CreateTable
CREATE TABLE "medicine_category" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "medicine_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" UUID,
    "company" TEXT,
    "unit" TEXT,
    "salePrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "purchasePrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "expiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_category" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "modality" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "diagnostic_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_test" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "modality" TEXT NOT NULL,
    "categoryId" UUID,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "referenceRange" TEXT,
    "charge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "diagnostic_test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_product" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "bloodGroup" TEXT,
    "component" TEXT,
    "rate" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "blood_product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_stock" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blood_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_donor" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "phone" TEXT,
    "age" TEXT,
    "lastDonation" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "blood_donor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_issue" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "donorId" UUID,
    "patientId" UUID,
    "invoiceId" UUID,
    "type" TEXT NOT NULL DEFAULT 'blood',
    "units" INTEGER NOT NULL DEFAULT 1,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blood_issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_category" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "operation_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "categoryId" UUID,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "operation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medicine_category_branchId_deletedAt_idx" ON "medicine_category"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "medicine_branchId_deletedAt_createdAt_idx" ON "medicine"("branchId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "medicine_branchId_expiry_idx" ON "medicine"("branchId", "expiry");

-- CreateIndex
CREATE INDEX "diagnostic_category_branchId_modality_deletedAt_idx" ON "diagnostic_category"("branchId", "modality", "deletedAt");

-- CreateIndex
CREATE INDEX "diagnostic_test_branchId_modality_deletedAt_createdAt_idx" ON "diagnostic_test"("branchId", "modality", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "blood_product_branchId_deletedAt_idx" ON "blood_product"("branchId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "blood_stock_productId_key" ON "blood_stock"("productId");

-- CreateIndex
CREATE INDEX "blood_stock_branchId_idx" ON "blood_stock"("branchId");

-- CreateIndex
CREATE INDEX "blood_donor_branchId_deletedAt_idx" ON "blood_donor"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "blood_issue_branchId_type_createdAt_idx" ON "blood_issue"("branchId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "operation_category_branchId_deletedAt_idx" ON "operation_category"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "operation_branchId_deletedAt_idx" ON "operation"("branchId", "deletedAt");

-- AddForeignKey
ALTER TABLE "medicine" ADD CONSTRAINT "medicine_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "medicine_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_test" ADD CONSTRAINT "diagnostic_test_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "diagnostic_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_stock" ADD CONSTRAINT "blood_stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "blood_product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_issue" ADD CONSTRAINT "blood_issue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "blood_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_issue" ADD CONSTRAINT "blood_issue_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "blood_donor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation" ADD CONSTRAINT "operation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "operation_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
