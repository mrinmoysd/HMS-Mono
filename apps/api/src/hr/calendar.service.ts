import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { HolidayDto, HolidayInput, ListQuery, Paginated } from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(branchId: string, type: string | undefined, query: ListQuery): Promise<Paginated<HolidayDto>> {
    const { skip, take } = toPrismaPage(query);
    const where: Prisma.HolidayWhereInput = {
      branchId,
      deletedAt: null,
      ...(type ? { type } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.holiday.findMany({ where, skip, take, orderBy: { fromDate: 'desc' } }),
      this.prisma.holiday.count({ where }),
    ]);
    return paginate(rows.map(toDto), total, query);
  }

  async create(user: RequestUser, branchId: string, input: HolidayInput): Promise<HolidayDto> {
    const h = await this.prisma.holiday.create({
      data: {
        branchId,
        type: input.type,
        title: input.title,
        fromDate: input.fromDate,
        toDate: input.toDate ?? null,
        description: input.description || null,
        frontSite: input.frontSite,
        createdById: user.id,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'holiday', entityId: h.id });
    return toDto(h);
  }

  async remove(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.holiday.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Entry not found');
    await this.prisma.holiday.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'holiday', entityId: id });
  }
}

function toDto(h: { id: string; type: string; title: string; fromDate: Date; toDate: Date | null; description: string | null; frontSite: boolean }): HolidayDto {
  return {
    id: h.id,
    type: h.type,
    title: h.title,
    fromDate: h.fromDate.toISOString(),
    toDate: h.toDate ? h.toDate.toISOString() : null,
    description: h.description,
    frontSite: h.frontSite,
  };
}
