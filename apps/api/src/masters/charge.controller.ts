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
  taxCategorySchema,
  type ChargeInput,
  type ChargeScheduleUpdateInput,
  type ChargeTypeInput,
  type ListQuery,
  type TaxCategoryInput,
} from '@smart-hospital/shared';
import { ChargeService } from './charge.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
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
  @RequirePermission('setup', 'view')
  listTax(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.charges.listTax(branchId, q);
  }

  @Post('tax-categories')
  @RequirePermission('setup', 'add')
  createTax(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(taxCategorySchema)) body: TaxCategoryInput,
  ) {
    return this.charges.createTax(user, branchId, body);
  }

  @Patch('tax-categories/:id')
  @RequirePermission('setup', 'edit')
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
  @RequirePermission('setup', 'delete')
  async removeTax(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.charges.removeTax(user, branchId, id);
  }

  // Charge types (name + module-visibility matrix)
  @Get('charge-types')
  @RequirePermission('setup', 'view')
  listTypes(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.charges.listTypes(branchId, q);
  }

  @Post('charge-types')
  @RequirePermission('setup', 'add')
  createType(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(chargeTypeSchema)) body: ChargeTypeInput,
  ) {
    return this.charges.createType(user, branchId, body);
  }

  @Patch('charge-types/:id')
  @RequirePermission('setup', 'edit')
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
  @RequirePermission('setup', 'delete')
  async removeType(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.charges.removeType(user, branchId, id);
  }

  // Charges
  @Get('charges')
  @RequirePermission('setup', 'view')
  list(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.charges.list(branchId, q);
  }

  @Get('charges/:id')
  @RequirePermission('setup', 'view')
  detail(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.charges.detail(branchId, id);
  }

  @Get('charges/:id/schedule')
  @RequirePermission('setup', 'view')
  getSchedule(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.charges.getSchedule(branchId, id);
  }

  @Put('charges/:id/schedule')
  @RequirePermission('setup', 'edit')
  updateSchedule(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(chargeScheduleUpdateSchema)) body: ChargeScheduleUpdateInput,
  ) {
    return this.charges.updateSchedule(user, branchId, id, body);
  }

  @Post('charges')
  @RequirePermission('setup', 'add')
  create(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(chargeSchema)) body: ChargeInput,
  ) {
    return this.charges.create(user, branchId, body);
  }

  @Patch('charges/:id')
  @RequirePermission('setup', 'edit')
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
  @RequirePermission('setup', 'delete')
  async remove(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.charges.remove(user, branchId, id);
  }
}
