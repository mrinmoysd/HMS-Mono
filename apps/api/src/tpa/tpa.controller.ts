import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  listQuerySchema,
  tpaChargeImportSchema,
  tpaChargeUpdateSchema,
  tpaSchema,
  type ListQuery,
  type TpaChargeImportInput,
  type TpaChargeUpdateInput,
  type TpaInput,
} from '@smart-hospital/shared';
import { TpaService, type TpaReportFilters } from './tpa.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('tpa')
@ApiBearerAuth()
@Controller('tpas')
export class TpaController {
  constructor(private readonly tpas: TpaService) {}

  @Get()
  @RequirePermission('tpa', 'view')
  list(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery) {
    return this.tpas.list(branchId, query);
  }

  @Get('report')
  @RequirePermission('tpa', 'view')
  report(
    @BranchId() branchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('doctorId') doctorId?: string,
    @Query('tpaId') tpaId?: string,
    @Query('caseId') caseId?: string,
    @Query('chargeCategoryId') chargeCategoryId?: string,
    @Query('chargeId') chargeId?: string,
  ) {
    const filters: TpaReportFilters = { from, to, doctorId, tpaId, caseId, chargeCategoryId, chargeId };
    return this.tpas.report(branchId, filters);
  }

  @Get(':id')
  @RequirePermission('tpa', 'view')
  detail(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.tpas.detail(branchId, id);
  }

  @Get(':id/charges')
  @RequirePermission('tpa', 'view')
  listCharges(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Query('module') module?: string) {
    return this.tpas.listCharges(branchId, id, module || undefined);
  }

  @Post()
  @RequirePermission('tpa', 'add')
  create(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(tpaSchema)) body: TpaInput,
  ) {
    return this.tpas.create(user, branchId, body);
  }

  @Put(':id/charges/:chargeId')
  @RequirePermission('tpa', 'edit')
  setCharge(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chargeId', ParseUUIDPipe) chargeId: string,
    @Body(new ZodValidationPipe(tpaChargeUpdateSchema)) body: TpaChargeUpdateInput,
  ) {
    return this.tpas.setCharge(user, branchId, id, chargeId, body.amount);
  }

  @Delete(':id/charges/:chargeId')
  @HttpCode(204)
  @RequirePermission('tpa', 'edit')
  async removeCharge(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chargeId', ParseUUIDPipe) chargeId: string,
  ) {
    await this.tpas.removeCharge(user, branchId, id, chargeId);
  }

  @Post(':id/charges/import')
  @RequirePermission('tpa', 'edit')
  importCharges(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(tpaChargeImportSchema)) body: TpaChargeImportInput,
  ) {
    return this.tpas.importCharges(user, branchId, id, body);
  }

  @Patch(':id')
  @RequirePermission('tpa', 'edit')
  update(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(tpaSchema)) body: TpaInput,
  ) {
    return this.tpas.update(user, branchId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('tpa', 'delete')
  async remove(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.tpas.remove(user, branchId, id);
  }
}
