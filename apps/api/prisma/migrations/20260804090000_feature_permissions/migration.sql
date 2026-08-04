-- Feature-level permissions (R0.4).
--
-- ADDITIVE ONLY. The 116 existing module-level rows keep their ids, their
-- role_permission rows and their meaning. This migration makes room for the 751
-- feature rows alongside them; seed-permissions.ts inserts the data.
--
-- Module rows are retired per-module in R1, once no handler guards that module
-- coarsely. They are deliberately NOT recomputed from the feature rows: rolling
-- a group up ORs its features together, and a nurse who may delete an OPD
-- Timeline entry would come out holding opd:delete — the key guarding
-- DELETE /opd/:id, the whole visit. See docs/ROLE_PERMISSION_PARITY.md.

ALTER TABLE "permission" ADD COLUMN "feature" TEXT;

-- (module, action) is no longer unique: `opd:view` now appears on every one of
-- the 22 OPD feature rows as well as on the module row.
--
-- DROP INDEX, not DROP CONSTRAINT: Prisma's @@unique materialises as a plain
-- unique index here, and DROP CONSTRAINT errors on it. Leaving the old index in
-- place is not a harmless no-op — it silently rejects 740 of the 751 inserts.
DROP INDEX IF EXISTS "permission_module_action_key";

-- Uniqueness, split by row kind. Partial indexes rather than one constraint,
-- so each kind is guarded on its own terms and a NULL feature cannot smuggle
-- in a duplicate module row.
CREATE UNIQUE INDEX "permission_module_action_key"
  ON "permission" ("module", "action") WHERE "feature" IS NULL;

CREATE UNIQUE INDEX "permission_feature_action_key"
  ON "permission" ("feature", "action") WHERE "feature" IS NOT NULL;

CREATE INDEX "permission_module_action_idx" ON "permission" ("module", "action");
CREATE INDEX "permission_feature_idx" ON "permission" ("feature");
