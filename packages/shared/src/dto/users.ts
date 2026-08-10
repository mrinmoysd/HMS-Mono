import { z } from 'zod';

/**
 * Setup ▸ Settings ▸ Users — the accounts that can sign in, staff and patient.
 *
 * Mostly a re-presentation of data other screens already hold, with one thing
 * that exists nowhere else: an account can be **suspended**. Until now the only
 * way to stop somebody signing in was to delete their staff record, which also
 * removes them from rosters and attendance — far too blunt for "they are on
 * leave" or "we are investigating something". A patient portal login could not
 * be stopped at all.
 *
 * Suspension bites immediately rather than at token expiry: `JwtStrategy`
 * re-reads the user on every request and rejects an inactive one, so there is
 * no window in which an already-issued token still works.
 */

export const USER_ACCOUNT_TYPES = ['staff', 'patient'] as const;
export type UserAccountType = (typeof USER_ACCOUNT_TYPES)[number];

export interface UserAccountDto {
  id: string;
  username: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: UserAccountType;
  roleSlug: string;
  roleLabel: string;
  isActive: boolean;
  /** Null means the account has never been used — worth seeing in a list. */
  lastLoginAt: string | null;
  createdAt: string;
  /** Staff number or patient number, when the account is linked to one. */
  referenceNo: string | null;
  /** True when this row is the caller's own account. */
  isSelf: boolean;
  /**
   * Whether the caller may act on this row, and why not when they may not.
   * Computed server-side so the screen and the endpoint cannot disagree.
   */
  canManage: boolean;
  managedBlockedReason: string | null;
}

export const userListQuerySchema = z.object({
  type: z.enum(USER_ACCOUNT_TYPES).default('staff'),
  search: z.string().trim().optional(),
  /** `all` keeps suspended accounts visible — hiding them hides the evidence. */
  status: z.enum(['all', 'active', 'suspended']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(200).default(25),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const userStatusSchema = z.object({
  isActive: z.boolean(),
  /** Why, for the audit trail. Required when suspending. */
  reason: z.string().trim().max(300).optional().or(z.literal('')),
});
export type UserStatusInput = z.infer<typeof userStatusSchema>;

export const userPasswordResetSchema = z.object({
  password: z.string().min(8, 'Use at least 8 characters'),
});
export type UserPasswordResetInput = z.infer<typeof userPasswordResetSchema>;

// ── Who may act on whom ───────────────────────────────────────────────

export interface ActorContext {
  id: string;
  roleSlug: string;
}

export interface TargetContext {
  id: string;
  roleSlug: string;
  isActive: boolean;
}

/**
 * Why the caller may not suspend or reset this account, or null if they may.
 *
 * Three rules, each protecting against a way an administrator can lock the
 * hospital out of its own system:
 *
 * 1. **Not yourself.** Suspending your own account signs you out mid-action
 *    with no way back in. Deleting your own is equally final. There is no
 *    legitimate use, so it is refused rather than confirmed.
 *
 * 2. **Admin cannot touch Super Admin.** An Admin who can suspend the Super
 *    Admin can remove the only account able to undo it — a privilege
 *    escalation by subtraction. The same reasoning already protects the Super
 *    Admin's permission matrix from Admin edits (`Role.isProtected`).
 *
 * 3. **Not the last one standing** — enforced by the caller, which is the only
 *    place that can count. See `lastAdminProblem`.
 */
export function manageBlockedReason(actor: ActorContext, target: TargetContext): string | null {
  if (actor.id === target.id) return 'You cannot change your own account here';
  if (target.roleSlug === 'super_admin' && actor.roleSlug !== 'super_admin') {
    return 'Only a Super Admin can change a Super Admin account';
  }
  return null;
}

export function canManage(actor: ActorContext, target: TargetContext): boolean {
  return manageBlockedReason(actor, target) === null;
}

/**
 * Refuse a suspension that would leave nobody able to administer the hospital.
 *
 * `remainingActiveAdmins` counts active super_admin and admin accounts OTHER
 * than the target. Zero means this suspension locks everyone out, and no one
 * left could reverse it — the system would need database access to recover.
 *
 * **Today this cannot fire, and that is worth stating plainly rather than
 * leaving it to look like the safeguard that is doing the work.** The endpoint
 * is role-gated to Admin and Super Admin, and `manageBlockedReason` refuses
 * self-service, so the caller is always an active administrator other than the
 * target — which makes the remaining count at least one by construction. The
 * self rule is what actually prevents the lockout.
 *
 * It is kept because that reasoning depends on two things staying true: the
 * role gate, and the self rule. If Users ever moves onto a feature permission
 * (as most of the app already has), a non-admin could hold it and the count
 * would become the only thing standing between a hospital and a database
 * rescue. The test suite pins the behaviour so the day it starts mattering it
 * already works.
 */
export function lastAdminProblem(target: TargetContext, remainingActiveAdmins: number): string | null {
  const isAdmin = target.roleSlug === 'super_admin' || target.roleSlug === 'admin';
  if (!isAdmin) return null;
  if (remainingActiveAdmins > 0) return null;
  return 'This is the last active administrator — suspending it would lock everyone out';
}
