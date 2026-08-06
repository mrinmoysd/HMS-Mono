import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Ability } from '@smart-hospital/shared';
import type { PermissionKey } from '@smart-hospital/shared';
import { PERMISSION_KEY, type RequiredPermission } from './require-permission.decorator';
import {
  FEATURE_KEY,
  FEATURE_RESOLVER_KEY,
  type FeatureResolverContext,
  type RequiredFeature,
} from './require-feature.decorator';
import { NO_PERMISSION_KEY } from './authenticated.decorator';
import { IS_PUBLIC_KEY } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/request-user';
import type { FeaturePermissionKey } from '@smart-hospital/shared';

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
 *   @RequireFeature    a named feature and action
 *   @RequirePermission legacy module gate, for the few with no feature key
 *
 * Nothing else reaches a handler. Adding a route without one of these fails
 * immediately and loudly, which is the entire point.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];

    // @Public routes never reached JwtAuthGuard's user lookup, so there is no
    // ability to check and nothing to check it against. Let them through here
    // too — otherwise flipping this guard closed would break login itself.
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;
    if (this.reflector.getAllAndOverride<boolean>(NO_PERMISSION_KEY, targets)) return true;

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
          '@Authenticated or @Public to it.',
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
