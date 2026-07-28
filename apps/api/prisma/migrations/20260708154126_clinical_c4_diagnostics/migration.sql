-- CreateTable
CREATE TABLE "lab_investigation" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterType" TEXT,
    "encounterId" UUID,
    "modality" TEXT NOT NULL,
    "testId" UUID,
    "testName" TEXT NOT NULL,
    "unit" TEXT,
    "referenceRange" TEXT,
    "reportValue" TEXT,
    "previousValue" TEXT,
    "sampleDate" TIMESTAMP(3),
    "expectedDate" TIMESTAMP(3),
    "center" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "lab_investigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterType" TEXT,
    "encounterId" UUID,
    "prescribedById" UUID,
    "symptoms" TEXT,
    "findings" TEXT,
    "note" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_item" (
    "id" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "medicineId" UUID,
    "medicineName" TEXT NOT NULL,
    "dosage" TEXT,
    "interval" TEXT,
    "duration" TEXT,
    "instruction" TEXT,

    CONSTRAINT "prescription_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_dose" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterType" TEXT,
    "encounterId" UUID,
    "medicineId" UUID,
    "medicineName" TEXT NOT NULL,
    "dosage" TEXT,
    "dateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "medication_dose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lab_investigation_branchId_patientId_deletedAt_idx" ON "lab_investigation"("branchId", "patientId", "deletedAt");

-- CreateIndex
CREATE INDEX "lab_investigation_branchId_encounterType_encounterId_idx" ON "lab_investigation"("branchId", "encounterType", "encounterId");

-- CreateIndex
CREATE INDEX "prescription_branchId_patientId_deletedAt_idx" ON "prescription"("branchId", "patientId", "deletedAt");

-- CreateIndex
CREATE INDEX "prescription_branchId_encounterType_encounterId_idx" ON "prescription"("branchId", "encounterType", "encounterId");

-- CreateIndex
CREATE INDEX "prescription_item_prescriptionId_idx" ON "prescription_item"("prescriptionId");

-- CreateIndex
CREATE INDEX "medication_dose_branchId_patientId_deletedAt_idx" ON "medication_dose"("branchId", "patientId", "deletedAt");

-- CreateIndex
CREATE INDEX "medication_dose_branchId_encounterType_encounterId_idx" ON "medication_dose"("branchId", "encounterType", "encounterId");

-- AddForeignKey
ALTER TABLE "lab_investigation" ADD CONSTRAINT "lab_investigation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription" ADD CONSTRAINT "prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_item" ADD CONSTRAINT "prescription_item_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_dose" ADD CONSTRAINT "medication_dose_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
