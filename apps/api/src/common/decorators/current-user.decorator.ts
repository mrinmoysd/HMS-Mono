import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, RequestUser } from '../types/request-user';

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | unknown => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return data ? req.user?.[data] : req.user;
  },
);
