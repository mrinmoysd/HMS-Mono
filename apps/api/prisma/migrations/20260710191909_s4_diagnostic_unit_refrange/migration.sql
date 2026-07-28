-- CreateTable
CREATE TABLE "diagnostic_unit" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "modality" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "diagnostic_unit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diagnostic_unit_branchId_modality_deletedAt_idx" ON "diagnostic_unit"("branchId", "modality", "deletedAt");

-- AlterTable: add new columns first so we can backfill before dropping the old free-text `unit`
ALTER TABLE "diagnostic_test"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "refMax" DECIMAL(10,2),
  ADD COLUMN "refMin" DECIMAL(10,2),
  ADD COLUMN "unitId" UUID;

-- Backfill: turn each distinct existing free-text `unit` value into a
-- DiagnosticUnit row (per branch+modality) and point the test row at it, so
-- no data is silently lost by the free-text -> FK migration.
INSERT INTO "diagnostic_unit" ("id", "branchId", "modality", "name", "updatedAt")
SELECT gen_random_uuid(), t."branchId", t."modality", t."unit", CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "branchId", "modality", "unit" FROM "diagnostic_test" WHERE "unit" IS NOT NULL) t;

UPDATE "diagnostic_test" AS dt
SET "unitId" = du."id"
FROM "diagnostic_unit" du
WHERE du."branchId" = dt."branchId" AND du."modality" = dt."modality" AND du."name" = dt."unit";

-- AlterTable
ALTER TABLE "diagnostic_test" DROP COLUMN "unit";

-- AddForeignKey
ALTER TABLE "diagnostic_test" ADD CONSTRAINT "diagnostic_test_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "diagnostic_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
