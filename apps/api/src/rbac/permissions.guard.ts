import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Ability } from '@smart-hospital/shared';
import type { PermissionKey } from '@smart-hospital/shared';
import { PERMISSION_KEY, type RequiredPermission } from './require-permission.decorator';
import type { AuthenticatedRequest } from '../common/types/request-user';

/**
 * Enforces the (module, action) permission declared via @RequirePermission.
 * Runs after JwtAuthGuard so req.user.permissions is populated. This is the
 * REAL access boundary — UI hiding is cosmetic only (docs/PERMISSION_MATRIX §5).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true; // no permission declared → allowed (still authenticated)

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const ability = new Ability((req.user?.permissions ?? []) as PermissionKey[]);
    if (!ability.can(required.module, required.action)) {
      throw new ForbiddenException(
        `Missing permission: ${required.module}:${required.action}`,
      );
    }
    return true;
  }
}
