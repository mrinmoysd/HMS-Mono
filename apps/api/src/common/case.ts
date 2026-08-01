import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { SequenceService } from './sequence/sequence.service';

/**
 * Resolve the Case a new encounter files under.
 *
 * The Case ID is the spine of the record: every OPD visit, IPD admission and
 * downstream bill (pharmacy, pathology, radiology, blood bank, ambulance)
 * carries it, and that is the only join tying a patient's clinical and
 * financial history together. So it is minted *here* — at the encounter —
 * rather than at patient registration. A patient with no visits has no case,
 * and a second visit is a second case unless the user deliberately continues
 * an existing one by typing its number into the form's Case field.
 *
 * Two callers pass a case in rather than minting one:
 *   - the New Visit / Admission form, when the user names an existing case;
 *   - Move-to-IPD, which must reuse the OPD visit's case — an outpatient
 *     becoming an inpatient is one episode, and minting a second case there
 *     would split that patient's billing in half.
 */
export async function resolveCaseId(
  tx: Prisma.TransactionClient,
  sequence: SequenceService,
  branchId: string,
  patientId: string,
  opts: { caseNo?: string; caseId?: string } = {},
): Promise<string> {
  // An internal caller (Move-to-IPD) hands us the case directly.
  if (opts.caseId) {
    const byId = await tx.patientCase.findFirst({
      where: { id: opts.caseId, branchId },
    });
    if (!byId) throw new BadRequestException('Case not found');
    return byId.id;
  }

  // The user typed a case number on the form.
  const caseNo = opts.caseNo?.trim();
  if (caseNo) {
    const existing = await tx.patientCase.findFirst({
      where: { branchId, caseNo, patientId },
    });
    // Scoped to the patient on purpose: filing one patient's visit under
    // another's case would silently merge two people's billing.
    if (!existing) {
      throw new BadRequestException(`No case ${caseNo} for this patient`);
    }
    return existing.id;
  }

  const next = await sequence.next(branchId, 'case', tx);
  const created = await tx.patientCase.create({
    data: { branchId, patientId, caseNo: next, type: 'general' },
  });
  return created.id;
}
