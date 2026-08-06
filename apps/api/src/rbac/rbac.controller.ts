import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { rolePermissionsUpdateSchema, type RolePermissionsUpdateInput } from '@smart-hospital/shared';
import { RolePermissionsService } from './role-permissions.service';
import { RequireRole } from './require-role.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

/**
 * The permission editor's API (parity doc, Phase R2).
 *
 * **The read endpoint is guarded, unlike the reference's.** Part I §7 records
 * that its `/admin/roles/permission/{id}` renders the full permission set to
 * any authenticated user and accepts a submit from them too. That is listed as
 * anti-parity: a defect to diverge from, not a behaviour to reproduce. Both
 * endpoints here carry the same restriction.
 *
 * The restriction is by role rather than by permission, which is the one place
 * in this codebase that is true. require-role.decorator.ts explains why: any
 * permission that gates the permission editor can be revoked using the
 * permission editor.
 */
@ApiTags('rbac')
@ApiBearerAuth()
@Controller('rbac')
export class RbacController {
  constructor(private readonly rolePermissions: RolePermissionsService) {}

  @Get('roles')
  @RequireRole('super_admin', 'admin')
  listRoles() {
    return this.rolePermissions.listRoles();
  }

  @Get('roles/:slug/permissions')
  @RequireRole('super_admin', 'admin')
  get(@Param('slug') slug: string) {
    return this.rolePermissions.get(slug);
  }

  @Put('roles/:slug/permissions')
  @RequireRole('super_admin', 'admin')
  update(
    @CurrentUser() user: RequestUser,
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(rolePermissionsUpdateSchema)) body: RolePermissionsUpdateInput,
  ) {
    return this.rolePermissions.update(user, slug, body);
  }
}
