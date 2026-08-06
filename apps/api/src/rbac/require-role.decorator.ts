import { SetMetadata } from '@nestjs/common';
import type { RoleKey } from '@smart-hospital/shared';

export const ROLE_KEY = 'required_role';

/**
 * Gate a handler on the caller's role rather than on a permission.
 *
 * This exists for exactly one thing — the permission editor — and it should
 * stay that way. Everywhere else, role-based gating is the wrong tool: it
 * cannot be adjusted without a deploy, which is the problem the feature model
 * was built to solve.
 *
 * The editor is the exception because gating it on a permission creates a loop.
 * Whoever holds that permission can grant it to anyone, or revoke it from every
 * role including their own — and once no role holds it, nobody can edit
 * permissions again without someone going into the database by hand. A role
 * check cannot be granted or revoked through the screen it protects, so the
 * loop does not close.
 *
 * The reference system has the loop, plus an unguarded read endpoint on top of
 * it. See the anti-parity section of docs/ROLE_PERMISSION_PARITY.md.
 */
export const RequireRole = (...roles: RoleKey[]) => SetMetadata(ROLE_KEY, roles);
