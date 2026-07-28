import { Injectable } from '@nestjs/common';
import type { VitalTypeDto, VitalTypeInput } from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import type { RequestUser } from '../common/types/request-user';

@Injectable()
export class VitalTypeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(branchId: string): Promise<VitalTypeDto[]> {
    const rows = await this.prisma.vitalType.findMany({ where: { branchId, deletedAt: null }, orderBy: { sortOrder: 'asc' } });
    return rows.map(toDto);
  }

  async create(user: RequestUser, branchId: string, input: VitalTypeInput): Promise<VitalTypeDto> {
    const t = await this.prisma.vitalType.create({
      data: {
        branchId,
        name: input.name,
        unit: input.unit || null,
        refMin: input.refMin ?? null,
        refMax: input.refMax ?? null,
        sortOrder: input.sortOrder,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'vital_type', entityId: t.id });
    return toDto(t);
  }
}

function toDto(t: { id: string; name: string; unit: string | null; refMin: unknown; refMax: unknown; sortOrder: number }): VitalTypeDto {
  return {
    id: t.id,
    name: t.name,
    unit: t.unit,
    refMin: t.refMin != null ? Number(t.refMin) : null,
    refMax: t.refMax != null ? Number(t.refMax) : null,
    sortOrder: t.sortOrder,
  };
}
