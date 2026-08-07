-- Generated numbers for Prescription and Payment (Settings parity, G2).
--
-- Both are nullable with no backfill, deliberately. A prescription printed
-- last month has no IPDP number on the paper in the patient's file; writing
-- one into the row now would create a number that matches no document.
-- Rows created from here on carry one.
ALTER TABLE "prescription" ADD COLUMN "prescriptionNo" TEXT;
ALTER TABLE "payment" ADD COLUMN "transactionNo" TEXT;

-- Looked up when reprinting or reconciling, so they are worth an index. Not
-- unique: the counter is per branch, and these tables are not branch-scoped
-- at the row level in every case.
CREATE INDEX "prescription_prescriptionNo_idx" ON "prescription" ("prescriptionNo");
CREATE INDEX "payment_transactionNo_idx" ON "payment" ("transactionNo");
