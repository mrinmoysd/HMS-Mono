-- Phase I2: bed occupancy becomes a real append-only log (blueprint rule #8).
--
-- The table already existed as `bed_transfer`, but it only ever held rows once
-- somebody actually moved a patient. An admission wrote nothing, and a
-- discharge wrote nothing either — so the API synthesised the first row at read
-- time from the admission's *current* bed, and a transferred-then-discharged
-- patient was left with an open occupancy claiming they were still in the bed.
--
-- Renamed rather than replaced: the transfer rows already recorded are the only
-- true occupancy history that exists, and dropping them would lose it.

ALTER TABLE "bed_transfer" RENAME TO "bed_history";
ALTER INDEX "bed_transfer_branchId_ipdAdmissionId_idx" RENAME TO "bed_history_branchId_ipdAdmissionId_idx";
ALTER TABLE "bed_history" RENAME CONSTRAINT "bed_transfer_pkey" TO "bed_history_pkey";

-- 1. Close occupancies left open by a discharge that predates this change.
--    `toDate` is the discharge date, not now(): the bed was released then.
UPDATE "bed_history" h
SET "toDate" = a."dischargeDate", "active" = false
FROM "ipd_admission" a
WHERE h."ipdAdmissionId" = a.id
  AND h."active" = true
  AND a."status" = 'discharged'
  AND a."dischargeDate" IS NOT NULL;

-- 2. Give every admission that has no history at all its opening row, so the
--    read path can stop synthesising one. Uses the admission's current bed,
--    which for an untransferred admission is also its only bed. Soft-deleted
--    admissions are included on purpose — the log is append-only, and an
--    admission can be un-deleted.
INSERT INTO "bed_history" (
  "id", "branchId", "ipdAdmissionId", "bedId", "bedLabel",
  "fromDate", "toDate", "active", "createdById", "createdAt"
)
SELECT
  gen_random_uuid(),
  a."branchId",
  a."id",
  a."bedId",
  bg."name" || ' · ' || b."bedNo",
  a."admissionDate",
  CASE WHEN a."status" = 'discharged' THEN a."dischargeDate" END,
  a."status" <> 'discharged',
  a."createdById",
  now()
FROM "ipd_admission" a
JOIN "bed" b ON b."id" = a."bedId"
JOIN "bed_group" bg ON bg."id" = b."bedGroupId"
WHERE NOT EXISTS (
  SELECT 1 FROM "bed_history" h WHERE h."ipdAdmissionId" = a."id"
);
