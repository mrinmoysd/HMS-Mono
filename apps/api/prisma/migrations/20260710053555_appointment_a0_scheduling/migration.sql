-- CreateTable
CREATE TABLE "appointment_priority" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "appointment_priority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_shift" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "consultationDurationMinutes" INTEGER,
    "chargeId" UUID,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "doctor_shift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_priority_branchId_deletedAt_idx" ON "appointment_priority"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "doctor_shift_branchId_deletedAt_idx" ON "doctor_shift"("branchId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_shift_doctorId_shiftId_key" ON "doctor_shift"("doctorId", "shiftId");
