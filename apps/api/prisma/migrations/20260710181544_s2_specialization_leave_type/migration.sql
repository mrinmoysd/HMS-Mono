-- CreateTable
CREATE TABLE "specialization" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "specialization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "specialization_branchId_deletedAt_idx" ON "specialization"("branchId", "deletedAt");

-- AlterTable: add the new FK column first so we can backfill before dropping the old free-text one
ALTER TABLE "staff" ADD COLUMN "specialistId" UUID;

-- Backfill: turn each distinct existing free-text `specialist` value into a
-- Specialization row (per branch) and point the staff row at it, so no data
-- is silently lost by the free-text -> FK migration.
INSERT INTO "specialization" ("id", "branchId", "name", "updatedAt")
SELECT gen_random_uuid(), s."branchId", s."specialist", CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "branchId", "specialist" FROM "staff" WHERE "specialist" IS NOT NULL) s;

UPDATE "staff" AS st
SET "specialistId" = sp."id"
FROM "specialization" sp
WHERE sp."branchId" = st."branchId" AND sp."name" = st."specialist";

-- AlterTable
ALTER TABLE "staff" DROP COLUMN "specialist";

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "specialization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
