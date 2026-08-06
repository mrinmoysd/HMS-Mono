import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Ability, moduleOfFeature, togglesForModule } from '@smart-hospital/shared';
import type { PermissionKey } from '@smart-hospital/shared';
import { ModuleAccessService } from '../settings/module-access.service';
import { resolveBranchId } from '../common/context/branch-context.interceptor';
import { PERMISSION_KEY, type RequiredPermission } from './require-permission.decorator';
import {
  FEATURE_KEY,
  FEATURE_RESOLVER_KEY,
  type FeatureResolverContext,
  type RequiredFeature,
} from './require-feature.decorator';
import { NO_PERMISSION_KEY } from './authenticated.decorator';
import { ROLE_KEY } from './require-role.decorator';
import { IS_PUBLIC_KEY } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/request-user';
import type { FeaturePermissionKey, RoleKey } from '@smart-hospital/shared';

/**
 * Enforces the permission declared by @RequireFeature (preferred) or
 * @RequirePermission (legacy). Runs after JwtAuthGuard so req.user is
 * populated. This is the REAL access boundary — UI hiding is cosmetic only
 * (docs/PERMISSION_MATRIX §5).
 *
 * Both decorators are honoured because R1 migrated one module at a time and a
 * handful of endpoints have no feature key to move to.
 *
 * **This guard fails closed.** A handler that declares nothing is denied. It
 * used to be allowed, which meant a forgotten decorator was indistinguishable
 * from a deliberate one — and the audit that found this turned up thirteen
 * undecorated handlers, of which two (`meta/modules`, `directory/doctors`) were
 * genuinely forgotten. Now every route must say which of the four it is:
 *
 *   @Public()          no authentication at all — login, health, the CMS site
 *   @Authenticated()   signed in is the whole check — your own profile, portal
 *   @RequireRole       the caller's role itself — the permission editor only
 *   @RequireFeature    a named feature and action
 *   @RequirePermission legacy module gate, for the few with no feature key
 *
 * Nothing else reaches a handler. Adding a route without one of these fails
 * immediately and loudly, which is the entire point.
 *
 * **Disabled modules are checked first.** Settings ▸ Modules can switch a module
 * off for a branch; that denies every role including Admin, and is enforced here
 * rather than only in the sidebar, because hiding a link is not access control.
 * The check deliberately sits ahead of the permission check — see the comment
 * at the call site.
 *
 * `@RequireRole` returns before it, which is what keeps Settings itself
 * reachable. Combined with `PROTECTED_MODULES` refusing to disable
 * `system_settings`, there is no way to switch off the screen that switches
 * things back on.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly modules: ModuleAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    // @Public routes never reached JwtAuthGuard's user lookup, so there is no
    // ability to check and nothing to check it against. Let them through here
    // too — otherwise flipping this guard closed would break login itself.
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;
    if (this.reflector.getAllAndOverride<boolean>(NO_PERMISSION_KEY, targets)) return true;

    // Role gating, for the permission editor. Deliberately not expressible as a
    // permission — see require-role.decorator.ts for why the loop matters.
    const roles = this.reflector.getAllAndOverride<RoleKey[] | undefined>(ROLE_KEY, targets);
    if (roles?.length) {
      const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
      const slug = req.user?.roleSlug as RoleKey | undefined;
      if (!slug || !roles.includes(slug)) {
        throw new ForbiddenException(`This endpoint is restricted to: ${roles.join(', ')}`);
      }
      return true;
    }

    const declared = this.reflector.getAllAndOverride<RequiredFeature[] | undefined>(FEATURE_KEY, targets);
    const resolver = this.reflector.getAllAndOverride<
      ((ctx: FeatureResolverContext) => RequiredFeature[] | RequiredFeature | null) | undefined
    >(FEATURE_RESOLVER_KEY, targets);
    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(PERMISSION_KEY, targets);

    if (!declared?.length && !resolver && !required) {
      // Fail closed. The message names the fix rather than the symptom, because
      // the person who sees it is almost always the person who just added the
      // route.
      throw new ForbiddenException(
        'This endpoint declares no permission. Add @RequireFeature, @RequirePermission, ' +
          '@RequireRole, @Authenticated or @Public to it.',
      );
    }

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const ability = new Ability(
      (req.user?.permissions ?? []) as PermissionKey[],
      (req.user?.features ?? []) as FeaturePermissionKey[],
    );

    let features = declared ?? [];
    if (resolver) {
      const resolved = resolver({
        params: (req.params ?? {}) as Record<string, string>,
        query: (req.query ?? {}) as Record<string, unknown>,
        body: (req.body ?? {}) as Record<string, unknown>,
      });
      // null means the resolver did not recognise the request — fail closed.
      if (resolved === null) throw new ForbiddenException('Unknown resource for permission check');
      features = [...features, ...(Array.isArray(resolved) ? resolved : [resolved])];
    }

    // ── Modules on/off, before any permission check ──────────────────────────
    // A module switched off in Settings is unreachable regardless of who is
    // asking, Admin included. Running this *before* the feature check is the
    // whole point: if it ran after, a role that happened to lack the permission
    // would get "Missing permission" and a role that had it would get through,
    // which is not "the module is off" — it is "the module is off for some
    // people".
    const branchId = resolveBranchId(req.user, req.headers as Record<string, unknown>);
    if (branchId) {
      const touched = new Set<string>();
      for (const f of features) touched.add(moduleOfFeature(f.feature));
      if (required) for (const g of togglesForModule(required.module)) touched.add(g);

      const disabled = await this.modules.disabledFor(branchId);
      for (const m of touched) {
        if (disabled.has(m)) {
          throw new ForbiddenException(`Module disabled: ${m}`);
        }
      }
    }

    for (const f of features) {
      if (!ability.canFeature(f.feature, f.action)) {
        throw new ForbiddenException(`Missing permission: ${f.feature}:${f.action}`);
      }
    }
    if (required && !ability.can(required.module, required.action)) {
      throw new ForbiddenException(`Missing permission: ${required.module}:${required.action}`);
    }
    return true;
  }
}
