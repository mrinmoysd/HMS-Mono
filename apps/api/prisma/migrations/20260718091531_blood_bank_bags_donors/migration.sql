-- DropForeignKey
ALTER TABLE "blood_issue" DROP CONSTRAINT "blood_issue_productId_fkey";

-- AlterTable
ALTER TABLE "blood_donor" ADD COLUMN     "address" TEXT,
ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "gender" TEXT;

-- AlterTable
ALTER TABLE "blood_issue" ADD COLUMN     "bagId" UUID,
ADD COLUMN     "bloodQty" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "technician" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "blood_bag" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "donorId" UUID,
    "sourceBagId" UUID,
    "bagNo" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "component" TEXT,
    "volume" TEXT,
    "unitType" TEXT,
    "lot" TEXT,
    "institution" TEXT,
    "donateDate" TIMESTAMP(3),
    "chargeId" UUID,
    "standardCharge" DECIMAL(14,2),
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "blood_bag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blood_bag_branchId_bloodGroup_component_status_deletedAt_idx" ON "blood_bag"("branchId", "bloodGroup", "component", "status", "deletedAt");

-- AddForeignKey
ALTER TABLE "blood_bag" ADD CONSTRAINT "blood_bag_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "blood_donor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_bag" ADD CONSTRAINT "blood_bag_sourceBagId_fkey" FOREIGN KEY ("sourceBagId") REFERENCES "blood_bag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_bag" ADD CONSTRAINT "blood_bag_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "charge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_issue" ADD CONSTRAINT "blood_issue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "blood_product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_issue" ADD CONSTRAINT "blood_issue_bagId_fkey" FOREIGN KEY ("bagId") REFERENCES "blood_bag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
