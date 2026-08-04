import { Test } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Regression guard for the R0.4 escalation.
 *
 * Feature rows carry a `module` column as well as a `feature` one. The service
 * collapses rows by module, so the moment the 751 feature rows landed they
 * started folding themselves into the module keys — a nurse jumped from 14 keys
 * to 26 and gained opd:delete and ipd:delete, i.e. the right to delete any visit
 * or admission, earned by being allowed to delete a nurse note.
 *
 * The fix is one `feature: null` in the where clause. These tests assert the
 * query actually carries it, because the failure is invisible: everything still
 * works, users just quietly hold more than they should.
 */
describe('PermissionsService', () => {
  let service: PermissionsService;
  let findMany: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn().mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: PrismaService, useValue: { rolePermission: { findMany } } },
      ],
    }).compile();
    service = moduleRef.get(PermissionsService);
  });

  describe('permissionKeysForRole', () => {
    it('reads only module-level rows', async () => {
      await service.permissionKeysForRole('role-1');
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { roleId: 'role-1', allowed: true, permission: { feature: null } },
        }),
      );
    });

    it('does not fold feature rows into module keys', async () => {
      // A fake that actually applies the filter, so this tests the service
      // rather than the mock. Rows are a nurse's real shape: view on the IPD
      // module, delete on the Nurse Note feature.
      const table = [
        { permission: { module: 'ipd', action: 'view', feature: null } },
        { permission: { module: 'ipd', action: 'delete', feature: 'ipd.nurse_note' } },
      ];
      findMany.mockImplementation(({ where }: { where: { permission?: { feature?: null } } }) =>
        Promise.resolve(
          where.permission?.feature === null
            ? table.filter((r) => r.permission.feature === null)
            : table,
        ),
      );

      const keys = await service.permissionKeysForRole('nurse-role');

      // Drop `permission: { feature: null }` from the query and this flips:
      // the nurse-note row arrives, the collapser ORs it into the module, and
      // ipd:delete appears — which is DELETE /ipd/:id.
      expect(keys).toContain('ipd:view');
      expect(keys).not.toContain('ipd:delete');
    });
  });

  describe('featureKeysForRole', () => {
    it('reads only feature rows', async () => {
      await service.featureKeysForRole('role-1');
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { roleId: 'role-1', allowed: true, permission: { NOT: { feature: null } } },
        }),
      );
    });

    it('returns featureKey:action, not module:action', async () => {
      findMany.mockResolvedValue([
        { permission: { module: 'ipd', action: 'add', feature: 'ipd.nurse_note' } },
      ]);
      expect(await service.featureKeysForRole('nurse-role')).toEqual(['ipd.nurse_note:add']);
    });
  });
});
