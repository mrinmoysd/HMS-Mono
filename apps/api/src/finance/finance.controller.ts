import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ledgerEntrySchema, listQuerySchema, type LedgerEntryInput, type ListQuery } from '@smart-hospital/shared';
import { FinanceService } from './finance.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('summary')
  @RequirePermission('finance', 'view')
  summary(@BranchId() branchId: string) {
    return this.finance.summary(branchId);
  }

  @Get('income')
  @RequirePermission('finance', 'view')
  listIncome(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.finance.list('income', branchId, q);
  }

  @Post('income')
  @RequirePermission('finance', 'add')
  createIncome(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(ledgerEntrySchema)) body: LedgerEntryInput,
  ) {
    return this.finance.create('income', user, branchId, body);
  }

  @Patch('income/:id')
  @RequirePermission('finance', 'edit')
  updateIncome(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(ledgerEntrySchema)) body: LedgerEntryInput) {
    return this.finance.update('income', user, branchId, id, body);
  }

  @Delete('income/:id')
  @HttpCode(204)
  @RequirePermission('finance', 'delete')
  async removeIncome(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.finance.remove('income', user, branchId, id);
  }

  @Get('expense')
  @RequirePermission('finance', 'view')
  listExpense(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.finance.list('expense', branchId, q);
  }

  @Post('expense')
  @RequirePermission('finance', 'add')
  createExpense(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(ledgerEntrySchema)) body: LedgerEntryInput,
  ) {
    return this.finance.create('expense', user, branchId, body);
  }

  @Patch('expense/:id')
  @RequirePermission('finance', 'edit')
  updateExpense(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(ledgerEntrySchema)) body: LedgerEntryInput) {
    return this.finance.update('expense', user, branchId, id, body);
  }

  @Delete('expense/:id')
  @HttpCode(204)
  @RequirePermission('finance', 'delete')
  async removeExpense(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.finance.remove('expense', user, branchId, id);
  }
}
