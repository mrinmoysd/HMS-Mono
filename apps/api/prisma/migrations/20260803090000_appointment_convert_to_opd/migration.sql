-- Phase N1: an appointment can become an OPD visit (blueprint §9.1, §9.3).
--
-- No backfill: every existing appointment predates the conversion action, so
-- none of them were consumed and the column is correctly null for all of them.
ALTER TABLE "appointment" ADD COLUMN "opdVisitId" UUID;
