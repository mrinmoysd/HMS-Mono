-- AlterTable
ALTER TABLE "live_consultation" ADD COLUMN     "encounterId" UUID,
ADD COLUMN     "encounterType" TEXT,
ADD COLUMN     "joinUrl" TEXT,
ADD COLUMN     "patientId" UUID;

-- CreateTable
CREATE TABLE "operation_record" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterType" TEXT,
    "encounterId" UUID,
    "category" TEXT,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "consultant" TEXT,
    "assistant1" TEXT,
    "assistant2" TEXT,
    "anesthetist" TEXT,
    "anesthesiaType" TEXT,
    "otTechnician" TEXT,
    "otAssistant" TEXT,
    "result" TEXT,
    "refNo" TEXT,
    "remark" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "operation_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operation_record_branchId_patientId_deletedAt_idx" ON "operation_record"("branchId", "patientId", "deletedAt");

-- CreateIndex
CREATE INDEX "operation_record_branchId_encounterType_encounterId_idx" ON "operation_record"("branchId", "encounterType", "encounterId");

-- CreateIndex
CREATE INDEX "live_consultation_branchId_patientId_encounterType_encounte_idx" ON "live_consultation"("branchId", "patientId", "encounterType", "encounterId");

-- AddForeignKey
ALTER TABLE "live_consultation" ADD CONSTRAINT "live_consultation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_record" ADD CONSTRAINT "operation_record_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
