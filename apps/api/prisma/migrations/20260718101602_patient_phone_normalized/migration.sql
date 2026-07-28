-- AlterTable
ALTER TABLE "patient" ADD COLUMN     "phoneNormalized" TEXT;

-- Backfill existing rows: digits-only, mirrors canonicalizePhone() in @smart-hospital/shared.
-- Empty result (no digits) collapses back to NULL.
UPDATE "patient"
SET "phoneNormalized" = NULLIF(regexp_replace("phone", '\D', '', 'g'), '')
WHERE "phone" IS NOT NULL;

-- CreateIndex
CREATE INDEX "patient_branchId_phoneNormalized_idx" ON "patient"("branchId", "phoneNormalized");
