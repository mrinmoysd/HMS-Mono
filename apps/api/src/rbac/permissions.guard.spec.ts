import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSION_KEY } from './require-permission.decorator';
import { FEATURE_KEY, FEATURE_RESOLVER_KEY } from './require-feature.decorator';
import { NO_PERMISSION_KEY } from './authenticated.decorator';
import { IS_PUBLIC_KEY } from '../auth/jwt-auth.guard';

/**
 * The guard's default answer is the whole point of R3, and getting it wrong is
 * silent in both directions: fail open and everything works while nothing is
 * protected; fail closed by accident and a route 403s for everyone including
 * Admin. Both deserve a test.
 */
function ctx(metadata: Record<string, unknown>, user?: { permissions?: string[]; features?: string[] }) {
  const handler = () => undefined;
  const cls = class {};
  const reflector = new Reflector();
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockImplementation((key: unknown) => metadata[key as string] as never);
  const execution = {
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({ getRequest: () => ({ user, params: {}, query: {}, body: {} }) }),
  };
  return { guard: new PermissionsGuard(reflector), execution: execution as never };
}

describe('PermissionsGuard', () => {
  it('DENIES a handler that declares nothing', () => {
    const { guard, execution } = ctx({}, { permissions: [], features: [] });
    expect(() => guard.canActivate(execution)).toThrow(ForbiddenException);
  });

  it('names the fix in the denial, not just the symptom', () => {
    const { guard, execution } = ctx({}, { permissions: [], features: [] });
    expect(() => guard.canActivate(execution)).toThrow(/@RequireFeature/);
  });

  it('lets @Public through — otherwise the flip would break login', () => {
    const { guard, execution } = ctx({ [IS_PUBLIC_KEY]: true });
    expect(guard.canActivate(execution)).toBe(true);
  });

  it('lets @Authenticated through without any permission', () => {
    const { guard, execution } = ctx({ [NO_PERMISSION_KEY]: true }, { permissions: [], features: [] });
    expect(guard.canActivate(execution)).toBe(true);
  });

  it('checks a declared feature against the token', () => {
    const meta = { [FEATURE_KEY]: [{ feature: 'opd.opd_patient', action: 'view' }] };
    const allowed = ctx(meta, { features: ['opd.opd_patient:view'] });
    expect(allowed.guard.canActivate(allowed.execution)).toBe(true);

    const denied = ctx(meta, { features: ['opd.opd_patient:add'] });
    expect(() => denied.guard.canActivate(denied.execution)).toThrow(/opd.opd_patient:view/);
  });

  it('ANDs multiple declared features', () => {
    const meta = {
      [FEATURE_KEY]: [
        { feature: 'income.income', action: 'view' },
        { feature: 'expense.expense', action: 'view' },
      ],
    };
    const half = ctx(meta, { features: ['income.income:view'] });
    expect(() => half.guard.canActivate(half.execution)).toThrow(/expense.expense:view/);
  });

  it('denies when a resolver returns null', () => {
    const meta = { [FEATURE_RESOLVER_KEY]: () => null };
    const { guard, execution } = ctx(meta, { features: [] });
    expect(() => guard.canActivate(execution)).toThrow(/Unknown resource/);
  });

  it('still honours the legacy module decorator', () => {
    const meta = { [PERMISSION_KEY]: { module: 'billing', action: 'edit' } };
    const allowed = ctx(meta, { permissions: ['billing:edit'] });
    expect(allowed.guard.canActivate(allowed.execution)).toBe(true);

    const denied = ctx(meta, { permissions: ['billing:view'] });
    expect(() => denied.guard.canActivate(denied.execution)).toThrow(/billing:edit/);
  });
});
