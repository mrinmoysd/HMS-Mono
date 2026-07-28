import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  BedDto,
  BedGroupDto,
  BedGroupInput,
  BedInput,
  BedStatusSummary,
  ListQuery,
  Paginated,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

@Injectable()
export class BedsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Bed groups ───────────────────────────────────────────────
  async listGroups(branchId: string, query: ListQuery): Promise<Paginated<BedGroupDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.BedGroupWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.bedGroup.findMany({ where, skip, take, orderBy, include: { floor: true } }),
      this.prisma.bedGroup.count({ where }),
    ]);
    return paginate(rows.map(toGroupDto), total, query);
  }

  async createGroup(user: RequestUser, branchId: string, input: BedGroupInput): Promise<BedGroupDto> {
    const g = await this.prisma.bedGroup.create({
      data: { branchId, name: input.name, floorId: input.floorId ?? null, color: input.color || null },
      include: { floor: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'bed_group', entityId: g.id });
    return toGroupDto(g);
  }

  async updateGroup(
    user: RequestUser,
    branchId: string,
    id: string,
    input: BedGroupInput,
  ): Promise<BedGroupDto> {
    const existing = await this.prisma.bedGroup.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Bed group not found');
    const g = await this.prisma.bedGroup.update({
      where: { id },
      data: { name: input.name, floorId: input.floorId ?? null, color: input.color || null },
      include: { floor: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'bed_group', entityId: id });
    return toGroupDto(g);
  }

  async removeGroup(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.bedGroup.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Bed group not found');
    await this.prisma.bedGroup.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'bed_group', entityId: id });
  }

  // ── Beds ─────────────────────────────────────────────────────
  async listBeds(branchId: string, query: ListQuery): Promise<Paginated<BedDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.BedWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { bedNo: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.bed.findMany({ where, skip, take, orderBy, include: { bedGroup: true, bedType: true } }),
      this.prisma.bed.count({ where }),
    ]);
    return paginate(rows.map(toBedDto), total, query);
  }

  async createBed(user: RequestUser, branchId: string, input: BedInput): Promise<BedDto> {
    const bed = await this.prisma.bed.create({
      data: { branchId, bedNo: input.bedNo, bedGroupId: input.bedGroupId, bedTypeId: input.bedTypeId ?? null },
      include: { bedGroup: true, bedType: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'bed', entityId: bed.id });
    return toBedDto(bed);
  }

  async updateBed(user: RequestUser, branchId: string, id: string, input: BedInput): Promise<BedDto> {
    const existing = await this.prisma.bed.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Bed not found');
    const bed = await this.prisma.bed.update({
      where: { id },
      data: { bedNo: input.bedNo, bedGroupId: input.bedGroupId, bedTypeId: input.bedTypeId ?? null },
      include: { bedGroup: true, bedType: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'bed', entityId: id });
    return toBedDto(bed);
  }

  async removeBed(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.bed.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Bed not found');
    await this.prisma.bed.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'bed', entityId: id });
  }

  /** Available beds only — used to populate the admission form's bed picker. */
  async availableBeds(branchId: string, bedGroupId?: string): Promise<BedDto[]> {
    const rows = await this.prisma.bed.findMany({
      where: { branchId, deletedAt: null, status: 'available', ...(bedGroupId ? { bedGroupId } : {}) },
      include: { bedGroup: true, bedType: true },
      orderBy: { bedNo: 'asc' },
    });
    return rows.map(toBedDto);
  }

  /** Live occupancy grid (FRD §2.30) grouped Floor → Bed Group → Bed. */
  async status(branchId: string): Promise<BedStatusSummary> {
    const beds = await this.prisma.bed.findMany({
      where: { branchId, deletedAt: null },
      include: { bedGroup: { include: { floor: true } } },
      orderBy: { bedNo: 'asc' },
    });
    // Active admissions give the occupant name for allotted beds.
    const active = await this.prisma.ipdAdmission.findMany({
      where: { branchId, status: 'admitted', deletedAt: null },
      select: { bedId: true, ipdNo: true, patient: { select: { name: true } } },
    });
    const occupant = new Map(active.map((a) => [a.bedId, { name: a.patient.name, ipdNo: a.ipdNo }]));

    const floors = new Map<string, { floorId: string | null; floorName: string; groups: Map<string, { bedGroupId: string; bedGroupName: string; beds: unknown[] }> }>();
    for (const bed of beds) {
      const floorId = bed.bedGroup.floorId ?? 'none';
      const floorName = bed.bedGroup.floor?.name ?? 'Unassigned Floor';
      if (!floors.has(floorId)) floors.set(floorId, { floorId: bed.bedGroup.floorId, floorName, groups: new Map() });
      const floor = floors.get(floorId)!;
      if (!floor.groups.has(bed.bedGroupId)) {
        floor.groups.set(bed.bedGroupId, { bedGroupId: bed.bedGroupId, bedGroupName: bed.bedGroup.name, beds: [] });
      }
      const occ = occupant.get(bed.id);
      floor.groups.get(bed.bedGroupId)!.beds.push({
        id: bed.id,
        bedNo: bed.bedNo,
        status: bed.status,
        patientName: occ?.name ?? null,
        ipdNo: occ?.ipdNo ?? null,
      });
    }

    return {
      total: beds.length,
      available: beds.filter((b) => b.status === 'available').length,
      allotted: beds.filter((b) => b.status === 'allotted').length,
      floors: [...floors.values()].map((f) => ({
        floorId: f.floorId,
        floorName: f.floorName,
        groups: [...f.groups.values()],
      })) as BedStatusSummary['floors'],
    };
  }

}

function toBedDto(b: {
  id: string;
  bedNo: string;
  bedGroupId: string;
  bedTypeId: string | null;
  status: string;
  bedGroup: { name: string };
  bedType: { name: string } | null;
}): BedDto {
  return {
    id: b.id,
    bedNo: b.bedNo,
    bedGroupId: b.bedGroupId,
    bedGroupName: b.bedGroup.name,
    bedTypeId: b.bedTypeId,
    bedTypeName: b.bedType?.name ?? null,
    status: b.status as 'available' | 'allotted',
  };
}

function toGroupDto(g: {
  id: string;
  name: string;
  floorId: string | null;
  floor: { name: string } | null;
  color: string | null;
  createdAt: Date;
}): BedGroupDto {
  return {
    id: g.id,
    name: g.name,
    floorId: g.floorId,
    floorName: g.floor?.name ?? null,
    color: g.color,
    createdAt: g.createdAt.toISOString(),
  };
}
