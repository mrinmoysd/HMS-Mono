-- DropIndex
DROP INDEX "payment_transactionNo_idx";

-- DropIndex
DROP INDEX "prescription_prescriptionNo_idx";

-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "delivered" INTEGER,
ADD COLUMN     "failed" INTEGER;
