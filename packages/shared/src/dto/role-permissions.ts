import { z } from 'zod';
import { ACTIONS, type ActionKey } from '../rbac/roles';

/**
 * The permission editor's contract (parity doc, Phase R2).
 *
 * The reference builds this screen from 36 groups, 332 feature rows and up to
 * four checkboxes each. We serve the same shape, with two deliberate
 * differences recorded in the parity doc's anti-parity section:
 *
 *  · both the read and the write endpoint are guarded — in the reference the
 *    read is not, so any authenticated user can see every role's permissions;
 *  · Super Admin is not offered, because it has no permission row at all. It
 *    bypasses every check by design, so rendering checkboxes for it would show
 *    a control that changes nothing.
 */

/** One feature row: the toggles it exposes, and which are on for this role. */
export interface RoleFeatureRowDto {
  key: string;
  label: string;
  /** Only these actions get a checkbox — a feature exposes what Admin holds. */
  actions: ActionKey[];
  allowed: ActionKey[];
}

export interface RolePermissionGroupDto {
  key: string;
  label: string;
  /** Null for the groups that have no module of ours yet (parity doc §D). */
  module: string | null;
  features: RoleFeatureRowDto[];
}

export interface RolePermissionsDto {
  role: string;
  label: string;
  groups: RolePermissionGroupDto[];
  /** Checkboxes ticked / total, for the header. */
  allowedCount: number;
  totalCount: number;
}

/** A role as the editor's role picker sees it. */
export interface EditableRoleDto {
  slug: string;
  label: string;
  /** False for roles the editor refuses to change; `reason` says why. */
  editable: boolean;
  reason?: string;
  allowedCount: number;
  totalCount: number;
}

export const permissionChangeSchema = z.object({
  feature: z.string().min(1),
  action: z.enum(ACTIONS),
  allowed: z.boolean(),
});

/**
 * A save is a list of changes, not a whole tree.
 *
 * Sending the full 751-row state would make two people editing different
 * groups silently overwrite each other — last writer wins, and the loser never
 * finds out. A diff only touches what was actually toggled.
 */
export const rolePermissionsUpdateSchema = z.object({
  changes: z.array(permissionChangeSchema).min(1).max(1000),
});

export type PermissionChangeInput = z.infer<typeof permissionChangeSchema>;
export type RolePermissionsUpdateInput = z.infer<typeof rolePermissionsUpdateSchema>;

export interface RolePermissionsUpdateResultDto {
  role: string;
  applied: number;
  /** Changes that asked for a toggle the feature does not expose. */
  rejected: { feature: string; action: ActionKey; reason: string }[];
  allowedCount: number;
  totalCount: number;
}
