-- AlterTable
ALTER TABLE "ambulance_call" ADD COLUMN     "caseId" UUID,
ADD COLUMN     "chargeId" UUID,
ADD COLUMN     "discountPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "standardCharge" DECIMAL(14,2),
ADD COLUMN     "taxPct" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ambulance_vehicle" ADD COLUMN     "driverLicense" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "vehicleType" TEXT,
ADD COLUMN     "year" INTEGER;

-- AddForeignKey
ALTER TABLE "ambulance_call" ADD CONSTRAINT "ambulance_call_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "charge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
