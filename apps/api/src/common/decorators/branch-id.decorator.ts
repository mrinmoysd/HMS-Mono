import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../types/request-user';

/** Injects the active branch resolved by BranchContextInterceptor. */
export const BranchId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!req.branchId) throw new InternalServerErrorException('Branch context not resolved');
  return req.branchId;
});
