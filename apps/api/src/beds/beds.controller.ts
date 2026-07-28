import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  bedGroupSchema,
  bedSchema,
  listQuerySchema,
  type BedGroupInput,
  type BedInput,
  type ListQuery,
} from '@smart-hospital/shared';
import { BedsService } from './beds.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('beds')
@ApiBearerAuth()
@Controller()
export class BedsController {
  constructor(private readonly beds: BedsService) {}

  // Live occupancy grid — used by the header Bed Status overlay (view via ipd).
  @Get('beds/status')
  @RequirePermission('ipd', 'view')
  status(@BranchId() branchId: string) {
    return this.beds.status(branchId);
  }

  @Get('beds/available')
  @RequirePermission('ipd', 'view')
  available(@BranchId() branchId: string, @Query('bedGroupId') bedGroupId?: string) {
    return this.beds.availableBeds(branchId, bedGroupId);
  }

  @Get('beds')
  @RequirePermission('setup', 'view')
  listBeds(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.beds.listBeds(branchId, q);
  }

  @Post('beds')
  @RequirePermission('setup', 'add')
  createBed(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(bedSchema)) body: BedInput,
  ) {
    return this.beds.createBed(user, branchId, body);
  }

  @Patch('beds/:id')
  @RequirePermission('setup', 'edit')
  updateBed(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(bedSchema)) body: BedInput,
  ) {
    return this.beds.updateBed(user, branchId, id, body);
  }

  @Delete('beds/:id')
  @HttpCode(204)
  @RequirePermission('setup', 'delete')
  async removeBed(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.beds.removeBed(user, branchId, id);
  }

  @Get('bed-groups')
  @RequirePermission('setup', 'view')
  listGroups(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.beds.listGroups(branchId, q);
  }

  @Post('bed-groups')
  @RequirePermission('setup', 'add')
  createGroup(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(bedGroupSchema)) body: BedGroupInput,
  ) {
    return this.beds.createGroup(user, branchId, body);
  }

  @Patch('bed-groups/:id')
  @RequirePermission('setup', 'edit')
  updateGroup(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(bedGroupSchema)) body: BedGroupInput,
  ) {
    return this.beds.updateGroup(user, branchId, id, body);
  }

  @Delete('bed-groups/:id')
  @HttpCode(204)
  @RequirePermission('setup', 'delete')
  async removeGroup(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.beds.removeGroup(user, branchId, id);
  }
}
