import type { Request } from 'express';

/** Shape attached to the request by JwtStrategy after token validation. */
export interface RequestUser {
  id: string;
  username: string;
  name: string;
  roleSlug: string;
  branchId: string;
  permissions: string[]; // PermissionKey[] e.g. "patient:add"
}

export interface AuthenticatedRequest extends Request {
  user: RequestUser;
  /** Active branch for the request (header override falls back to user's branch). */
  branchId?: string;
}
