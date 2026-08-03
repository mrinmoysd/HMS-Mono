-- AlterTable
ALTER TABLE "ipd_admission" ADD COLUMN     "dischargeDiagnosis" TEXT,
ADD COLUMN     "dischargeInvestigation" TEXT,
ADD COLUMN     "dischargeNote" TEXT,
ADD COLUMN     "dischargeOperation" TEXT,
ADD COLUMN     "dischargeStatus" TEXT,
ADD COLUMN     "treatmentHome" TEXT;
