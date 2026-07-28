import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  OPD_TABS,
  listQuerySchema,
  moveToIpdSchema,
  opdVisitSchema,
  opdVisitUpdateSchema,
  type ListQuery,
  type MoveToIpdInput,
  type OpdTab,
  type OpdVisitInput,
  type OpdVisitUpdateInput,
} from '@smart-hospital/shared';
import { OpdService } from './opd.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('opd')
@ApiBearerAuth()
@Controller('opd')
export class OpdController {
  constructor(private readonly opd: OpdService) {}

  @Get()
  @RequirePermission('opd', 'view')
  list(
    @BranchId() branchId: string,
    @Query('tab') tab: string | undefined,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    const safeTab: OpdTab = (OPD_TABS as readonly string[]).includes(tab ?? '')
      ? (tab as OpdTab)
      : 'today';
    return this.opd.list(branchId, safeTab, query);
  }

  @Post()
  @RequirePermission('opd', 'add')
  create(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(opdVisitSchema)) body: OpdVisitInput,
  ) {
    return this.opd.create(user, branchId, body);
  }

  @Get(':id')
  @RequirePermission('opd', 'view')
  detail(@BranchId() branchId: string, @Param('id') id: string) {
    return this.opd.detail(branchId, id);
  }

  @Patch(':id')
  @RequirePermission('opd', 'edit')
  update(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(opdVisitUpdateSchema)) body: OpdVisitUpdateInput,
  ) {
    return this.opd.update(user, branchId, id, body);
  }

  @Delete(':id')
  @RequirePermission('opd', 'delete')
  remove(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id') id: string) {
    return this.opd.remove(user, branchId, id);
  }

  @Post(':id/move-to-ipd')
  @RequirePermission('ipd', 'add')
  moveToIpd(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveToIpdSchema)) body: MoveToIpdInput,
  ) {
    return this.opd.moveToIpd(user, branchId, id, body);
  }
}
