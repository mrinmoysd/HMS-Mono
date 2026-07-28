import { Injectable, NotFoundException } from '@nestjs/common';
import type { CatalogItemDto, ListQuery, NameCatalogKey, Paginated } from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

/** Prisma model backing each name-only catalog key. */
const CATALOG_MODEL: Record<NameCatalogKey, string> = {
  'charge-category': 'chargeCategory',
  'unit-type': 'unitType',
  floor: 'floor',
  'bed-type': 'bedType',
  'medicine-category': 'medicineCategory',
  'operation-category': 'operationCategory',
  'income-head': 'incomeHead',
  'expense-head': 'expenseHead',
  department: 'department',
  designation: 'designation',
  specialization: 'specialization',
  'finding-category': 'findingCategory',
  'symptom-head': 'symptomHead',
  'front-office-purpose': 'frontOfficePurpose',
  'complaint-type': 'complaintType',
  'content-type': 'contentType',
  'item-category': 'itemCategory',
  'item-store': 'itemStore',
  'pharma-company': 'pharmaCompany',
  'medicine-group': 'medicineGroup',
  'pharma-unit': 'pharmaUnit',
  'dosage-interval': 'dosageInterval',
  'dosage-duration': 'dosageDuration',
  'referral-category': 'referralCategory',
};

/**
 * Generic CRUD for simple `{ id, name, branchId }` catalogs. One engine backs
 * the dozens of Setup master lists (FRD §2.29.2), keyed by catalog name.
 */
@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private delegate(catalog: NameCatalogKey) {
    const model = CATALOG_MODEL[catalog];
    if (!model) throw new NotFoundException(`Unknown catalog: ${catalog}`);
    // Dynamic model access — all name catalogs share the same delegate shape.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.prisma as any)[model];
  }

  async list(
    catalog: NameCatalogKey,
    branchId: string,
    query: ListQuery,
  ): Promise<Paginated<CatalogItemDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where = {
      branchId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const delegate = this.delegate(catalog);
    const [rows, total] = await this.prisma.$transaction([
      delegate.findMany({ where, skip, take, orderBy }),
      delegate.count({ where }),
    ]);
    return paginate(rows.map(toDto), total, query);
  }

  async create(
    catalog: NameCatalogKey,
    user: RequestUser,
    branchId: string,
    name: string,
  ): Promise<CatalogItemDto> {
    const row = await this.delegate(catalog).create({ data: { name, branchId } });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: catalog, entityId: row.id });
    return toDto(row);
  }

  async update(
    catalog: NameCatalogKey,
    user: RequestUser,
    branchId: string,
    id: string,
    name: string,
  ): Promise<CatalogItemDto> {
    await this.ensure(catalog, branchId, id);
    const row = await this.delegate(catalog).update({ where: { id }, data: { name } });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: catalog, entityId: id });
    return toDto(row);
  }

  async remove(catalog: NameCatalogKey, user: RequestUser, branchId: string, id: string): Promise<void> {
    await this.ensure(catalog, branchId, id);
    await this.delegate(catalog).update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: catalog, entityId: id });
  }

  private async ensure(catalog: NameCatalogKey, branchId: string, id: string): Promise<void> {
    const found = await this.delegate(catalog).findFirst({ where: { id, branchId, deletedAt: null } });
    if (!found) throw new NotFoundException('Record not found');
  }
}

function toDto(row: { id: string; name: string; createdAt: Date }): CatalogItemDto {
  return { id: row.id, name: row.name, createdAt: row.createdAt.toISOString() };
}
