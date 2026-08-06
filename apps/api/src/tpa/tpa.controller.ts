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
import { RequireFeature } from '../rbac/require-feature.decorator';
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
  @RequireFeature('tpa.organisation', 'view')
  list(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery) {
    return this.tpas.list(branchId, query);
  }

  @Get('report')
  @RequireFeature('tpa.organisation', 'view')
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
  @RequireFeature('tpa.organisation', 'view')
  detail(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.tpas.detail(branchId, id);
  }

  @Get(':id/charges')
  @RequireFeature('tpa.tpa_charges', 'view')
  listCharges(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Query('module') module?: string) {
    return this.tpas.listCharges(branchId, id, module || undefined);
  }

  @Post()
  @RequireFeature('tpa.organisation', 'add')
  create(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(tpaSchema)) body: TpaInput,
  ) {
    return this.tpas.create(user, branchId, body);
  }

  @Put(':id/charges/:chargeId')
  @RequireFeature('tpa.tpa_charges', 'edit')
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
  @RequireFeature('tpa.tpa_charges', 'delete')
  async removeCharge(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chargeId', ParseUUIDPipe) chargeId: string,
  ) {
    await this.tpas.removeCharge(user, branchId, id, chargeId);
  }

  // TPA Charges is `dd100010` — view, edit and delete, with no add toggle.
  // Importing a charge schedule overwrites the organisation's existing rates
  // rather than creating a new kind of thing, so it takes `edit`, the same as
  // setting one by hand.
  @Post(':id/charges/import')
  @RequireFeature('tpa.tpa_charges', 'edit')
  importCharges(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(tpaChargeImportSchema)) body: TpaChargeImportInput,
  ) {
    return this.tpas.importCharges(user, branchId, id, body);
  }

  @Patch(':id')
  @RequireFeature('tpa.organisation', 'edit')
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
  @RequireFeature('tpa.organisation', 'delete')
  async remove(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.tpas.remove(user, branchId, id);
  }
}
