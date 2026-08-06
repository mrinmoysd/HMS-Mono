import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSION_KEY } from './require-permission.decorator';
import { FEATURE_KEY, FEATURE_RESOLVER_KEY } from './require-feature.decorator';
import { NO_PERMISSION_KEY } from './authenticated.decorator';
import { ROLE_KEY } from './require-role.decorator';
import { IS_PUBLIC_KEY } from '../auth/jwt-auth.guard';
import type { ModuleAccessService } from '../settings/module-access.service';

/**
 * The guard's default answer is the whole point of R3, and getting it wrong is
 * silent in both directions: fail open and everything works while nothing is
 * protected; fail closed by accident and a route 403s for everyone including
 * Admin. Both deserve a test.
 *
 * G3 added a second reason to deny — a module switched off in Settings — which
 * has the same two-sided silence, plus a third failure mode of its own: a
 * disabled module that stays reachable for whoever holds the permission.
 */
type TestUser = {
  permissions?: string[];
  features?: string[];
  branchId?: string;
  roleSlug?: string;
};

function ctx(
  metadata: Record<string, unknown>,
  user?: TestUser,
  opts: { disabled?: string[]; headers?: Record<string, unknown> } = {},
) {
  const handler = () => undefined;
  const cls = class {};
  const reflector = new Reflector();
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockImplementation((key: unknown) => metadata[key as string] as never);

  const disabled = new Set(opts.disabled ?? []);
  const modules = {
    disabledFor: jest.fn().mockResolvedValue(disabled),
  } as unknown as ModuleAccessService;

  const execution = {
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({
      getRequest: () => ({
        user: user && { branchId: 'b1', ...user },
        params: {},
        query: {},
        body: {},
        headers: opts.headers ?? {},
      }),
    }),
  };
  return { guard: new PermissionsGuard(reflector, modules), execution: execution as never, modules };
}

describe('PermissionsGuard', () => {
  it('DENIES a handler that declares nothing', async () => {
    const { guard, execution } = ctx({}, { permissions: [], features: [] });
    await expect(guard.canActivate(execution)).rejects.toThrow(ForbiddenException);
  });

  it('names the fix in the denial, not just the symptom', async () => {
    const { guard, execution } = ctx({}, { permissions: [], features: [] });
    await expect(guard.canActivate(execution)).rejects.toThrow(/@RequireFeature/);
  });

  it('lets @Public through — otherwise the flip would break login', async () => {
    const { guard, execution } = ctx({ [IS_PUBLIC_KEY]: true });
    await expect(guard.canActivate(execution)).resolves.toBe(true);
  });

  it('lets @Authenticated through without any permission', async () => {
    const { guard, execution } = ctx({ [NO_PERMISSION_KEY]: true }, { permissions: [], features: [] });
    await expect(guard.canActivate(execution)).resolves.toBe(true);
  });

  it('checks a declared feature against the token', async () => {
    const meta = { [FEATURE_KEY]: [{ feature: 'opd.opd_patient', action: 'view' }] };
    const allowed = ctx(meta, { features: ['opd.opd_patient:view'] });
    await expect(allowed.guard.canActivate(allowed.execution)).resolves.toBe(true);

    const denied = ctx(meta, { features: ['opd.opd_patient:add'] });
    await expect(denied.guard.canActivate(denied.execution)).rejects.toThrow(/opd.opd_patient:view/);
  });

  it('ANDs multiple declared features', async () => {
    const meta = {
      [FEATURE_KEY]: [
        { feature: 'income.income', action: 'view' },
        { feature: 'expense.expense', action: 'view' },
      ],
    };
    const half = ctx(meta, { features: ['income.income:view'] });
    await expect(half.guard.canActivate(half.execution)).rejects.toThrow(/expense.expense:view/);
  });

  it('denies when a resolver returns null', async () => {
    const meta = { [FEATURE_RESOLVER_KEY]: () => null };
    const { guard, execution } = ctx(meta, { features: [] });
    await expect(guard.canActivate(execution)).rejects.toThrow(/Unknown resource/);
  });

  it('still honours the legacy module decorator', async () => {
    const meta = { [PERMISSION_KEY]: { module: 'billing', action: 'edit' } };
    const allowed = ctx(meta, { permissions: ['billing:edit'] });
    await expect(allowed.guard.canActivate(allowed.execution)).resolves.toBe(true);

    const denied = ctx(meta, { permissions: ['billing:view'] });
    await expect(denied.guard.canActivate(denied.execution)).rejects.toThrow(/billing:edit/);
  });

  // ── Modules on/off (G3) ────────────────────────────────────────────────────

  it('denies a disabled module even when the permission is held', async () => {
    const meta = { [FEATURE_KEY]: [{ feature: 'opd.opd_patient', action: 'view' }] };
    const { guard, execution } = ctx(meta, { features: ['opd.opd_patient:view'] }, { disabled: ['opd'] });
    await expect(guard.canActivate(execution)).rejects.toThrow(/Module disabled: opd/);
  });

  it('reports the module, not a missing permission, when both would deny', async () => {
    // Otherwise an admin turning a module off sees "Missing permission" and goes
    // looking in the permission editor for a problem that is not there.
    const meta = { [FEATURE_KEY]: [{ feature: 'opd.opd_patient', action: 'view' }] };
    const { guard, execution } = ctx(meta, { features: [] }, { disabled: ['opd'] });
    await expect(guard.canActivate(execution)).rejects.toThrow(/Module disabled/);
  });

  it('leaves other modules reachable when one is disabled', async () => {
    const meta = { [FEATURE_KEY]: [{ feature: 'ipd.ipd_patient', action: 'view' }] };
    const { guard, execution } = ctx(meta, { features: ['ipd.ipd_patient:view'] }, { disabled: ['opd'] });
    await expect(guard.canActivate(execution)).resolves.toBe(true);
  });

  it('gates legacy module routes through all of that module’s groups', async () => {
    // `finance` is income + expense; disabling either must close the route.
    const meta = { [PERMISSION_KEY]: { module: 'finance', action: 'view' } };
    const { guard, execution } = ctx(meta, { permissions: ['finance:view'] }, { disabled: ['expense'] });
    await expect(guard.canActivate(execution)).rejects.toThrow(/Module disabled: expense/);
  });

  it('keeps @RequireRole routes reachable so Settings can re-enable a module', async () => {
    // system_settings cannot be disabled, but even if a row said otherwise the
    // role gate returns before the module check — belt and braces on the lockout.
    const meta = { [ROLE_KEY]: ['super_admin', 'admin'] };
    const { guard, execution } = ctx(meta, { roleSlug: 'admin' }, { disabled: ['system_settings'] });
    await expect(guard.canActivate(execution)).resolves.toBe(true);
  });

  it('reads the branch the request is operating on, not the user’s home branch', async () => {
    // An admin switched to branch B must be gated by branch B's settings.
    const meta = { [FEATURE_KEY]: [{ feature: 'opd.opd_patient', action: 'view' }] };
    const { guard, execution, modules } = ctx(
      meta,
      { features: ['opd.opd_patient:view'], branchId: 'home', roleSlug: 'admin' },
      { headers: { 'x-branch-id': 'other' } },
    );
    await guard.canActivate(execution);
    expect(modules.disabledFor).toHaveBeenCalledWith('other');
  });

  it('does not let a non-switching role pick its own branch', async () => {
    const meta = { [FEATURE_KEY]: [{ feature: 'opd.opd_patient', action: 'view' }] };
    const { guard, execution, modules } = ctx(
      meta,
      { features: ['opd.opd_patient:view'], branchId: 'home', roleSlug: 'nurse' },
      { headers: { 'x-branch-id': 'other' } },
    );
    await guard.canActivate(execution);
    expect(modules.disabledFor).toHaveBeenCalledWith('home');
  });
});
