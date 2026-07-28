import { SetMetadata } from '@nestjs/common';
import type { ActionKey, ModuleKey } from '@smart-hospital/shared';

export const PERMISSION_KEY = 'required_permission';

export interface RequiredPermission {
  module: ModuleKey;
  action: ActionKey;
}

/**
 * Guard a handler with a required (module, action) permission.
 * Example: @RequirePermission('patient', 'add')
 */
export const RequirePermission = (module: ModuleKey, action: ActionKey) =>
  SetMetadata(PERMISSION_KEY, { module, action } satisfies RequiredPermission);
