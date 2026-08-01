-- CreateTable
CREATE TABLE "opd_checkup" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "visitId" UUID NOT NULL,
    "checkupNo" TEXT NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "consultantId" UUID NOT NULL,
    "reference" TEXT,
    "symptoms" TEXT,
    "findings" TEXT,
    "note" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "opd_checkup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "opd_checkup_visitId_deletedAt_idx" ON "opd_checkup"("visitId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "opd_checkup_branchId_checkupNo_key" ON "opd_checkup"("branchId", "checkupNo");

-- AddForeignKey
ALTER TABLE "opd_checkup" ADD CONSTRAINT "opd_checkup_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "opd_visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_checkup" ADD CONSTRAINT "opd_checkup_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: every existing visit gets one checkup.
--
-- The visit is the episode and the checkup is the patient being seen, so a
-- visit that predates this table still represents exactly one consultation.
-- Without a row here the new Visits tab would read as empty and "Total
-- Recheckup" would say 0 for every patient with history, which is worse than
-- wrong — it looks like the data was lost.
--
-- The checkup mirrors the visit's own consultant, date, reference and
-- symptoms. Soft-deleted visits are skipped: their checkup would never be
-- visible and would only consume CHKID numbers.
DO $$
DECLARE
  v          RECORD;
  seq_prefix TEXT;
  seq_next   INT;
BEGIN
  FOR v IN
    SELECT id, "branchId", "consultantId", "appointmentDate", reference, symptoms, "createdById"
      FROM opd_visit
     WHERE "deletedAt" IS NULL
     ORDER BY "appointmentDate", "createdAt"
  LOOP
    -- Mirrors SequenceService.next: increment, then read back; the number
    -- consumed is one less than the stored "next".
    UPDATE sequence_counter
       SET next = next + 1
     WHERE "branchId" = v."branchId" AND key = 'opd_checkup'
    RETURNING prefix, next INTO seq_prefix, seq_next;

    IF NOT FOUND THEN
      INSERT INTO sequence_counter (id, "branchId", key, prefix, next)
      VALUES (gen_random_uuid(), v."branchId", 'opd_checkup', 'CHKID', 2)
      RETURNING prefix, next INTO seq_prefix, seq_next;
    END IF;

    INSERT INTO opd_checkup (
      id, "branchId", "visitId", "checkupNo", "appointmentDate",
      "consultantId", reference, symptoms, "createdById", "createdAt", "updatedAt"
    )
    VALUES (
      gen_random_uuid(), v."branchId", v.id,
      COALESCE(NULLIF(seq_prefix, ''), 'CHKID') || LPAD((seq_next - 1)::TEXT, 6, '0'),
      v."appointmentDate", v."consultantId", v.reference, v.symptoms,
      v."createdById", NOW(), NOW()
    );
  END LOOP;
END $$;
