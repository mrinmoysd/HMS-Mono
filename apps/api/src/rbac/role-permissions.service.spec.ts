import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FEATURES } from '@smart-hospital/shared';
import { RolePermissionsService } from './role-permissions.service';

/**
 * The editor's value is in what it refuses. A screen that happily writes a
 * permission nobody can hold is worse than no screen: the checkbox shows
 * ticked, the guard still denies, and the person who ticked it has no way to
 * tell. That is the Multi Branch bug the R5 matrix caught, and it must not be
 * reachable through the UI.
 */

const ROLE = { id: 'role-1', slug: 'nurse', label: 'Nurse' };

function makeService(opts: { allowed?: Set<string> } = {}) {
  const allowed = opts.allowed ?? new Set<string>();
  const upserts: { permissionId: string; allowed: boolean }[] = [];

  const prisma = {
    role: {
      findUnique: jest.fn(async ({ where }: { where: { slug: string } }) =>
        where.slug === ROLE.slug ? ROLE : null,
      ),
      findMany: jest.fn(async () => [ROLE]),
    },
    permission: {
      // Every feature toggle has a row, keyed predictably for the test.
      findMany: jest.fn(async ({ where }: { where: { feature: { in: string[] } } }) =>
        FEATURES.filter((f) => where.feature.in.includes(f.key)).flatMap((f) =>
          f.actions.map((a) => ({ id: `${f.key}:${a}`, feature: f.key, action: a })),
        ),
      ),
    },
    rolePermission: {
      findMany: jest.fn(async () =>
        [...allowed].map((k) => ({
          permission: { feature: k.split(':')[0], action: k.split(':')[1] },
        })),
      ),
      count: jest.fn(async () => allowed.size),
      upsert: jest.fn((args: { create: { permissionId: string; allowed: boolean } }) => {
        upserts.push({ permissionId: args.create.permissionId, allowed: args.create.allowed });
        return args;
      }),
    },
    $transaction: jest.fn(async (ops: unknown[]) => ops),
  };
  const audit = { record: jest.fn(async () => undefined) };
  const service = new RolePermissionsService(prisma as never, audit as never);
  return { service, prisma, audit, upserts };
}

const actor = { id: 'u1', branchId: 'b1' } as never;

describe('RolePermissionsService.update', () => {
  it('refuses an action the feature does not expose', async () => {
    // multi_branch.setting is view-only. Ticking `add` would write a row no
    // guard can ever match — exactly the bug R5 caught in the codebase.
    const { service, upserts } = makeService();
    await expect(
      service.update(actor, 'nurse', {
        changes: [
          { feature: 'multi_branch.setting', action: 'add', allowed: true },
          { feature: 'ipd.nurse_note', action: 'add', allowed: true },
        ],
      }),
    ).resolves.toMatchObject({
      applied: 1,
      rejected: [expect.objectContaining({ feature: 'multi_branch.setting', action: 'add' })],
    });
    // Only the legitimate one was written.
    expect(upserts).toEqual([{ permissionId: 'ipd.nurse_note:add', allowed: true }]);
  });

  it('says which toggles the feature does expose', async () => {
    const { service } = makeService();
    const res = await service.update(actor, 'nurse', {
      changes: [
        { feature: 'multi_branch.setting', action: 'edit', allowed: true },
        { feature: 'ipd.nurse_note', action: 'view', allowed: true },
      ],
    });
    expect(res.rejected[0]!.reason).toMatch(/exposes only: view/);
  });

  it('refuses a feature that does not exist', async () => {
    const { service } = makeService();
    const res = await service.update(actor, 'nurse', {
      changes: [
        { feature: 'not.a.feature', action: 'view', allowed: true },
        { feature: 'ipd.nurse_note', action: 'view', allowed: true },
      ],
    });
    expect(res.rejected).toEqual([{ feature: 'not.a.feature', action: 'view', reason: 'no such feature' }]);
  });

  it('rejects the whole save when nothing in it is valid', async () => {
    const { service } = makeService();
    await expect(
      service.update(actor, 'nurse', {
        changes: [{ feature: 'not.a.feature', action: 'view', allowed: true }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('will not edit Super Admin, which has no permission row', async () => {
    const { service } = makeService();
    await expect(
      service.update(actor, 'super_admin', {
        changes: [{ feature: 'ipd.nurse_note', action: 'view', allowed: true }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('will not edit the patient portal role', async () => {
    const { service } = makeService();
    await expect(
      service.update(actor, 'patient', {
        changes: [{ feature: 'ipd.nurse_note', action: 'view', allowed: true }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('404s an unknown role rather than creating one', async () => {
    const { service } = makeService();
    await expect(
      service.update(actor, 'wizard', {
        changes: [{ feature: 'ipd.nurse_note', action: 'view', allowed: true }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('records an audit entry carrying the delta', async () => {
    const { service, audit } = makeService();
    await service.update(actor, 'nurse', {
      changes: [{ feature: 'ipd.nurse_note', action: 'delete', allowed: true }],
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'permissions_update', entity: 'role' }),
    );
  });

  it('can revoke as well as grant', async () => {
    const { service, upserts } = makeService({ allowed: new Set(['ipd.nurse_note:view']) });
    await service.update(actor, 'nurse', {
      changes: [{ feature: 'ipd.nurse_note', action: 'view', allowed: false }],
    });
    expect(upserts).toEqual([{ permissionId: 'ipd.nurse_note:view', allowed: false }]);
  });
});

describe('RolePermissionsService.get', () => {
  it('returns every group and only the toggles each feature exposes', async () => {
    const { service } = makeService({ allowed: new Set(['ipd.nurse_note:view']) });
    const dto = await service.get('nurse');
    expect(dto.groups.length).toBe(36);
    expect(dto.totalCount).toBe(751);

    const row = dto.groups
      .flatMap((g) => g.features)
      .find((f) => f.key === 'multi_branch.setting')!;
    expect(row.actions).toEqual(['view']); // not four checkboxes
    const note = dto.groups.flatMap((g) => g.features).find((f) => f.key === 'ipd.nurse_note')!;
    expect(note.allowed).toEqual(['view']);
  });
});

describe('RolePermissionsService.listRoles', () => {
  it('marks the uneditable roles and says why', async () => {
    const { service, prisma } = makeService();
    prisma.role.findMany.mockResolvedValueOnce([
      ROLE,
      { id: 'r-sa', slug: 'super_admin', label: 'Super Admin' },
      { id: 'r-p', slug: 'patient', label: 'Patient' },
    ] as never);
    const roles = await service.listRoles();
    const bySlug = Object.fromEntries(roles.map((r) => [r.slug, r]));
    expect(bySlug.nurse!.editable).toBe(true);
    expect(bySlug.super_admin!.editable).toBe(false);
    expect(bySlug.super_admin!.reason).toMatch(/bypasses/);
    expect(bySlug.patient!.editable).toBe(false);
    // Super Admin holds everything implicitly; reporting 0 would misread.
    expect(bySlug.super_admin!.allowedCount).toBe(751);
  });
});
