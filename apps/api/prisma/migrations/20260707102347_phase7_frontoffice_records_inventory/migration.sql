-- CreateTable
CREATE TABLE "visitor" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "purposeId" UUID,
    "name" TEXT NOT NULL,
    "visitTo" TEXT,
    "phone" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inTime" TIMESTAMP(3),
    "outTime" TIMESTAMP(3),
    "note" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_call" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "type" TEXT NOT NULL DEFAULT 'incoming',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "phone_call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postal_complaint" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "complaintTypeId" UUID,
    "source" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionTaken" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "postal_complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "birth_record" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "caseId" UUID,
    "childName" TEXT NOT NULL,
    "gender" "Gender",
    "birthDate" DATE NOT NULL,
    "motherName" TEXT,
    "fatherName" TEXT,
    "weight" TEXT,
    "address" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "birth_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "death_record" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "caseId" UUID,
    "patientName" TEXT NOT NULL,
    "guardianName" TEXT,
    "gender" "Gender",
    "deathDate" DATE NOT NULL,
    "cause" TEXT,
    "address" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "death_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'notice',
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "audience" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_share" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "contentTypeId" UUID,
    "sendToGroup" TEXT,
    "fileUrl" TEXT,
    "description" TEXT,
    "shareDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUpto" TIMESTAMP(3),
    "sharedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "content_share_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_item" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" UUID,
    "supplierId" UUID,
    "purchasePrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "inventory_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_stock" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "storeId" UUID,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,

    CONSTRAINT "item_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_issue" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "issuedTo" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,

    CONSTRAINT "item_issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_consultation" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'consultation',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER,
    "apiUsed" TEXT,
    "createdFor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "live_consultation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitor_branchId_deletedAt_date_idx" ON "visitor"("branchId", "deletedAt", "date");

-- CreateIndex
CREATE INDEX "phone_call_branchId_deletedAt_date_idx" ON "phone_call"("branchId", "deletedAt", "date");

-- CreateIndex
CREATE INDEX "postal_complaint_branchId_deletedAt_date_idx" ON "postal_complaint"("branchId", "deletedAt", "date");

-- CreateIndex
CREATE INDEX "birth_record_branchId_deletedAt_birthDate_idx" ON "birth_record"("branchId", "deletedAt", "birthDate");

-- CreateIndex
CREATE UNIQUE INDEX "birth_record_branchId_referenceNo_key" ON "birth_record"("branchId", "referenceNo");

-- CreateIndex
CREATE INDEX "death_record_branchId_deletedAt_deathDate_idx" ON "death_record"("branchId", "deletedAt", "deathDate");

-- CreateIndex
CREATE UNIQUE INDEX "death_record_branchId_referenceNo_key" ON "death_record"("branchId", "referenceNo");

-- CreateIndex
CREATE INDEX "notification_branchId_deletedAt_date_idx" ON "notification"("branchId", "deletedAt", "date");

-- CreateIndex
CREATE INDEX "content_share_branchId_deletedAt_shareDate_idx" ON "content_share"("branchId", "deletedAt", "shareDate");

-- CreateIndex
CREATE INDEX "inventory_item_branchId_deletedAt_idx" ON "inventory_item"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "item_stock_branchId_itemId_idx" ON "item_stock"("branchId", "itemId");

-- CreateIndex
CREATE INDEX "item_issue_branchId_itemId_idx" ON "item_issue"("branchId", "itemId");

-- CreateIndex
CREATE INDEX "live_consultation_branchId_kind_deletedAt_date_idx" ON "live_consultation"("branchId", "kind", "deletedAt", "date");

-- AddForeignKey
ALTER TABLE "item_stock" ADD CONSTRAINT "item_stock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_issue" ADD CONSTRAINT "item_issue_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
