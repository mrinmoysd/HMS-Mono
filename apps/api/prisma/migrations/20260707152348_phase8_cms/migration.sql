-- CreateTable
CREATE TABLE "cms_page" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pageType" TEXT NOT NULL DEFAULT 'standard',
    "body" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cms_page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_banner" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "link" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cms_banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_menu" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cms_menu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cms_page_branchId_deletedAt_idx" ON "cms_page"("branchId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "cms_page_branchId_slug_key" ON "cms_page"("branchId", "slug");

-- CreateIndex
CREATE INDEX "cms_banner_branchId_deletedAt_idx" ON "cms_banner"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "cms_menu_branchId_deletedAt_idx" ON "cms_menu"("branchId", "deletedAt");
