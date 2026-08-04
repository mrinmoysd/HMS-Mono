import type { Request } from 'express';

/** Shape attached to the request by JwtStrategy after token validation. */
export interface RequestUser {
  id: string;
  username: string;
  name: string;
  roleSlug: string;
  branchId: string;
  permissions: string[]; // PermissionKey[] e.g. "patient:add"
  /**
   * FeaturePermissionKey[] e.g. "opd.opd_patient:add" — the precise grants.
   * Optional because a token minted before R0.4 has none; Ability falls back to
   * the module rollup in that case rather than locking the session out.
   */
  features?: string[];
}

export interface AuthenticatedRequest extends Request {
  user: RequestUser;
  /** Active branch for the request (header override falls back to user's branch). */
  branchId?: string;
}
