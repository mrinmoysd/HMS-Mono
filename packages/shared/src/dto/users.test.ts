import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canManage,
  lastAdminProblem,
  manageBlockedReason,
  userListQuerySchema,
  userPasswordResetSchema,
  userStatusSchema,
  type ActorContext,
  type TargetContext,
} from './users';

const superAdmin: ActorContext = { id: 'sa', roleSlug: 'super_admin' };
const admin: ActorContext = { id: 'ad', roleSlug: 'admin' };

const target = (over: Partial<TargetContext> = {}): TargetContext => ({
  id: 'other',
  roleSlug: 'receptionist',
  isActive: true,
  ...over,
});

// ── Self-lockout ────────────────────────────────────────────────────

test('nobody may act on their own account', () => {
  assert.match(manageBlockedReason(admin, target({ id: 'ad' }))!, /your own account/);
  assert.match(manageBlockedReason(superAdmin, target({ id: 'sa', roleSlug: 'super_admin' }))!, /your own account/);
});

test('the self rule beats every other consideration', () => {
  // A Super Admin acting on themselves is still refused, even though rule 2
  // would otherwise allow it.
  assert.equal(canManage(superAdmin, target({ id: 'sa', roleSlug: 'super_admin' })), false);
});

// ── Admin vs Super Admin ────────────────────────────────────────────

test('an admin may not act on a super admin', () => {
  assert.match(manageBlockedReason(admin, target({ roleSlug: 'super_admin' }))!, /Only a Super Admin/);
});

test('a super admin may act on another super admin', () => {
  assert.equal(manageBlockedReason(superAdmin, target({ id: 'sa2', roleSlug: 'super_admin' })), null);
});

test('an admin may act on another admin', () => {
  assert.equal(manageBlockedReason(admin, target({ id: 'ad2', roleSlug: 'admin' })), null);
});

test('an admin may act on ordinary staff', () => {
  assert.equal(manageBlockedReason(admin, target()), null);
  assert.equal(canManage(admin, target()), true);
});

test('a patient account is manageable by an admin', () => {
  assert.equal(canManage(admin, target({ roleSlug: 'patient' })), true);
});

// ── Last administrator ──────────────────────────────────────────────

test('suspending the last active administrator is refused', () => {
  assert.match(lastAdminProblem(target({ roleSlug: 'admin' }), 0)!, /last active administrator/);
  assert.match(lastAdminProblem(target({ roleSlug: 'super_admin' }), 0)!, /last active administrator/);
});

test('suspending an administrator is allowed while another remains', () => {
  assert.equal(lastAdminProblem(target({ roleSlug: 'admin' }), 1), null);
});

test('the last-admin rule is unreachable while the self rule holds', () => {
  // Documents why, so a future reader does not mistake this for the safeguard
  // doing the work. The caller must be an admin to reach the endpoint and
  // cannot be the target, so it is itself one of the remaining admins.
  const actor: ActorContext = { id: 'ad', roleSlug: 'admin' };
  const other = target({ id: 'ad2', roleSlug: 'admin' });
  assert.equal(canManage(actor, other), true);
  // The caller is active and is not the target, so remaining >= 1 always.
  assert.equal(lastAdminProblem(other, 1), null);
  // Reaching zero requires a caller who is not an active admin — which the
  // role gate forbids today. If that ever changes, the rule bites:
  assert.match(lastAdminProblem(other, 0)!, /last active administrator/);
});

test('a non-administrator is never blocked by the last-admin rule', () => {
  // A hospital with zero admins left is already broken; suspending a
  // receptionist is not what broke it, and blocking that would be baffling.
  assert.equal(lastAdminProblem(target({ roleSlug: 'doctor' }), 0), null);
  assert.equal(lastAdminProblem(target({ roleSlug: 'patient' }), 0), null);
});

// ── Schemas ─────────────────────────────────────────────────────────

test('the list query defaults to all staff accounts', () => {
  const q = userListQuerySchema.parse({});
  assert.equal(q.type, 'staff');
  assert.equal(q.status, 'all');
  assert.equal(q.page, 1);
});

test('the list query rejects an unknown type', () => {
  assert.equal(userListQuerySchema.safeParse({ type: 'ghost' }).success, false);
});

test('status accepts the three real values', () => {
  for (const status of ['all', 'active', 'suspended']) {
    assert.equal(userListQuerySchema.safeParse({ status }).success, true, status);
  }
});

test('a suspension may carry a reason', () => {
  const parsed = userStatusSchema.parse({ isActive: false, reason: 'On extended leave' });
  assert.equal(parsed.isActive, false);
  assert.equal(parsed.reason, 'On extended leave');
});

test('isActive is required — an omitted flag must not default to enabled', () => {
  // Defaulting either way would make a malformed request silently change
  // access. It has to be stated.
  assert.equal(userStatusSchema.safeParse({}).success, false);
});

test('a reset password must be at least eight characters', () => {
  assert.equal(userPasswordResetSchema.safeParse({ password: 'short' }).success, false);
  assert.equal(userPasswordResetSchema.safeParse({ password: 'longenough1' }).success, true);
});
