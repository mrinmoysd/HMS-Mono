-- AlterTable
ALTER TABLE "opd_visit" ADD COLUMN     "icd10Diagnosis" TEXT,
ADD COLUMN     "icd10Group" TEXT,
ADD COLUMN     "knownAllergies" TEXT,
ADD COLUMN     "liveConsult" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previousMedicalIssue" TEXT,
ADD COLUMN     "symptomDescription" TEXT;
