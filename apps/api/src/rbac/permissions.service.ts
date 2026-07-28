import { Injectable } from '@nestjs/common';
import { grantsToPermissionKeys, type ModuleGrant, type PermissionKey } from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';

/** Loads a role's effective permission keys from the role_permission matrix. */
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async permissionKeysForRole(roleId: string): Promise<PermissionKey[]> {
    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId, allowed: true },
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
}
