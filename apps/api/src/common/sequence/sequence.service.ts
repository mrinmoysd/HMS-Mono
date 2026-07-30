import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Generates human-readable, per-branch sequential IDs (patient no, case no…).
 * Atomic via an upsert + increment inside the caller's transaction when provided.
 * Prefixes are configurable (Setup → Prefix Setting); defaults applied here.
 */
const DEFAULT_PREFIXES: Record<string, string> = {
  patient: 'PT',
  case: 'CASE',
  appointment: 'APPT',
  opd: 'OPD',
  ipd: 'IPD',
  invoice: 'INV',
  pharmacy_bill: 'PHARMAB',
  pharmacy_purchase: 'PCHNO',
  pathology_bill: 'PATHOB',
  radiology_bill: 'RADIOB',
  blood_bill: 'BIB',
  ambulance_bill: 'ACB',
  income: 'INC',
  expense: 'EXP',
  staff: 'STF',
  birth: 'BR',
  death: 'DR',
};

@Injectable()
export class SequenceService {
  constructor(private readonly prisma: PrismaService) {}

  async next(
    branchId: string,
    key: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client = tx ?? this.prisma;
    const prefix = DEFAULT_PREFIXES[key] ?? key.toUpperCase();

    // Upsert then atomically increment; return the value we just consumed.
    const counter = await client.sequenceCounter.upsert({
      where: { branchId_key: { branchId, key } },
      create: { branchId, key, prefix, next: 2 },
      update: { next: { increment: 1 } },
    });
    // `next` is the post-write value (2 on create, incremented on update); the
    // number we just consumed is therefore next - 1.
    const consumed = counter.next - 1;
    return `${counter.prefix || prefix}${String(consumed).padStart(6, '0')}`;
  }

  /**
   * The number `next()` would hand out, without consuming it.
   *
   * For showing a bill/case number on a form before it is saved. It is a
   * preview, not a reservation: two forms open at once will show the same
   * number and the first to save wins, which is the same race the reference
   * screens have. Never persist this — persist what `next()` returns.
   */
  async peek(branchId: string, key: string): Promise<string> {
    const prefix = DEFAULT_PREFIXES[key] ?? key.toUpperCase();
    const counter = await this.prisma.sequenceCounter.findUnique({
      where: { branchId_key: { branchId, key } },
      select: { next: true, prefix: true },
    });
    const upcoming = counter?.next ?? 1;
    return `${counter?.prefix || prefix}${String(upcoming).padStart(6, '0')}`;
  }
}
