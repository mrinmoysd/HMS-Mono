import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Ability } from '@smart-hospital/shared';
import type { PermissionKey } from '@smart-hospital/shared';
import { PERMISSION_KEY, type RequiredPermission } from './require-permission.decorator';
import { FEATURE_KEY, type RequiredFeature } from './require-feature.decorator';
import type { AuthenticatedRequest } from '../common/types/request-user';
import type { FeaturePermissionKey } from '@smart-hospital/shared';

/**
 * Enforces the permission declared by @RequireFeature (preferred) or
 * @RequirePermission (legacy). Runs after JwtAuthGuard so req.user is
 * populated. This is the REAL access boundary — UI hiding is cosmetic only
 * (docs/PERMISSION_MATRIX §5).
 *
 * Both decorators are honoured because R1 migrates one module at a time and a
 * half-migrated codebase has to keep working. A handler carrying both must
 * satisfy both.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const features = this.reflector.getAllAndOverride<RequiredFeature[] | undefined>(FEATURE_KEY, targets);
    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(PERMISSION_KEY, targets);
    if (!features?.length && !required) return true; // no permission declared → allowed (still authenticated)

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const ability = new Ability(
      (req.user?.permissions ?? []) as PermissionKey[],
      (req.user?.features ?? []) as FeaturePermissionKey[],
    );

    for (const f of features ?? []) {
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
