-- AlterTable
ALTER TABLE "prescription" ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "findingCategoryId" UUID,
ADD COLUMN     "findingDescription" TEXT,
ADD COLUMN     "findingList" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "findingPrint" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "footerNote" TEXT,
ADD COLUMN     "headerNote" TEXT,
ADD COLUMN     "notifyRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pathologyTestIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "radiologyTestIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
