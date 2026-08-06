import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { AuthenticatedRequest, RequestUser } from '../types/request-user';

/**
 * Resolves the active branch for the request. Precedence:
 *   1. `x-branch-id` header (set by the "Switch Branch" control), IF the user is
 *      permitted to operate cross-branch (super_admin / admin).
 *   2. The user's own branch.
 *
 * Exported as a plain function because `PermissionsGuard` needs the same answer
 * and cannot get it from `req.branchId`: Nest runs guards *before*
 * interceptors, so the property below has not been set yet. Two copies of this
 * precedence would be a live bug — an admin switched to branch B would be
 * gated by branch A's module settings — so there is exactly one.
 */
export function resolveBranchId(
  user: RequestUser | undefined,
  headers: Record<string, unknown>,
): string | undefined {
  if (!user) return undefined;
  const requested = headers['x-branch-id'];
  const canSwitch = user.roleSlug === 'super_admin' || user.roleSlug === 'admin';
  return canSwitch && typeof requested === 'string' ? requested : user.branchId;
}

/** Downstream services read `req.branchId` to scope every query. */
@Injectable()
export class BranchContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const resolved = resolveBranchId(req.user, req.headers as Record<string, unknown>);
    if (resolved) req.branchId = resolved;
    return next.handle();
  }
}
