-- CreateTable
CREATE TABLE "nurse_note" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterType" TEXT,
    "encounterId" UUID,
    "nurseName" TEXT,
    "note" TEXT NOT NULL,
    "comment" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "nurse_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_register" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterType" TEXT,
    "encounterId" UUID,
    "doctorName" TEXT NOT NULL,
    "instruction" TEXT,
    "appliedDate" TIMESTAMP(3) NOT NULL,
    "consultantDate" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "consultant_register_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_transfer" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "ipdAdmissionId" UUID NOT NULL,
    "bedId" UUID NOT NULL,
    "bedLabel" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "toDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bed_transfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nurse_note_branchId_patientId_deletedAt_idx" ON "nurse_note"("branchId", "patientId", "deletedAt");

-- CreateIndex
CREATE INDEX "nurse_note_branchId_encounterType_encounterId_idx" ON "nurse_note"("branchId", "encounterType", "encounterId");

-- CreateIndex
CREATE INDEX "consultant_register_branchId_patientId_deletedAt_idx" ON "consultant_register"("branchId", "patientId", "deletedAt");

-- CreateIndex
CREATE INDEX "consultant_register_branchId_encounterType_encounterId_idx" ON "consultant_register"("branchId", "encounterType", "encounterId");

-- CreateIndex
CREATE INDEX "bed_transfer_branchId_ipdAdmissionId_idx" ON "bed_transfer"("branchId", "ipdAdmissionId");

-- AddForeignKey
ALTER TABLE "nurse_note" ADD CONSTRAINT "nurse_note_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_register" ADD CONSTRAINT "consultant_register_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
