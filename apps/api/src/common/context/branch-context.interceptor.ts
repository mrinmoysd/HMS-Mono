import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { AuthenticatedRequest } from '../types/request-user';

/**
 * Resolves the active branch for the request. Precedence:
 *   1. `x-branch-id` header (set by the "Switch Branch" control), IF the user is
 *      permitted to operate cross-branch (super_admin / admin).
 *   2. The user's own branch.
 * Downstream services read `req.branchId` to scope every query.
 */
@Injectable()
export class BranchContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = req.user;
    if (user) {
      const requested = req.headers['x-branch-id'];
      const canSwitch = user.roleSlug === 'super_admin' || user.roleSlug === 'admin';
      req.branchId = canSwitch && typeof requested === 'string' ? requested : user.branchId;
    }
    return next.handle();
  }
}
