import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ACTIONS,
  FEATURES,
  FEATURE_GROUPS,
  ROLE_META,
  type ActionKey,
  type EditableRoleDto,
  type RoleKey,
  type RolePermissionsDto,
  type RolePermissionsUpdateInput,
  type RolePermissionsUpdateResultDto,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import type { RequestUser } from '../common/types/request-user';

/**
 * Reads and writes the feature-level permission grid behind the editor.
 *
 * Two roles are never editable, for different reasons:
 *
 *  · **super_admin** has no permission row at all. It bypasses every check by
 *    design (parity doc, Part I §1), so its checkboxes would be decoration —
 *    ticked or not, the answer is yes. Rendering them would be a lie.
 *  · **patient** is the portal role. Its boundary is ownership of records,
 *    enforced in PortalService.requirePatient, not feature grants. Its
 *    checkboxes would have no effect on anything.
 *
 * Everything else about this service is ordinary except the write path, which
 * refuses more than it accepts — see `update`.
 */
@Injectable()
export class RolePermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private static readonly UNEDITABLE: Record<string, string> = {
    super_admin: 'Super Admin bypasses every permission check and has no permission row to edit.',
    patient: 'The patient portal is scoped to a patient’s own records, not to feature grants.',
  };

  /** The role picker: every role, with its current tick count. */
  async listRoles(): Promise<EditableRoleDto[]> {
    const roles = await this.prisma.role.findMany({ orderBy: { createdAt: 'asc' } });
    const total = this.totalToggles();

    const out: EditableRoleDto[] = [];
    for (const role of roles) {
      const reason = RolePermissionsService.UNEDITABLE[role.slug];
      out.push({
        slug: role.slug,
        label: ROLE_META[role.slug as RoleKey]?.label ?? role.label,
        editable: !reason,
        reason,
        // Super Admin holds everything implicitly; showing 0 would misread.
        allowedCount: role.slug === 'super_admin' ? total : await this.allowedCount(role.id),
        totalCount: total,
      });
    }
    return out;
  }

  /** The full grid for one role: 36 groups, every feature, every toggle. */
  async get(slug: string): Promise<RolePermissionsDto> {
    const role = await this.requireRole(slug);
    const allowed = await this.allowedSet(role.id);

    const groups = FEATURE_GROUPS.map((group) => ({
      key: group.key,
      label: group.label,
      module: group.module ?? null,
      features: group.features.map((f) => ({
        key: f.key,
        label: f.label,
        actions: [...f.actions],
        // Super Admin holds everything; anything else comes from the database.
        allowed:
          slug === 'super_admin'
            ? [...f.actions]
            : f.actions.filter((a) => allowed.has(`${f.key}:${a}`)),
      })),
    }));

    const allowedCount = groups.reduce((n, g) => n + g.features.reduce((m, f) => m + f.allowed.length, 0), 0);
    return {
      role: role.slug,
      label: ROLE_META[role.slug as RoleKey]?.label ?? role.label,
      groups,
      allowedCount,
      totalCount: this.totalToggles(),
    };
  }

  /**
   * Apply a set of toggles.
   *
   * A change is rejected, not silently dropped, when it names a feature that
   * does not exist or an action that feature does not expose. That second case
   * is the one worth having: a feature exposes exactly the toggles Admin holds,
   * so granting `edit` on a view-only feature would write a row that can never
   * match a guard — the permission would appear ticked in the UI and do nothing.
   * That is precisely the bug the R5 matrix caught in Multi Branch, and it
   * should not be possible to reintroduce it through a screen.
   */
  async update(
    actor: RequestUser,
    slug: string,
    input: RolePermissionsUpdateInput,
  ): Promise<RolePermissionsUpdateResultDto> {
    const reason = RolePermissionsService.UNEDITABLE[slug];
    if (reason) throw new ForbiddenException(reason);

    const role = await this.requireRole(slug);
    const byKey = new Map(FEATURES.map((f) => [f.key, f]));

    const rejected: RolePermissionsUpdateResultDto['rejected'] = [];
    const wanted = new Map<string, boolean>();
    for (const c of input.changes) {
      const def = byKey.get(c.feature);
      if (!def) {
        rejected.push({ feature: c.feature, action: c.action, reason: 'no such feature' });
        continue;
      }
      if (!def.actions.includes(c.action)) {
        rejected.push({
          feature: c.feature,
          action: c.action,
          reason: `this feature exposes only: ${def.actions.join(', ')}`,
        });
        continue;
      }
      wanted.set(`${c.feature}:${c.action}`, c.allowed);
    }

    if (wanted.size === 0) {
      throw new BadRequestException(
        rejected.length ? `No valid changes. First problem: ${rejected[0]!.reason}` : 'No changes supplied',
      );
    }

    // Resolve to permission ids in one query rather than per change.
    const perms = await this.prisma.permission.findMany({
      where: { feature: { in: [...new Set([...wanted.keys()].map((k) => k.split(':')[0]!))] } },
    });
    const idByKey = new Map(perms.map((p) => [`${p.feature}:${p.action}`, p.id]));

    const before = await this.allowedSet(role.id);
    const ops = [];
    for (const [key, allow] of wanted) {
      const permissionId = idByKey.get(key);
      if (!permissionId) {
        rejected.push({
          feature: key.split(':')[0]!,
          action: key.split(':')[1] as ActionKey,
          reason: 'permission row missing — run the feature-permission seed',
        });
        continue;
      }
      ops.push(
        this.prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId } },
          create: { roleId: role.id, permissionId, allowed: allow },
          update: { allowed: allow },
        }),
      );
    }
    await this.prisma.$transaction(ops);

    const after = await this.allowedSet(role.id);
    const granted = [...after].filter((k) => !before.has(k)).sort();
    const revoked = [...before].filter((k) => !after.has(k)).sort();

    // One audit row per save, carrying the actual delta. A save that changed
    // nothing still records — "someone opened this and pressed save" is worth
    // knowing when you are reading back how a role ended up as it is.
    await this.audit.record({
      branchId: actor.branchId,
      userId: actor.id,
      action: 'permissions_update',
      entity: 'role',
      entityId: role.id,
      after: { role: role.slug, granted, revoked },
    });

    return {
      role: role.slug,
      applied: ops.length,
      rejected,
      allowedCount: after.size,
      totalCount: this.totalToggles(),
    };
  }

  private totalToggles(): number {
    return FEATURES.reduce((n, f) => n + f.actions.length, 0);
  }

  private async requireRole(slug: string) {
    const role = await this.prisma.role.findUnique({ where: { slug } });
    if (!role) throw new NotFoundException(`No such role: ${slug}`);
    return role;
  }

  private async allowedSet(roleId: string): Promise<Set<string>> {
    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId, allowed: true, permission: { feature: { not: null } } },
      select: { permission: { select: { feature: true, action: true } } },
    });
    return new Set(rows.map((r) => `${r.permission.feature}:${r.permission.action}`));
  }

  private async allowedCount(roleId: string): Promise<number> {
    return this.prisma.rolePermission.count({
      where: { roleId, allowed: true, permission: { feature: { not: null } } },
    });
  }
}

/** Re-exported so the controller's Zod pipe and this file agree on the actions. */
export const EDITOR_ACTIONS: readonly ActionKey[] = ACTIONS;
