-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "leave_request" ADD COLUMN     "appliedDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "statusAt" TIMESTAMP(3),
ADD COLUMN     "statusById" UUID;

-- AlterTable
ALTER TABLE "payroll" ADD COLUMN     "basicSalary" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "deductionItems" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "earnings" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentMode" TEXT NOT NULL DEFAULT 'Transfer to Bank Account';
