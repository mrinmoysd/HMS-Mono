import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  InventoryItemDto,
  InventoryItemInput,
  ItemIssueDto,
  ItemIssueInput,
  ItemStockDto,
  ItemStockInput,
  ItemSupplierDto,
  ItemSupplierInput,
  ListQuery,
  Paginated,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async names(userIds: (string | null | undefined)[]): Promise<Map<string, { name: string; staffNo: string | null }>> {
    const unique = [...new Set(userIds.filter((x): x is string => !!x))];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true, staffProfile: { select: { staffNo: true } } },
    });
    return new Map(users.map((u) => [u.id, { name: u.name, staffNo: u.staffProfile?.staffNo ?? null }]));
  }

  /** Available = stocked − (issued that isn't returned). */
  private available(item: { stocks: { qty: number }[]; issues: { qty: number; status: string }[] }): number {
    const stocked = item.stocks.reduce((s, x) => s + x.qty, 0);
    const issued = item.issues.filter((i) => i.status !== 'returned').reduce((s, x) => s + x.qty, 0);
    return stocked - issued;
  }

  // ── Items ────────────────────────────────────────────────────
  async listItems(branchId: string, query: ListQuery): Promise<Paginated<InventoryItemDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.InventoryItemWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({ where, skip, take, orderBy: orderBy ?? { createdAt: 'desc' }, include: { stocks: { where: { deletedAt: null } }, issues: { where: { deletedAt: null } } } }),
      this.prisma.inventoryItem.count({ where }),
    ]);
    const catIds = rows.map((r) => r.categoryId).filter((x): x is string => !!x);
    const cats = catIds.length ? await this.prisma.itemCategory.findMany({ where: { id: { in: catIds } } }) : [];
    const cMap = new Map(cats.map((c) => [c.id, c.name]));
    return paginate(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        categoryId: r.categoryId,
        categoryName: r.categoryId ? cMap.get(r.categoryId) ?? null : null,
        unit: r.unit,
        description: r.description,
        availableQuantity: this.available(r),
      })),
      total,
      query,
    );
  }

  private async itemDto(branchId: string, id: string): Promise<InventoryItemDto> {
    const r = await this.prisma.inventoryItem.findFirst({ where: { id, branchId, deletedAt: null }, include: { stocks: { where: { deletedAt: null } }, issues: { where: { deletedAt: null } } } });
    if (!r) throw new NotFoundException('Item not found');
    const cat = r.categoryId ? await this.prisma.itemCategory.findUnique({ where: { id: r.categoryId } }) : null;
    return { id: r.id, name: r.name, categoryId: r.categoryId, categoryName: cat?.name ?? null, unit: r.unit, description: r.description, availableQuantity: this.available(r) };
  }

  async createItem(user: RequestUser, branchId: string, input: InventoryItemInput): Promise<InventoryItemDto> {
    const item = await this.prisma.inventoryItem.create({
      data: { branchId, name: input.name, categoryId: input.categoryId ?? null, unit: input.unit || null, description: input.description || null },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'inventory_item', entityId: item.id });
    return this.itemDto(branchId, item.id);
  }

  async updateItem(user: RequestUser, branchId: string, id: string, input: InventoryItemInput): Promise<InventoryItemDto> {
    const existing = await this.prisma.inventoryItem.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Item not found');
    await this.prisma.inventoryItem.update({ where: { id }, data: { name: input.name, categoryId: input.categoryId ?? null, unit: input.unit || null, description: input.description || null } });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'inventory_item', entityId: id });
    return this.itemDto(branchId, id);
  }

  async removeItem(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.inventoryItem.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Item not found');
    await this.prisma.inventoryItem.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'inventory_item', entityId: id });
  }

  // ── Item stock (purchases) ───────────────────────────────────
  async listStock(branchId: string, query: ListQuery): Promise<Paginated<ItemStockDto>> {
    const { skip, take } = toPrismaPage(query);
    const where: Prisma.ItemStockWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { item: { name: { contains: query.search, mode: 'insensitive' } } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.itemStock.findMany({ where, skip, take, orderBy: { date: 'desc' }, include: { item: { include: { } } } }),
      this.prisma.itemStock.count({ where }),
    ]);
    const catIds = [...new Set(rows.map((r) => r.item.categoryId).filter((x): x is string => !!x))];
    const supIds = [...new Set(rows.map((r) => r.supplierId).filter((x): x is string => !!x))];
    const storeIds = [...new Set(rows.map((r) => r.storeId).filter((x): x is string => !!x))];
    const [cats, sups, stores, nameMap] = await Promise.all([
      catIds.length ? this.prisma.itemCategory.findMany({ where: { id: { in: catIds } } }) : Promise.resolve([]),
      supIds.length ? this.prisma.itemSupplier.findMany({ where: { id: { in: supIds } } }) : Promise.resolve([]),
      storeIds.length ? this.prisma.itemStore.findMany({ where: { id: { in: storeIds } } }) : Promise.resolve([]),
      this.names(rows.map((r) => r.createdById)),
    ]);
    const cMap = new Map(cats.map((c) => [c.id, c.name]));
    const sMap = new Map(sups.map((s) => [s.id, s.name]));
    const stMap = new Map(stores.map((s) => [s.id, s.name]));
    return paginate(
      rows.map((r) => {
        const gen = r.createdById ? nameMap.get(r.createdById) : undefined;
        return {
          id: r.id,
          itemId: r.itemId,
          itemName: r.item.name,
          categoryName: r.item.categoryId ? cMap.get(r.item.categoryId) ?? null : null,
          supplierId: r.supplierId,
          supplierName: r.supplierId ? sMap.get(r.supplierId) ?? null : null,
          storeId: r.storeId,
          storeName: r.storeId ? stMap.get(r.storeId) ?? null : null,
          date: r.date.toISOString(),
          description: r.description,
          totalQuantity: r.qty,
          purchasePrice: Number(r.purchasePrice),
          documentUrl: r.documentUrl,
          generatedByName: gen?.name ?? null,
          generatedByNo: gen?.staffNo ?? null,
        };
      }),
      total,
      query,
    );
  }

  async addStock(user: RequestUser, branchId: string, input: ItemStockInput): Promise<{ ok: true }> {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id: input.itemId, branchId, deletedAt: null } });
    if (!item) throw new NotFoundException('Item not found');
    await this.prisma.itemStock.create({
      data: { branchId, itemId: input.itemId, supplierId: input.supplierId ?? null, storeId: input.storeId ?? null, qty: input.qty, purchasePrice: input.purchasePrice, description: input.description || null, documentUrl: input.documentUrl || null, date: input.date, createdById: user.id },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'add_stock', entity: 'item_stock', entityId: input.itemId });
    return { ok: true };
  }

  async updateStock(user: RequestUser, branchId: string, id: string, input: ItemStockInput): Promise<{ ok: true }> {
    const existing = await this.prisma.itemStock.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Stock not found');
    await this.prisma.itemStock.update({
      where: { id },
      data: { itemId: input.itemId, supplierId: input.supplierId ?? null, storeId: input.storeId ?? null, qty: input.qty, purchasePrice: input.purchasePrice, description: input.description || null, documentUrl: input.documentUrl !== undefined ? input.documentUrl || null : existing.documentUrl, date: input.date },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'item_stock', entityId: id });
    return { ok: true };
  }

  async removeStock(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.itemStock.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Stock not found');
    await this.prisma.itemStock.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'item_stock', entityId: id });
  }

  // ── Item issue + return ──────────────────────────────────────
  async issueItem(user: RequestUser, branchId: string, input: ItemIssueInput): Promise<{ ok: true }> {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: input.itemId, branchId, deletedAt: null },
      include: { stocks: { where: { deletedAt: null } }, issues: { where: { deletedAt: null } } },
    });
    if (!item) throw new NotFoundException('Item not found');
    const available = this.available(item);
    if (available < input.qty) throw new BadRequestException(`Insufficient stock for ${item.name} (have ${available}, need ${input.qty})`);
    await this.prisma.itemIssue.create({
      data: { branchId, itemId: input.itemId, userType: input.userType || null, issuedTo: input.issuedTo || null, qty: input.qty, note: input.note || null, date: input.date, returnDate: input.returnDate ?? null, status: 'issued', createdById: user.id },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'issue', entity: 'item_issue', entityId: input.itemId });
    return { ok: true };
  }

  async returnItem(user: RequestUser, branchId: string, id: string): Promise<{ ok: true }> {
    const existing = await this.prisma.itemIssue.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Issue not found');
    if (existing.status === 'returned') throw new BadRequestException('Item already returned');
    await this.prisma.itemIssue.update({ where: { id }, data: { status: 'returned', returnedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'return', entity: 'item_issue', entityId: id });
    return { ok: true };
  }

  async removeIssue(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.itemIssue.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Issue not found');
    await this.prisma.itemIssue.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'item_issue', entityId: id });
  }

  async listIssues(branchId: string, query: ListQuery): Promise<Paginated<ItemIssueDto>> {
    const { skip, take } = toPrismaPage(query);
    const where: Prisma.ItemIssueWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { item: { name: { contains: query.search, mode: 'insensitive' } } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.itemIssue.findMany({ where, skip, take, orderBy: { date: 'desc' }, include: { item: true } }),
      this.prisma.itemIssue.count({ where }),
    ]);
    const catIds = [...new Set(rows.map((r) => r.item.categoryId).filter((x): x is string => !!x))];
    const cats = catIds.length ? await this.prisma.itemCategory.findMany({ where: { id: { in: catIds } } }) : [];
    const cMap = new Map(cats.map((c) => [c.id, c.name]));
    const nameMap = await this.names(rows.map((r) => r.createdById));
    return paginate(
      rows.map((r) => ({
        id: r.id,
        itemId: r.itemId,
        itemName: r.item.name,
        categoryName: r.item.categoryId ? cMap.get(r.item.categoryId) ?? null : null,
        issueDate: r.date.toISOString(),
        returnDate: r.returnDate ? r.returnDate.toISOString() : null,
        issuedTo: r.issuedTo,
        issuedByName: r.createdById ? nameMap.get(r.createdById)?.name ?? null : null,
        qty: r.status === 'returned' ? 0 : r.qty,
        note: r.note,
        status: r.status,
      })),
      total,
      query,
    );
  }

  // ── Suppliers ────────────────────────────────────────────────
  async listSuppliers(branchId: string, query: ListQuery): Promise<Paginated<ItemSupplierDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.ItemSupplierWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.itemSupplier.findMany({ where, skip, take, orderBy }),
      this.prisma.itemSupplier.count({ where }),
    ]);
    return paginate(rows.map(toSupplierDto), total, query);
  }

  async createSupplier(user: RequestUser, branchId: string, input: ItemSupplierInput): Promise<ItemSupplierDto> {
    const s = await this.prisma.itemSupplier.create({
      data: {
        branchId,
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        contactPerson: input.contactPerson || null,
        contactPhone: input.contactPhone || null,
        contactEmail: input.contactEmail || null,
        address: input.address || null,
        description: input.description || null,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'item_supplier', entityId: s.id });
    return toSupplierDto(s);
  }

  async updateSupplier(
    user: RequestUser,
    branchId: string,
    id: string,
    input: ItemSupplierInput,
  ): Promise<ItemSupplierDto> {
    const existing = await this.prisma.itemSupplier.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Supplier not found');
    const s = await this.prisma.itemSupplier.update({
      where: { id },
      data: {
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        contactPerson: input.contactPerson || null,
        contactPhone: input.contactPhone || null,
        contactEmail: input.contactEmail || null,
        address: input.address || null,
        description: input.description || null,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'item_supplier', entityId: id });
    return toSupplierDto(s);
  }

  async removeSupplier(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.itemSupplier.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Supplier not found');
    await this.prisma.itemSupplier.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'item_supplier', entityId: id });
  }
}

function toSupplierDto(s: {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  description: string | null;
  createdAt: Date;
}): ItemSupplierDto {
  return {
    id: s.id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    contactPerson: s.contactPerson,
    contactPhone: s.contactPhone,
    contactEmail: s.contactEmail,
    address: s.address,
    description: s.description,
    createdAt: s.createdAt.toISOString(),
  };
}
