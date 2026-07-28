-- AlterTable
ALTER TABLE "charge_type" ADD COLUMN     "modules" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "charge_schedule" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "chargeId" UUID NOT NULL,
    "tpaId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charge_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "charge_schedule_branchId_idx" ON "charge_schedule"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "charge_schedule_chargeId_tpaId_key" ON "charge_schedule"("chargeId", "tpaId");

-- AddForeignKey
ALTER TABLE "charge_schedule" ADD CONSTRAINT "charge_schedule_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "charge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_schedule" ADD CONSTRAINT "charge_schedule_tpaId_fkey" FOREIGN KEY ("tpaId") REFERENCES "tpa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
