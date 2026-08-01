-- Split the per-patient singleton Case into one Case per encounter.
--
-- Until now a Case was opened at patient registration and every OPD visit and
-- IPD admission for that patient attached to it, so one patient had exactly
-- one case for life. The Case ID is the join key for the whole record, so a
-- constant carried no information: the Patient Details report could not tell
-- one visit's bills from another's, and the Overview progress bars summed a
-- patient's entire history instead of the encounter in front of you.
--
-- Cases are now minted by the encounter (see common/case.ts). This backfills
-- the existing rows to match.
--
-- Rules, in order:
--   1. Each patient's earliest encounter keeps the case it already has, so
--      existing Case IDs stay printed on the documents that quote them.
--   2. Every later encounter gets a freshly minted case.
--   3. Except an IPD admission created by Move-to-IPD — it takes its source
--      OPD visit's case, because an outpatient becoming an inpatient is one
--      episode (blueprint rule #13). These are identified by the
--      `movedFromOpdId` marker the move writes into customFields.
--
-- Bills follow their encounter only where the link is unambiguous: an OPD
-- visit owns its invoice through opd_visit."invoiceId". IPD invoices are
-- matched by case + module with no per-admission column, and ancillary bills
-- (pharmacy, pathology, radiology, blood bank, ambulance) were raised against
-- the patient's case rather than a named visit. Both stay on the original
-- case rather than being guessed at — that case is still the one the earliest
-- encounter holds, so nothing is orphaned and nothing is misattributed.

DO $$
DECLARE
  enc      RECORD;
  new_case_id   UUID;
  new_case_no   TEXT;
  seq_prefix    TEXT;
  seq_next      INT;
BEGIN
  -- Walk every encounter that is not the patient's first, oldest first, so a
  -- Move-to-IPD admission is always processed after the visit it came from.
  --
  -- Soft-deleted encounters are included deliberately. They still hold a case,
  -- and a deleted OPD visit can still be the source a live admission was moved
  -- from. Ranking only live rows let a deleted visit keep the original case,
  -- hand it to the admission that moved out of it, *and* leave a later live
  -- visit holding that same case — the exact collision this migration exists
  -- to remove.
  FOR enc IN
    WITH encounters AS (
      SELECT o.id,
             'opd'::TEXT           AS kind,
             o."branchId",
             o."patientId",
             o."caseId",
             o."appointmentDate"   AS at,
             o."createdAt",
             NULL::TEXT            AS moved_from
        FROM opd_visit o
      UNION ALL
      SELECT i.id,
             'ipd'::TEXT,
             i."branchId",
             i."patientId",
             i."caseId",
             i."admissionDate",
             i."createdAt",
             i."customFields" ->> 'movedFromOpdId'
        FROM ipd_admission i
    ), ranked AS (
      SELECT e.*,
             ROW_NUMBER() OVER (
               PARTITION BY e."patientId"
               -- Moved admissions are excluded from the ranking entirely
               -- (below), so this ordering only decides which *independent*
               -- encounter is the patient's first.
               ORDER BY e.at, e."createdAt"
             ) AS rn
        FROM encounters e
       WHERE e.moved_from IS NULL
    )
    SELECT id, kind, "branchId", "patientId", NULL::TEXT AS moved_from
      FROM ranked
     WHERE rn > 1
    UNION ALL
    SELECT e.id, e.kind, e."branchId", e."patientId", e.moved_from
      FROM encounters e
     WHERE e.moved_from IS NOT NULL
    ORDER BY 5 NULLS FIRST
  LOOP
    IF enc.moved_from IS NOT NULL THEN
      -- Rule 3: inherit the source visit's case, whatever it ended up being.
      SELECT o."caseId" INTO new_case_id
        FROM opd_visit o
       WHERE o.id = enc.moved_from::UUID;

      -- A dangling marker (source visit hard-deleted) falls through to a
      -- fresh case rather than leaving the admission on a case it no longer
      -- shares with anything.
      IF new_case_id IS NOT NULL THEN
        UPDATE ipd_admission SET "caseId" = new_case_id WHERE id = enc.id;
        CONTINUE;
      END IF;
    END IF;

    -- Rule 2: mint a case, drawing the number from the same counter the
    -- application uses so these cannot collide with future ones.
    --
    -- This mirrors SequenceService.next exactly: increment first, then read
    -- back the post-write value, of which the number just consumed is one
    -- less. Reading before incrementing would re-issue a number that is
    -- already on a case.
    UPDATE sequence_counter
       SET next = next + 1
     WHERE "branchId" = enc."branchId" AND key = 'case'
    RETURNING prefix, next INTO seq_prefix, seq_next;

    IF NOT FOUND THEN
      INSERT INTO sequence_counter ("id", "branchId", key, prefix, next)
      VALUES (gen_random_uuid(), enc."branchId", 'case', 'CASE', 2)
      RETURNING prefix, next INTO seq_prefix, seq_next;
    END IF;

    new_case_no := COALESCE(NULLIF(seq_prefix, ''), 'CASE') || LPAD((seq_next - 1)::TEXT, 6, '0');
    new_case_id := gen_random_uuid();

    INSERT INTO patient_case (id, "branchId", "patientId", "caseNo", type, status, "openedAt", "createdAt")
    VALUES (new_case_id, enc."branchId", enc."patientId", new_case_no, enc.kind, 'open', NOW(), NOW());

    IF enc.kind = 'opd' THEN
      UPDATE opd_visit SET "caseId" = new_case_id WHERE id = enc.id;
      -- The visit owns its invoice outright, so that bill moves with it.
      UPDATE invoice
         SET "caseId" = new_case_id
       WHERE id = (SELECT o."invoiceId" FROM opd_visit o WHERE o.id = enc.id);
    ELSE
      UPDATE ipd_admission SET "caseId" = new_case_id WHERE id = enc.id;
    END IF;
  END LOOP;
END $$;
