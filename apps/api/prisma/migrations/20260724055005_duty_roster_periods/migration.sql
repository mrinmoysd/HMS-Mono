-- CreateTable
CREATE TABLE "roster" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "roster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_assignment" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "rosterId" UUID NOT NULL,
    "staffUserId" UUID NOT NULL,
    "floorId" UUID,
    "departmentId" UUID,
    "generatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "roster_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "roster_branchId_deletedAt_idx" ON "roster"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "roster_assignment_branchId_deletedAt_idx" ON "roster_assignment"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "roster_assignment_rosterId_idx" ON "roster_assignment"("rosterId");

-- AddForeignKey
ALTER TABLE "roster" ADD CONSTRAINT "roster_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignment" ADD CONSTRAINT "roster_assignment_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "roster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignment" ADD CONSTRAINT "roster_assignment_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignment" ADD CONSTRAINT "roster_assignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
