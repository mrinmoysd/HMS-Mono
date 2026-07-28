import type { ModuleKey } from './modules';
import type { ActionKey, ModuleGrant } from './roles';

/**
 * A flat, serializable permission set that both the API (guards) and the web
 * (sidebar / button gating) consume. Built from the user's role_permission rows.
 *
 * Key format: `${module}:${action}` e.g. "patient:add".
 */
export type PermissionKey = `${ModuleKey}:${ActionKey}`;

export function grantsToPermissionKeys(grants: ModuleGrant[]): PermissionKey[] {
  const keys: PermissionKey[] = [];
  for (const g of grants) {
    if (g.view) keys.push(`${g.module}:view`);
    if (g.add) keys.push(`${g.module}:add`);
    if (g.edit) keys.push(`${g.module}:edit`);
    if (g.delete) keys.push(`${g.module}:delete`);
  }
  return keys;
}

/** Lightweight ability wrapper — mirrors CASL's `can` for use on the web. */
export class Ability {
  private readonly set: Set<string>;
  constructor(permissions: PermissionKey[]) {
    this.set = new Set(permissions);
  }
  can(module: ModuleKey, action: ActionKey): boolean {
    return this.set.has(`${module}:${action}`);
  }
  /** Any action on the module → should it appear in the sidebar. */
  canAccess(module: ModuleKey): boolean {
    return this.can(module, 'view');
  }
  toJSON(): PermissionKey[] {
    return [...this.set] as PermissionKey[];
  }
}
