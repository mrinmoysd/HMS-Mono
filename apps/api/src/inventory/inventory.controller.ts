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
import { RequireFeature } from '../rbac/require-feature.decorator';
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
  @RequireFeature('inventory.item', 'view')
  listItems(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.inventory.listItems(b, q);
  }
  @Post('items')
  @RequireFeature('inventory.item', 'add')
  createItem(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(inventoryItemSchema)) body: InventoryItemInput) {
    return this.inventory.createItem(u, b, body);
  }
  @Patch('items/:id')
  @RequireFeature('inventory.item', 'edit')
  updateItem(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(inventoryItemSchema)) body: InventoryItemInput) {
    return this.inventory.updateItem(u, b, id, body);
  }
  @Delete('items/:id')
  @HttpCode(204)
  @RequireFeature('inventory.item', 'delete')
  async removeItem(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.inventory.removeItem(u, b, id);
  }

  @Get('stock')
  @RequireFeature('inventory.item_stock', 'view')
  listStock(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.inventory.listStock(b, q);
  }
  @Post('stock')
  @RequireFeature('inventory.item_stock', 'add')
  addStock(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(itemStockSchema)) body: ItemStockInput) {
    return this.inventory.addStock(u, b, body);
  }
  @Patch('stock/:id')
  @RequireFeature('inventory.item_stock', 'edit')
  updateStock(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(itemStockSchema)) body: ItemStockInput) {
    return this.inventory.updateStock(u, b, id, body);
  }
  @Delete('stock/:id')
  @HttpCode(204)
  @RequireFeature('inventory.item_stock', 'delete')
  async removeStock(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.inventory.removeStock(u, b, id);
  }

  @Get('issues')
  @RequireFeature('inventory.issue_item', 'view')
  listIssues(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.inventory.listIssues(b, q);
  }
  @Post('issues')
  @RequireFeature('inventory.issue_item', 'add')
  issueItem(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(itemIssueSchema)) body: ItemIssueInput) {
    return this.inventory.issueItem(u, b, body);
  }
  // Issue Item is `bb000010` — view, add and delete, with no edit toggle at
  // all. Returning an issued item reverses the issue, so it takes `delete`;
  // amending one takes `add`. Both roles that may write here (Admin,
  // Accountant) hold add and delete identically, so the split narrows nobody —
  // it is about naming which act each handler is.
  @Post('issues/:id/return')
  @HttpCode(200)
  @RequireFeature('inventory.issue_item', 'delete')
  returnItem(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventory.returnItem(u, b, id);
  }
  @Patch('issues/:id')
  @RequireFeature('inventory.issue_item', 'add')
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
  @RequireFeature('inventory.issue_item', 'delete')
  async removeIssue(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.inventory.removeIssue(u, b, id);
  }

  // Suppliers
  @Get('suppliers')
  @RequireFeature('inventory.supplier', 'view')
  listSuppliers(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.inventory.listSuppliers(b, q);
  }

  @Post('suppliers')
  @RequireFeature('inventory.supplier', 'add')
  createSupplier(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(itemSupplierSchema)) body: ItemSupplierInput) {
    return this.inventory.createSupplier(u, b, body);
  }

  @Patch('suppliers/:id')
  @RequireFeature('inventory.supplier', 'edit')
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
  @RequireFeature('inventory.supplier', 'delete')
  async removeSupplier(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.inventory.removeSupplier(u, b, id);
  }
}
