import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { SettingsCrypto } from './settings.crypto';
import type { RequestUser } from '../common/types/request-user';

/**
 * Typed read/write over the `setting` table.
 *
 * Every caller goes through a Zod schema, so a value read out of the database
 * has the same shape the code expects even if the row was written by an older
 * version of the app — the schema's defaults fill the gaps. That is why `get`
 * takes the schema rather than trusting the stored JSON.
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly crypto: SettingsCrypto,
  ) {}

  /**
   * Read one setting, parsed and defaulted.
   *
   * A missing row is not an error: the schema parses `{}` and every field's
   * default applies. That is what makes a fresh install work with no seeding,
   * and what stops a half-filled row from crashing a page.
   */
  async get<S extends z.ZodTypeAny>(branchId: string, key: string, schema: S): Promise<z.infer<S>> {
    const row = await this.prisma.setting.findUnique({ where: { branchId_key: { branchId, key } } });
    const parsed = schema.safeParse(row?.value ?? {});
    if (parsed.success) return parsed.data;
    // A stored value that no longer fits its schema (a field was tightened, a
    // row was hand-edited) must not take the screen down. Fall back to the
    // defaults and let the admin re-save.
    return schema.parse({});
  }

  /** Write one setting. The value is validated before it is stored, not after. */
  async set<S extends z.ZodTypeAny>(
    actor: RequestUser,
    key: string,
    schema: S,
    value: unknown,
    opts: { isSecret?: boolean } = {},
  ): Promise<z.infer<S>> {
    const parsed = schema.parse(value) as z.infer<S>;
    const stored = opts.isSecret ? this.encryptStrings(parsed) : parsed;

    await this.prisma.setting.upsert({
      where: { branchId_key: { branchId: actor.branchId, key } },
      create: {
        branchId: actor.branchId,
        key,
        value: stored as object,
        isSecret: !!opts.isSecret,
        updatedBy: actor.id,
      },
      update: { value: stored as object, isSecret: !!opts.isSecret, updatedBy: actor.id },
    });

    // The audit row records THAT a setting changed and by whom, never the
    // value: settings hold credentials, and an audit log that captures them
    // just moves the secret somewhere with weaker access control.
    await this.audit.record({
      branchId: actor.branchId,
      userId: actor.id,
      action: 'settings_update',
      entity: 'setting',
      entityId: key,
      after: { key },
    });

    return parsed;
  }

  secretsConfigured(): boolean {
    return this.crypto.isConfigured();
  }

  /** Encrypt every string field of a secret payload, leaving other types alone. */
  private encryptStrings<T>(value: T): T {
    if (typeof value !== 'object' || value === null) return value;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = typeof v === 'string' && v.length > 0 ? this.crypto.encrypt(v) : v;
    }
    return out as T;
  }
}
