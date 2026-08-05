-- Payments are voided, never erased.
--
-- removePayment used tx.payment.delete(), which destroyed the record of money
-- that had been taken and then reversed. A reversal is itself something the
-- ledger should be able to answer questions about, so the row now stays and
-- every read filters on deletedAt IS NULL.
ALTER TABLE "payment" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "payment_deletedAt_idx" ON "payment" ("deletedAt");
