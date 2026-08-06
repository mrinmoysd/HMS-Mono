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
import { RequireFeature } from '../rbac/require-feature.decorator';
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
  @RequireFeature('human_resource.staff', 'view')
  roles() {
    return ROLES.filter((r) => r !== 'patient').map((slug) => ({ slug, label: ROLE_META[slug as RoleKey].label }));
  }

  @Get()
  @RequireFeature('human_resource.staff', 'view')
  list(
    @BranchId() branchId: string,
    @Query('role') role: string | undefined,
    @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery,
  ) {
    return this.staff.list(branchId, role, q);
  }

  @Get(':userId')
  @RequireFeature('human_resource.staff', 'view')
  get(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.staff.getProfileForUser(user, branchId, userId);
  }

  @Post()
  @RequireFeature('human_resource.staff', 'add')
  create(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(staffSchema)) body: StaffInput,
  ) {
    return this.staff.create(user, branchId, body);
  }

  @Patch(':userId')
  @RequireFeature('human_resource.staff', 'edit')
  update(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body(new ZodValidationPipe(staffUpdateSchema)) body: StaffUpdateInput,
  ) {
    return this.staff.update(user, branchId, userId, body);
  }

  @Post(':userId/change-password')
  @RequireFeature('human_resource.staff', 'edit')
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
  @RequireFeature('human_resource.staff', 'delete')
  async remove(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('userId', ParseUUIDPipe) userId: string) {
    await this.staff.remove(user, branchId, userId);
  }
}
