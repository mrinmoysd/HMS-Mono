-- CreateTable
CREATE TABLE "vital_type" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "refMin" DECIMAL(10,2),
    "refMax" DECIMAL(10,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vital_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_reading" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterType" TEXT,
    "encounterId" UUID,
    "vitalTypeId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,

    CONSTRAINT "vital_reading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finding_category" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "finding_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finding" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "categoryId" UUID,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finding_record" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterType" TEXT,
    "encounterId" UUID,
    "findingId" UUID,
    "text" TEXT NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "finding_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_head" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "symptom_head_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_type" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "headId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "symptom_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_record" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterType" TEXT,
    "encounterId" UUID,
    "symptomTypeId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "symptom_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_entry" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterType" TEXT,
    "encounterId" UUID,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "visibleToPatient" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "timeline_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vital_type_branchId_deletedAt_idx" ON "vital_type"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "vital_reading_branchId_patientId_recordedAt_idx" ON "vital_reading"("branchId", "patientId", "recordedAt");

-- CreateIndex
CREATE INDEX "finding_category_branchId_deletedAt_idx" ON "finding_category"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "finding_branchId_deletedAt_idx" ON "finding"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "finding_record_branchId_patientId_deletedAt_idx" ON "finding_record"("branchId", "patientId", "deletedAt");

-- CreateIndex
CREATE INDEX "symptom_head_branchId_deletedAt_idx" ON "symptom_head"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "symptom_type_branchId_deletedAt_idx" ON "symptom_type"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "symptom_record_branchId_patientId_deletedAt_idx" ON "symptom_record"("branchId", "patientId", "deletedAt");

-- CreateIndex
CREATE INDEX "timeline_entry_branchId_patientId_deletedAt_date_idx" ON "timeline_entry"("branchId", "patientId", "deletedAt", "date");

-- AddForeignKey
ALTER TABLE "vital_reading" ADD CONSTRAINT "vital_reading_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_reading" ADD CONSTRAINT "vital_reading_vitalTypeId_fkey" FOREIGN KEY ("vitalTypeId") REFERENCES "vital_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finding" ADD CONSTRAINT "finding_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "finding_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finding_record" ADD CONSTRAINT "finding_record_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finding_record" ADD CONSTRAINT "finding_record_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "finding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_type" ADD CONSTRAINT "symptom_type_headId_fkey" FOREIGN KEY ("headId") REFERENCES "symptom_head"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_record" ADD CONSTRAINT "symptom_record_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_record" ADD CONSTRAINT "symptom_record_symptomTypeId_fkey" FOREIGN KEY ("symptomTypeId") REFERENCES "symptom_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entry" ADD CONSTRAINT "timeline_entry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
