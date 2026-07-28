-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateTable
CREATE TABLE "tpa" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tpa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "patientNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "guardianName" TEXT,
    "gender" "Gender",
    "dob" TIMESTAMP(3),
    "age" TEXT NOT NULL,
    "bloodGroup" TEXT,
    "maritalStatus" TEXT,
    "photoUrl" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "allergies" TEXT,
    "prevMedicalIssue" TEXT,
    "remarks" TEXT,
    "tpaId" UUID,
    "tpaIdNo" TEXT,
    "tpaValidity" TIMESTAMP(3),
    "nationalId" TEXT,
    "alternateNo" TEXT,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "isDeceased" BOOLEAN NOT NULL DEFAULT false,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_case" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "caseNo" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'open',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_counter" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '',
    "next" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "sequence_counter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tpa_branchId_deletedAt_idx" ON "tpa"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "patient_branchId_deletedAt_createdAt_idx" ON "patient"("branchId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "patient_branchId_name_idx" ON "patient"("branchId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "patient_branchId_patientNo_key" ON "patient"("branchId", "patientNo");

-- CreateIndex
CREATE INDEX "patient_case_patientId_idx" ON "patient_case"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_case_branchId_caseNo_key" ON "patient_case"("branchId", "caseNo");

-- CreateIndex
CREATE UNIQUE INDEX "sequence_counter_branchId_key_key" ON "sequence_counter"("branchId", "key");

-- AddForeignKey
ALTER TABLE "patient" ADD CONSTRAINT "patient_tpaId_fkey" FOREIGN KEY ("tpaId") REFERENCES "tpa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_case" ADD CONSTRAINT "patient_case_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
