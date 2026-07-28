-- CreateTable
CREATE TABLE "charge_category" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "charge_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_type" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "charge_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_category" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tax_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_type" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "unit_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" UUID,
    "typeId" UUID,
    "unitId" UUID,
    "taxCategoryId" UUID,
    "standardCharge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "gridWidth" INTEGER NOT NULL DEFAULT 6,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "visibleTable" BOOLEAN NOT NULL DEFAULT false,
    "visiblePrint" BOOLEAN NOT NULL DEFAULT false,
    "visibleReport" BOOLEAN NOT NULL DEFAULT false,
    "visiblePatientPanel" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "custom_field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_template" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headerHtml" TEXT,
    "footerHtml" TEXT,
    "bodyHtml" TEXT NOT NULL DEFAULT '',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "print_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "charge_category_branchId_deletedAt_idx" ON "charge_category"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "charge_type_branchId_deletedAt_idx" ON "charge_type"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "tax_category_branchId_deletedAt_idx" ON "tax_category"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "unit_type_branchId_deletedAt_idx" ON "unit_type"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "charge_branchId_deletedAt_createdAt_idx" ON "charge"("branchId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "custom_field_branchId_entity_deletedAt_idx" ON "custom_field"("branchId", "entity", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_branchId_entity_key_key" ON "custom_field"("branchId", "entity", "key");

-- CreateIndex
CREATE INDEX "print_template_branchId_kind_deletedAt_idx" ON "print_template"("branchId", "kind", "deletedAt");

-- AddForeignKey
ALTER TABLE "charge" ADD CONSTRAINT "charge_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "charge_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge" ADD CONSTRAINT "charge_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "charge_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge" ADD CONSTRAINT "charge_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge" ADD CONSTRAINT "charge_taxCategoryId_fkey" FOREIGN KEY ("taxCategoryId") REFERENCES "tax_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
