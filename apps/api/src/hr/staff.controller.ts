import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ROLES,
  ROLE_META,
  listQuerySchema,
  staffPasswordSchema,
  staffSchema,
  staffUpdateSchema,
  type ListQuery,
  type RoleKey,
  type StaffInput,
  type StaffPasswordInput,
  type StaffUpdateInput,
} from '@smart-hospital/shared';
import { StaffService } from './staff.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('hr-staff')
@ApiBearerAuth()
@Controller('hr/staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  /** Staff-assignable roles (everything except the patient portal role). */
  @Get('roles')
  @RequirePermission('human_resource', 'view')
  roles() {
    return ROLES.filter((r) => r !== 'patient').map((slug) => ({ slug, label: ROLE_META[slug as RoleKey].label }));
  }

  @Get()
  @RequirePermission('human_resource', 'view')
  list(
    @BranchId() branchId: string,
    @Query('role') role: string | undefined,
    @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery,
  ) {
    return this.staff.list(branchId, role, q);
  }

  @Get(':userId')
  @RequirePermission('human_resource', 'view')
  get(@BranchId() branchId: string, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.staff.getProfile(branchId, userId);
  }

  @Post()
  @RequirePermission('human_resource', 'add')
  create(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(staffSchema)) body: StaffInput,
  ) {
    return this.staff.create(user, branchId, body);
  }

  @Patch(':userId')
  @RequirePermission('human_resource', 'edit')
  update(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body(new ZodValidationPipe(staffUpdateSchema)) body: StaffUpdateInput,
  ) {
    return this.staff.update(user, branchId, userId, body);
  }

  @Post(':userId/change-password')
  @RequirePermission('human_resource', 'edit')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body(new ZodValidationPipe(staffPasswordSchema)) body: StaffPasswordInput,
  ) {
    await this.staff.changePassword(user, branchId, userId, body.password);
  }

  @Delete(':userId')
  @HttpCode(204)
  @RequirePermission('human_resource', 'delete')
  async remove(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('userId', ParseUUIDPipe) userId: string) {
    await this.staff.remove(user, branchId, userId);
  }
}
