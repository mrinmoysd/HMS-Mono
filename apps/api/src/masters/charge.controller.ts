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
  chargeSchema,
  chargeScheduleUpdateSchema,
  chargeTypeSchema,
  listQuerySchema,
  chargeListQuerySchema,
  type ChargeListQuery,
  taxCategorySchema,
  type ChargeInput,
  type ChargeScheduleUpdateInput,
  type ChargeTypeInput,
  type ListQuery,
  type TaxCategoryInput,
} from '@smart-hospital/shared';
import { ChargeService } from './charge.service';
import { RequireFeature } from '../rbac/require-feature.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('charges')
@ApiBearerAuth()
@Controller()
export class ChargeController {
  constructor(private readonly charges: ChargeService) {}

  // Tax categories
  @Get('tax-categories')
  @RequireFeature('hospital_charges.tax_category', 'view')
  listTax(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.charges.listTax(branchId, q);
  }

  @Post('tax-categories')
  @RequireFeature('hospital_charges.tax_category', 'add')
  createTax(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(taxCategorySchema)) body: TaxCategoryInput,
  ) {
    return this.charges.createTax(user, branchId, body);
  }

  @Patch('tax-categories/:id')
  @RequireFeature('hospital_charges.tax_category', 'edit')
  updateTax(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(taxCategorySchema)) body: TaxCategoryInput,
  ) {
    return this.charges.updateTax(user, branchId, id, body);
  }

  @Delete('tax-categories/:id')
  @HttpCode(204)
  @RequireFeature('hospital_charges.tax_category', 'delete')
  async removeTax(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.charges.removeTax(user, branchId, id);
  }

  // Charge types (name + module-visibility matrix)
  @Get('charge-types')
  @RequireFeature('hospital_charges.charge_type', 'view')
  listTypes(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.charges.listTypes(branchId, q);
  }

  @Post('charge-types')
  @RequireFeature('hospital_charges.charge_type', 'add')
  createType(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(chargeTypeSchema)) body: ChargeTypeInput,
  ) {
    return this.charges.createType(user, branchId, body);
  }

  // Charge Type is `fb0b0b00` — view, add and delete, with no edit toggle.
  // Amending one therefore takes `add`; Accountant, Pharmacist and Radiologist
  // hold add and delete together, so nobody is narrowed by the choice.
  @Patch('charge-types/:id')
  @RequireFeature('hospital_charges.charge_type', 'add')
  updateType(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(chargeTypeSchema)) body: ChargeTypeInput,
  ) {
    return this.charges.updateType(user, branchId, id, body);
  }

  @Delete('charge-types/:id')
  @HttpCode(204)
  @RequireFeature('hospital_charges.charge_type', 'delete')
  async removeType(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.charges.removeType(user, branchId, id);
  }

  // Charges
  @Get('charges')
  @RequireFeature('hospital_charges.hospital_charges', 'view')
  list(
    @BranchId() branchId: string,
    @Query(new ZodValidationPipe(chargeListQuerySchema)) q: ChargeListQuery,
  ) {
    return this.charges.list(branchId, q);
  }

  @Get('charges/:id')
  @RequireFeature('hospital_charges.hospital_charges', 'view')
  detail(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.charges.detail(branchId, id);
  }

  @Get('charges/:id/schedule')
  @RequireFeature('hospital_charges.hospital_charges', 'view')
  getSchedule(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.charges.getSchedule(branchId, id);
  }

  @Put('charges/:id/schedule')
  @RequireFeature('hospital_charges.hospital_charges', 'edit')
  updateSchedule(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(chargeScheduleUpdateSchema)) body: ChargeScheduleUpdateInput,
  ) {
    return this.charges.updateSchedule(user, branchId, id, body);
  }

  @Post('charges')
  @RequireFeature('hospital_charges.hospital_charges', 'add')
  create(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(chargeSchema)) body: ChargeInput,
  ) {
    return this.charges.create(user, branchId, body);
  }

  @Patch('charges/:id')
  @RequireFeature('hospital_charges.hospital_charges', 'edit')
  update(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(chargeSchema)) body: ChargeInput,
  ) {
    return this.charges.update(user, branchId, id, body);
  }

  @Delete('charges/:id')
  @HttpCode(204)
  @RequireFeature('hospital_charges.hospital_charges', 'delete')
  async remove(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.charges.remove(user, branchId, id);
  }
}
