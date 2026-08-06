import { Injectable } from '@nestjs/common';
import { PREFIX_FIELDS, type PrefixRowDto, type PrefixUpdateInput } from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import type { RequestUser } from '../common/types/request-user';

/**
 * Prefix Setting, over the counters that already exist.
 *
 * `SequenceCounter` is per (branch, key) and already carries a `prefix` that
 * every generated number uses, so this screen edits live machinery rather than
 * a parallel copy. Two consequences worth stating:
 *
 *  · Changing a prefix affects only numbers minted from now on. Existing bills
 *    keep the number they were issued with — renumbering them would break every
 *    printed document and external reference that quotes one.
 *  · A counter row may not exist yet (nothing of that kind has been created).
 *    We show the code default and only write a row when an admin sets a value.
 */
@Injectable()
export class PrefixService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(branchId: string): Promise<PrefixRowDto[]> {
    const rows = await this.prisma.sequenceCounter.findMany({ where: { branchId } });
    const byKey = new Map(rows.map((r) => [r.key, r]));

    return PREFIX_FIELDS.map((f) => {
      const row = byKey.get(f.key);
      const prefix = row?.prefix || f.fallback;
      const next = row?.next ?? 1;
      return {
        key: f.key,
        label: f.label,
        prefix,
        // Show what the next number will actually look like — the fastest way
        // for an admin to see the effect of what they typed.
        nextExample: `${prefix}${String(next).padStart(6, '0')}`,
      };
    });
  }

  async update(actor: RequestUser, input: PrefixUpdateInput): Promise<PrefixRowDto[]> {
    const allowed = new Set(PREFIX_FIELDS.map((f) => f.key));
    const changes = input.prefixes.filter((p) => allowed.has(p.key as never));

    for (const c of changes) {
      await this.prisma.sequenceCounter.upsert({
        where: { branchId_key: { branchId: actor.branchId, key: c.key } },
        // `next: 1` on create — a counter that has never been used starts at 1.
        create: { branchId: actor.branchId, key: c.key, prefix: c.prefix, next: 1 },
        update: { prefix: c.prefix },
      });
    }

    await this.audit.record({
      branchId: actor.branchId,
      userId: actor.id,
      action: 'settings_update',
      entity: 'prefix',
      entityId: 'prefixes',
      after: { changed: changes.map((c) => `${c.key}=${c.prefix}`) },
    });

    return this.list(actor.branchId);
  }
}
