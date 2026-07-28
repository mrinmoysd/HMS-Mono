import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  FinanceSummary,
  LedgerEntryDto,
  LedgerEntryInput,
  ListQuery,
  Paginated,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

type Kind = 'income' | 'expense';

@Injectable()
export class FinanceService {
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

  async list(kind: Kind, branchId: string, query: ListQuery): Promise<Paginated<LedgerEntryDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where = {
      branchId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
    };
    const [rows, total] =
      kind === 'income'
        ? await this.prisma.$transaction([
            this.prisma.income.findMany({ where, skip, take, orderBy: orderBy ?? { date: 'desc' }, include: { head: true } }),
            this.prisma.income.count({ where }),
          ])
        : await this.prisma.$transaction([
            this.prisma.expense.findMany({ where, skip, take, orderBy: orderBy ?? { date: 'desc' }, include: { head: true } }),
            this.prisma.expense.count({ where }),
          ]);
    const nameMap = await this.names(rows.map((r) => r.createdById));
    return paginate(rows.map((r) => toDto(r, nameMap)), total, query);
  }

  async create(kind: Kind, user: RequestUser, branchId: string, input: LedgerEntryInput): Promise<LedgerEntryDto> {
    const data = {
      branchId,
      invoiceNo: input.invoiceNo || null,
      name: input.name,
      date: input.date,
      headId: input.headId ?? null,
      amount: input.amount,
      documentUrl: input.documentUrl || null,
      description: input.description || null,
      createdById: user.id,
    };
    const row =
      kind === 'income'
        ? await this.prisma.income.create({ data, include: { head: true } })
        : await this.prisma.expense.create({ data, include: { head: true } });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: kind, entityId: row.id });
    const nameMap = await this.names([row.createdById]);
    return toDto(row, nameMap);
  }

  async update(kind: Kind, user: RequestUser, branchId: string, id: string, input: LedgerEntryInput): Promise<LedgerEntryDto> {
    const existing = kind === 'income'
      ? await this.prisma.income.findFirst({ where: { id, branchId, deletedAt: null } })
      : await this.prisma.expense.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException(`${kind} not found`);
    const data = {
      invoiceNo: input.invoiceNo || null,
      name: input.name,
      date: input.date,
      headId: input.headId ?? null,
      amount: input.amount,
      documentUrl: input.documentUrl !== undefined ? input.documentUrl || null : existing.documentUrl,
      description: input.description || null,
    };
    const row = kind === 'income'
      ? await this.prisma.income.update({ where: { id }, data, include: { head: true } })
      : await this.prisma.expense.update({ where: { id }, data, include: { head: true } });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: kind, entityId: id });
    const nameMap = await this.names([row.createdById]);
    return toDto(row, nameMap);
  }

  async remove(kind: Kind, user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = kind === 'income'
      ? await this.prisma.income.findFirst({ where: { id, branchId, deletedAt: null } })
      : await this.prisma.expense.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException(`${kind} not found`);
    if (kind === 'income') await this.prisma.income.update({ where: { id }, data: { deletedAt: new Date() } });
    else await this.prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: kind, entityId: id });
  }

  async summary(branchId: string): Promise<FinanceSummary> {
    const [inc, exp] = await this.prisma.$transaction([
      this.prisma.income.aggregate({ where: { branchId, deletedAt: null }, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: { branchId, deletedAt: null }, _sum: { amount: true } }),
    ]);
    const income = Number(inc._sum.amount ?? 0);
    const expense = Number(exp._sum.amount ?? 0);
    return { income, expense, net: income - expense };
  }
}

function toDto(
  r: {
    id: string;
    invoiceNo: string | null;
    name: string;
    date: Date;
    headId: string | null;
    head: { name: string } | null;
    amount: Prisma.Decimal;
    documentUrl: string | null;
    description: string | null;
    createdById: string | null;
  },
  nameMap: Map<string, { name: string; staffNo: string | null }>,
): LedgerEntryDto {
  const gen = r.createdById ? nameMap.get(r.createdById) : undefined;
  return {
    id: r.id,
    invoiceNo: r.invoiceNo,
    name: r.name,
    date: r.date.toISOString(),
    headId: r.headId,
    headName: r.head?.name ?? null,
    amount: Number(r.amount),
    documentUrl: r.documentUrl,
    description: r.description,
    generatedByName: gen?.name ?? null,
    generatedByNo: gen?.staffNo ?? null,
  };
}
