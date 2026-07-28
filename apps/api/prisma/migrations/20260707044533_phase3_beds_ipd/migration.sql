-- CreateTable
CREATE TABLE "floor" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_type" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "bed_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_group" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "floorId" UUID,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "bed_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "bedGroupId" UUID NOT NULL,
    "bedTypeId" UUID,
    "bedNo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "bed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipd_admission" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "ipdNo" TEXT NOT NULL,
    "patientId" UUID NOT NULL,
    "caseId" UUID,
    "consultantId" UUID NOT NULL,
    "admissionDate" TIMESTAMP(3) NOT NULL,
    "bedId" UUID NOT NULL,
    "creditLimit" DECIMAL(14,2) NOT NULL DEFAULT 20000,
    "isAntenatal" BOOLEAN NOT NULL DEFAULT false,
    "reference" TEXT,
    "symptoms" TEXT,
    "note" TEXT,
    "liveConsult" BOOLEAN NOT NULL DEFAULT false,
    "dischargeDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'admitted',
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ipd_admission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "floor_branchId_deletedAt_idx" ON "floor"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "bed_type_branchId_deletedAt_idx" ON "bed_type"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "bed_group_branchId_deletedAt_idx" ON "bed_group"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "bed_branchId_deletedAt_idx" ON "bed"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "bed_branchId_status_idx" ON "bed"("branchId", "status");

-- CreateIndex
CREATE INDEX "ipd_admission_branchId_status_deletedAt_idx" ON "ipd_admission"("branchId", "status", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ipd_admission_branchId_ipdNo_key" ON "ipd_admission"("branchId", "ipdNo");

-- AddForeignKey
ALTER TABLE "bed_group" ADD CONSTRAINT "bed_group_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed" ADD CONSTRAINT "bed_bedGroupId_fkey" FOREIGN KEY ("bedGroupId") REFERENCES "bed_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed" ADD CONSTRAINT "bed_bedTypeId_fkey" FOREIGN KEY ("bedTypeId") REFERENCES "bed_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "patient_case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "bed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
