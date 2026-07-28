-- DropIndex
DROP INDEX "expense_branchId_invoiceNo_key";

-- DropIndex
DROP INDEX "income_branchId_invoiceNo_key";

-- AlterTable
ALTER TABLE "expense" ADD COLUMN     "documentUrl" TEXT,
ALTER COLUMN "invoiceNo" DROP NOT NULL;

-- AlterTable
ALTER TABLE "income" ADD COLUMN     "documentUrl" TEXT,
ALTER COLUMN "invoiceNo" DROP NOT NULL;

-- AlterTable
ALTER TABLE "referral_payment" ADD COLUMN     "patientId" UUID,
ADD COLUMN     "patientType" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "referral_person" ADD COLUMN     "address" TEXT,
ADD COLUMN     "commissions" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "contactPerson" TEXT,
ADD COLUMN     "contactPhone" TEXT;

-- CreateTable
CREATE TABLE "referral_category" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "referral_category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "referral_category_branchId_deletedAt_idx" ON "referral_category"("branchId", "deletedAt");
