import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  inventoryItemSchema,
  itemIssueSchema,
  itemStockSchema,
  itemSupplierSchema,
  listQuerySchema,
  type InventoryItemInput,
  type ItemIssueInput,
  type ItemStockInput,
  type ItemSupplierInput,
  type ListQuery,
} from '@smart-hospital/shared';
import { InventoryService } from './inventory.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('items')
  @RequirePermission('inventory', 'view')
  listItems(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.inventory.listItems(b, q);
  }
  @Post('items')
  @RequirePermission('inventory', 'add')
  createItem(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(inventoryItemSchema)) body: InventoryItemInput) {
    return this.inventory.createItem(u, b, body);
  }
  @Patch('items/:id')
  @RequirePermission('inventory', 'edit')
  updateItem(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(inventoryItemSchema)) body: InventoryItemInput) {
    return this.inventory.updateItem(u, b, id, body);
  }
  @Delete('items/:id')
  @HttpCode(204)
  @RequirePermission('inventory', 'delete')
  async removeItem(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.inventory.removeItem(u, b, id);
  }

  @Get('stock')
  @RequirePermission('inventory', 'view')
  listStock(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.inventory.listStock(b, q);
  }
  @Post('stock')
  @RequirePermission('inventory', 'add')
  addStock(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(itemStockSchema)) body: ItemStockInput) {
    return this.inventory.addStock(u, b, body);
  }
  @Patch('stock/:id')
  @RequirePermission('inventory', 'edit')
  updateStock(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(itemStockSchema)) body: ItemStockInput) {
    return this.inventory.updateStock(u, b, id, body);
  }
  @Delete('stock/:id')
  @HttpCode(204)
  @RequirePermission('inventory', 'delete')
  async removeStock(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.inventory.removeStock(u, b, id);
  }

  @Get('issues')
  @RequirePermission('inventory', 'view')
  listIssues(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.inventory.listIssues(b, q);
  }
  @Post('issues')
  @RequirePermission('inventory', 'add')
  issueItem(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(itemIssueSchema)) body: ItemIssueInput) {
    return this.inventory.issueItem(u, b, body);
  }
  @Post('issues/:id/return')
  @HttpCode(200)
  @RequirePermission('inventory', 'edit')
  returnItem(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventory.returnItem(u, b, id);
  }
  @Patch('issues/:id')
  @RequirePermission('inventory', 'edit')
  updateIssue(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(itemIssueSchema)) body: ItemIssueInput,
  ) {
    return this.inventory.updateIssue(user, branchId, id, body);
  }

  @Delete('issues/:id')
  @HttpCode(204)
  @RequirePermission('inventory', 'delete')
  async removeIssue(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.inventory.removeIssue(u, b, id);
  }

  // Suppliers
  @Get('suppliers')
  @RequirePermission('inventory', 'view')
  listSuppliers(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.inventory.listSuppliers(b, q);
  }

  @Post('suppliers')
  @RequirePermission('inventory', 'add')
  createSupplier(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(itemSupplierSchema)) body: ItemSupplierInput) {
    return this.inventory.createSupplier(u, b, body);
  }

  @Patch('suppliers/:id')
  @RequirePermission('inventory', 'edit')
  updateSupplier(
    @CurrentUser() u: RequestUser,
    @BranchId() b: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(itemSupplierSchema)) body: ItemSupplierInput,
  ) {
    return this.inventory.updateSupplier(u, b, id, body);
  }

  @Delete('suppliers/:id')
  @HttpCode(204)
  @RequirePermission('inventory', 'delete')
  async removeSupplier(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.inventory.removeSupplier(u, b, id);
  }
}
