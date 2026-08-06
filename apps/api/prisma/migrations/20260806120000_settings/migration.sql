-- Settings store (phase G0).
--
-- Additive only. Nothing reads this table until the settings screens land, so
-- deploying it ahead of them is safe and keeps the migration small.
CREATE TABLE "setting" (
    "id"        UUID NOT NULL,
    "branchId"  UUID NOT NULL,
    "key"       TEXT NOT NULL,
    "value"     JSONB NOT NULL,
    "isSecret"  BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "setting_pkey" PRIMARY KEY ("id")
);

-- One row per key per branch: the service upserts on this.
CREATE UNIQUE INDEX "setting_branchId_key_key" ON "setting"("branchId", "key");
CREATE INDEX "setting_branchId_idx" ON "setting"("branchId");
