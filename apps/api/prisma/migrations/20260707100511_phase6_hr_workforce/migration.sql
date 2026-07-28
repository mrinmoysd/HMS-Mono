-- CreateTable
CREATE TABLE "department" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designation" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "designation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "staffNo" TEXT NOT NULL,
    "departmentId" UUID,
    "designationId" UUID,
    "specialist" TEXT,
    "epfNo" TEXT,
    "basicSalary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "contractType" TEXT,
    "workShift" TEXT,
    "workLocation" TEXT,
    "dateOfJoining" TIMESTAMP(3),
    "fatherName" TEXT,
    "motherName" TEXT,
    "dob" TIMESTAMP(3),
    "gender" "Gender",
    "bloodGroup" TEXT,
    "maritalStatus" TEXT,
    "qualification" TEXT,
    "panNumber" TEXT,
    "nationalId" TEXT,
    "emergencyContact" TEXT,
    "currentAddress" TEXT,
    "permanentAddress" TEXT,
    "bankDetails" JSONB NOT NULL DEFAULT '{}',
    "socialLinks" JSONB NOT NULL DEFAULT '{}',
    "photoUrl" TEXT,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "staffUserId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "inTime" TIMESTAMP(3),
    "outTime" TIMESTAMP(3),
    "method" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'present',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duty_roster" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "staffUserId" UUID NOT NULL,
    "shiftId" UUID,
    "date" DATE NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duty_roster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "staffUserId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "gross" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "net" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_type" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "quota" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "leave_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_request" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "staffUserId" UUID NOT NULL,
    "leaveTypeId" UUID,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holiday" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'holiday',
    "title" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE,
    "description" TEXT,
    "frontSite" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "holiday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "department_branchId_deletedAt_idx" ON "department"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "designation_branchId_deletedAt_idx" ON "designation"("branchId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "staff_userId_key" ON "staff"("userId");

-- CreateIndex
CREATE INDEX "staff_branchId_deletedAt_idx" ON "staff"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "shift_branchId_deletedAt_idx" ON "shift"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "attendance_branchId_date_idx" ON "attendance"("branchId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_branchId_staffUserId_date_key" ON "attendance"("branchId", "staffUserId", "date");

-- CreateIndex
CREATE INDEX "duty_roster_branchId_date_idx" ON "duty_roster"("branchId", "date");

-- CreateIndex
CREATE INDEX "payroll_branchId_idx" ON "payroll"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_branchId_staffUserId_month_key" ON "payroll"("branchId", "staffUserId", "month");

-- CreateIndex
CREATE INDEX "leave_type_branchId_deletedAt_idx" ON "leave_type"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "leave_request_branchId_status_idx" ON "leave_request"("branchId", "status");

-- CreateIndex
CREATE INDEX "holiday_branchId_deletedAt_fromDate_idx" ON "holiday"("branchId", "deletedAt", "fromDate");

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duty_roster" ADD CONSTRAINT "duty_roster_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;
