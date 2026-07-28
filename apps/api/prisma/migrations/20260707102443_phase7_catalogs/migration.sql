-- CreateTable
CREATE TABLE "front_office_purpose" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "front_office_purpose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_type" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "complaint_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_type" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "content_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_category" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "item_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_store" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "item_store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_supplier" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "item_supplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "front_office_purpose_branchId_deletedAt_idx" ON "front_office_purpose"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "complaint_type_branchId_deletedAt_idx" ON "complaint_type"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "content_type_branchId_deletedAt_idx" ON "content_type"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "item_category_branchId_deletedAt_idx" ON "item_category"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "item_store_branchId_deletedAt_idx" ON "item_store"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "item_supplier_branchId_deletedAt_idx" ON "item_supplier"("branchId", "deletedAt");
