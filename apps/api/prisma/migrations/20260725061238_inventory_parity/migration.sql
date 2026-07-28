-- AlterTable
ALTER TABLE "inventory_item" ADD COLUMN     "description" TEXT,
ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "item_issue" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "note" TEXT,
ADD COLUMN     "returnDate" TIMESTAMP(3),
ADD COLUMN     "returnedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'issued',
ADD COLUMN     "userType" TEXT;

-- AlterTable
ALTER TABLE "item_stock" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "documentUrl" TEXT,
ADD COLUMN     "purchasePrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "supplierId" UUID;
