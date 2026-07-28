-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "consultantId" UUID;

-- AlterTable
ALTER TABLE "medicine" ADD COLUMN     "boxPacking" TEXT,
ADD COLUMN     "composition" TEXT,
ADD COLUMN     "minLevel" INTEGER,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "rackNumber" TEXT,
ADD COLUMN     "reorderLevel" INTEGER,
ADD COLUMN     "taxPercent" DECIMAL(6,2),
ADD COLUMN     "vatAc" TEXT;

-- CreateTable
CREATE TABLE "medicine_purchase" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "purchaseNo" TEXT NOT NULL,
    "billNo" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplierId" UUID,
    "note" TEXT,
    "attachmentUrl" TEXT,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discountPct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paymentMode" TEXT,
    "paymentAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paymentNote" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "medicine_purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_purchase_item" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "purchaseId" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "batchNo" TEXT NOT NULL,
    "expiryMonth" TIMESTAMP(3) NOT NULL,
    "mrp" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "batchAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "salePrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "packingQty" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "purchasePrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxPercent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicine_purchase_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_bad_stock" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "purchaseItemId" UUID,
    "batchNo" TEXT,
    "expiryDate" TIMESTAMP(3),
    "outwardDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qty" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicine_bad_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_batch_tpa_rate" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "purchaseItemId" UUID NOT NULL,
    "tpaId" UUID NOT NULL,
    "rate" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicine_batch_tpa_rate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medicine_purchase_branchId_deletedAt_purchaseDate_idx" ON "medicine_purchase"("branchId", "deletedAt", "purchaseDate");

-- CreateIndex
CREATE UNIQUE INDEX "medicine_purchase_branchId_purchaseNo_key" ON "medicine_purchase"("branchId", "purchaseNo");

-- CreateIndex
CREATE INDEX "medicine_purchase_item_branchId_medicineId_idx" ON "medicine_purchase_item"("branchId", "medicineId");

-- CreateIndex
CREATE INDEX "medicine_purchase_item_purchaseId_idx" ON "medicine_purchase_item"("purchaseId");

-- CreateIndex
CREATE INDEX "medicine_bad_stock_branchId_medicineId_idx" ON "medicine_bad_stock"("branchId", "medicineId");

-- CreateIndex
CREATE INDEX "medicine_batch_tpa_rate_branchId_idx" ON "medicine_batch_tpa_rate"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "medicine_batch_tpa_rate_purchaseItemId_tpaId_key" ON "medicine_batch_tpa_rate"("purchaseItemId", "tpaId");

-- AddForeignKey
ALTER TABLE "medicine_purchase" ADD CONSTRAINT "medicine_purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "pharma_supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_purchase_item" ADD CONSTRAINT "medicine_purchase_item_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "medicine_purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_purchase_item" ADD CONSTRAINT "medicine_purchase_item_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_bad_stock" ADD CONSTRAINT "medicine_bad_stock_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_bad_stock" ADD CONSTRAINT "medicine_bad_stock_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "medicine_purchase_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_batch_tpa_rate" ADD CONSTRAINT "medicine_batch_tpa_rate_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "medicine_purchase_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_batch_tpa_rate" ADD CONSTRAINT "medicine_batch_tpa_rate_tpaId_fkey" FOREIGN KEY ("tpaId") REFERENCES "tpa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
