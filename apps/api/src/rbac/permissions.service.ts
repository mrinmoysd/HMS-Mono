import { Injectable } from '@nestjs/common';
import { grantsToPermissionKeys, type ModuleGrant, type PermissionKey } from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';

/** Loads a role's effective permission keys from the role_permission matrix. */
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async permissionKeysForRole(roleId: string): Promise<PermissionKey[]> {
    const rows = await this.prisma.rolePermission.findMany({
      // `feature: null` is load-bearing, not tidiness. Feature rows carry a
      // `module` column too, so without this filter they collapse into the same
      // module keys and silently OR themselves into the caller's grants — which
      // is the rollup that docs/ROLE_PERMISSION_PARITY.md forbids persisting.
      //
      // Measured when R0.4 landed: without it a nurse went from 14 keys to 26
      // and gained opd:delete and ipd:delete, i.e. the right to delete any visit
      // or admission, on the strength of being allowed to delete a nurse note.
      where: { roleId, allowed: true, permission: { feature: null } },
      include: { permission: true },
    });

    // Collapse into ModuleGrant[] then into flat keys.
    const byModule = new Map<string, ModuleGrant>();
    for (const row of rows) {
      const { module, action } = row.permission;
      const g =
        byModule.get(module) ??
        ({ module, view: false, add: false, edit: false, delete: false } as ModuleGrant);
      if (action === 'view' || action === 'add' || action === 'edit' || action === 'delete') {
        g[action] = true;
      }
      byModule.set(module, g);
    }
    return grantsToPermissionKeys([...byModule.values()]);
  }

  /**
   * The feature-level grants, `${featureKey}:${action}`. Kept separate from the
   * module keys above so the two can never be confused for one another; R1
   * moves handlers onto these one module at a time.
   */
  async featureKeysForRole(roleId: string): Promise<string[]> {
    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId, allowed: true, permission: { NOT: { feature: null } } },
      include: { permission: true },
    });
    return rows.map((r) => `${r.permission.feature}:${r.permission.action}`);
  }
}
