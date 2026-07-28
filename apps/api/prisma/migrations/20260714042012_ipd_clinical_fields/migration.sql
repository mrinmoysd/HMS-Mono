-- AlterTable
ALTER TABLE "ipd_admission" ADD COLUMN     "applyTpa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "casualty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "icd10Diagnosis" TEXT,
ADD COLUMN     "icd10Group" TEXT,
ADD COLUMN     "knownAllergies" TEXT,
ADD COLUMN     "oldPatient" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previousMedicalIssue" TEXT,
ADD COLUMN     "symptomDescription" TEXT,
ADD COLUMN     "symptomType" TEXT;
