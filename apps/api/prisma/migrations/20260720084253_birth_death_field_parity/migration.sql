-- AlterTable
ALTER TABLE "birth_record" ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "childPhotoUrl" TEXT,
ADD COLUMN     "documentUrl" TEXT,
ADD COLUMN     "fatherPhotoUrl" TEXT,
ADD COLUMN     "motherPhotoUrl" TEXT,
ADD COLUMN     "patientId" UUID,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "report" TEXT;

-- AlterTable
ALTER TABLE "death_record" ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "patientId" UUID;
