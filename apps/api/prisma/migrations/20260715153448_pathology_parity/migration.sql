-- AlterTable
ALTER TABLE "diagnostic_test" ADD COLUMN     "chargeId" UUID,
ADD COLUMN     "method" TEXT,
ADD COLUMN     "reportDays" INTEGER DEFAULT 1,
ADD COLUMN     "shortName" TEXT,
ADD COLUMN     "subCategory" TEXT,
ADD COLUMN     "testType" TEXT;

-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "prescriptionNo" TEXT,
ADD COLUMN     "referenceDoctor" TEXT;

-- AlterTable
ALTER TABLE "lab_investigation" ADD COLUMN     "invoiceId" UUID,
ADD COLUMN     "invoiceItemId" UUID,
ADD COLUMN     "netAmount" DECIMAL(14,2),
ADD COLUMN     "tax" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "diagnostic_test_parameter" (
    "id" UUID NOT NULL,
    "testId" UUID NOT NULL,
    "parameterName" TEXT NOT NULL,
    "referenceRange" TEXT,
    "unit" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_test_parameter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diagnostic_test_parameter_testId_idx" ON "diagnostic_test_parameter"("testId");

-- AddForeignKey
ALTER TABLE "diagnostic_test" ADD CONSTRAINT "diagnostic_test_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "charge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_test_parameter" ADD CONSTRAINT "diagnostic_test_parameter_testId_fkey" FOREIGN KEY ("testId") REFERENCES "diagnostic_test"("id") ON DELETE CASCADE ON UPDATE CASCADE;
