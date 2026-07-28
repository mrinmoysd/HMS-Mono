import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  DutyRosterRowDto,
  ListQuery,
  Paginated,
  RosterAssignmentDto,
  RosterAssignmentInput,
  RosterPeriodDto,
  RosterPeriodInput,
  DutyShiftDto,
  ShiftInput,
  ShiftUpdateInput,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

/** "08:30" (24h) → minutes since midnight, or null. */
function toMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** "08:30" (24h) → "08:30 AM". */
function toLabel(hhmm: string | null | undefined): string {
  const mins = toMinutes(hhmm);
  if (mins === null) return '';
  const h24 = Math.floor(mins / 60);
  const min = mins % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${period}`;
}

/** Duration between two clock times, wrapping past midnight, as "HH:MM:SS". */
function shiftHour(start: string | null | undefined, end: string | null | undefined): string {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === null || e === null) return '00:00:00';
  let diff = e - s;
  if (diff < 0) diff += 24 * 60;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function daysInclusive(from: Date, to: Date): number {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
}

@Injectable()
export class DutyRosterService {
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

  private toShiftDto(s: { id: string; name: string; startTime: string | null; endTime: string | null }): DutyShiftDto {
    return {
      id: s.id,
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      startLabel: toLabel(s.startTime),
      endLabel: toLabel(s.endTime),
      shiftHour: shiftHour(s.startTime, s.endTime),
    };
  }

  // ── Shifts ───────────────────────────────────────────────────
  async listShifts(branchId: string): Promise<DutyShiftDto[]> {
    const rows = await this.prisma.shift.findMany({ where: { branchId, deletedAt: null }, orderBy: { createdAt: 'asc' } });
    return rows.map((s) => this.toShiftDto(s));
  }

  async createShift(user: RequestUser, branchId: string, input: ShiftInput): Promise<DutyShiftDto> {
    const s = await this.prisma.shift.create({ data: { branchId, name: input.name, startTime: input.startTime || null, endTime: input.endTime || null } });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'shift', entityId: s.id });
    return this.toShiftDto(s);
  }

  async updateShift(user: RequestUser, branchId: string, id: string, input: ShiftUpdateInput): Promise<DutyShiftDto> {
    const existing = await this.prisma.shift.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Shift not found');
    const s = await this.prisma.shift.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.startTime !== undefined ? { startTime: input.startTime || null } : {}),
        ...(input.endTime !== undefined ? { endTime: input.endTime || null } : {}),
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'shift', entityId: id });
    return this.toShiftDto(s);
  }

  async removeShift(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.shift.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Shift not found');
    await this.prisma.shift.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'shift', entityId: id });
  }

  // ── Roster periods ───────────────────────────────────────────
  private toPeriodDto(r: { id: string; shiftId: string; startDate: Date; endDate: Date; shift: { name: string; startTime: string | null; endTime: string | null } }): RosterPeriodDto {
    return {
      id: r.id,
      shiftId: r.shiftId,
      shiftName: r.shift.name,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      startLabel: toLabel(r.shift.startTime),
      endLabel: toLabel(r.shift.endTime),
      shiftHour: shiftHour(r.shift.startTime, r.shift.endTime),
      rosterDays: daysInclusive(r.startDate, r.endDate),
    };
  }

  async listRosterPeriods(branchId: string, query: ListQuery): Promise<Paginated<RosterPeriodDto>> {
    const { skip, take } = toPrismaPage(query);
    const where: Prisma.RosterWhereInput = { branchId, deletedAt: null };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.roster.findMany({ where, skip, take, orderBy: { startDate: 'desc' }, include: { shift: true } }),
      this.prisma.roster.count({ where }),
    ]);
    return paginate(rows.map((r) => this.toPeriodDto(r)), total, query);
  }

  /** All roster periods (for the Time Duration / Shift Date selects). */
  async allRosterPeriods(branchId: string): Promise<RosterPeriodDto[]> {
    const rows = await this.prisma.roster.findMany({ where: { branchId, deletedAt: null }, orderBy: { startDate: 'desc' }, include: { shift: true } });
    return rows.map((r) => this.toPeriodDto(r));
  }

  async createRosterPeriod(user: RequestUser, branchId: string, input: RosterPeriodInput): Promise<RosterPeriodDto> {
    const shift = await this.prisma.shift.findFirst({ where: { id: input.shiftId, branchId, deletedAt: null } });
    if (!shift) throw new NotFoundException('Shift not found');
    const r = await this.prisma.roster.create({
      data: { branchId, shiftId: input.shiftId, startDate: input.startDate, endDate: input.endDate },
      include: { shift: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'roster', entityId: r.id });
    return this.toPeriodDto(r);
  }

  async removeRosterPeriod(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.roster.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Roster not found');
    await this.prisma.$transaction([
      this.prisma.rosterAssignment.updateMany({ where: { rosterId: id, deletedAt: null }, data: { deletedAt: new Date() } }),
      this.prisma.roster.update({ where: { id }, data: { deletedAt: new Date() } }),
    ]);
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'roster', entityId: id });
  }

  // ── Assignments ──────────────────────────────────────────────
  private async assignmentsQuery(where: Prisma.RosterAssignmentWhereInput) {
    return this.prisma.rosterAssignment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { roster: { include: { shift: true } }, floor: true, department: true },
    });
  }

  private toAssignmentDto(
    a: Prisma.RosterAssignmentGetPayload<{ include: { roster: { include: { shift: true } }; floor: true; department: true } }>,
    nameMap: Map<string, { name: string; staffNo: string | null }>,
  ): RosterAssignmentDto {
    const staff = nameMap.get(a.staffUserId);
    const gen = a.generatedById ? nameMap.get(a.generatedById) : undefined;
    return {
      id: a.id,
      rosterId: a.rosterId,
      staffUserId: a.staffUserId,
      staffName: staff?.name ?? '',
      staffNo: staff?.staffNo ?? null,
      floorId: a.floorId,
      floorName: a.floor?.name ?? null,
      departmentId: a.departmentId,
      departmentName: a.department?.name ?? null,
      shiftName: a.roster.shift.name,
      startDate: a.roster.startDate.toISOString(),
      endDate: a.roster.endDate.toISOString(),
      shiftStartLabel: toLabel(a.roster.shift.startTime),
      shiftEndLabel: toLabel(a.roster.shift.endTime),
      generatedByName: gen?.name ?? null,
      generatedByNo: gen?.staffNo ?? null,
    };
  }

  async listAssignments(branchId: string, query: ListQuery): Promise<Paginated<RosterAssignmentDto>> {
    const { skip, take } = toPrismaPage(query);
    const where: Prisma.RosterAssignmentWhereInput = { branchId, deletedAt: null };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.rosterAssignment.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { roster: { include: { shift: true } }, floor: true, department: true } }),
      this.prisma.rosterAssignment.count({ where }),
    ]);
    const nameMap = await this.names([...rows.map((r) => r.staffUserId), ...rows.map((r) => r.generatedById)]);
    return paginate(rows.map((r) => this.toAssignmentDto(r, nameMap)), total, query);
  }

  async createAssignment(user: RequestUser, branchId: string, input: RosterAssignmentInput): Promise<RosterAssignmentDto> {
    const roster = await this.prisma.roster.findFirst({ where: { id: input.rosterId, branchId, deletedAt: null } });
    if (!roster) throw new NotFoundException('Roster not found');
    const a = await this.prisma.rosterAssignment.create({
      data: {
        branchId,
        rosterId: input.rosterId,
        staffUserId: input.staffUserId,
        floorId: input.floorId ?? null,
        departmentId: input.departmentId ?? null,
        generatedById: user.id,
      },
      include: { roster: { include: { shift: true } }, floor: true, department: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'roster_assignment', entityId: a.id });
    const nameMap = await this.names([a.staffUserId, a.generatedById]);
    return this.toAssignmentDto(a, nameMap);
  }

  async updateAssignment(user: RequestUser, branchId: string, id: string, input: RosterAssignmentInput): Promise<RosterAssignmentDto> {
    const existing = await this.prisma.rosterAssignment.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Assignment not found');
    const roster = await this.prisma.roster.findFirst({ where: { id: input.rosterId, branchId, deletedAt: null } });
    if (!roster) throw new NotFoundException('Roster not found');
    const a = await this.prisma.rosterAssignment.update({
      where: { id },
      data: { rosterId: input.rosterId, staffUserId: input.staffUserId, floorId: input.floorId ?? null, departmentId: input.departmentId ?? null },
      include: { roster: { include: { shift: true } }, floor: true, department: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'roster_assignment', entityId: id });
    const nameMap = await this.names([a.staffUserId, a.generatedById]);
    return this.toAssignmentDto(a, nameMap);
  }

  async removeAssignment(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.rosterAssignment.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Assignment not found');
    await this.prisma.rosterAssignment.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'roster_assignment', entityId: id });
  }

  // ── Main daily-expansion list ────────────────────────────────
  /** Expand each assignment on the given roster period into one row per day. */
  async dailyList(branchId: string, rosterId: string | undefined, staffUserId: string | undefined): Promise<DutyRosterRowDto[]> {
    if (!rosterId) return [];
    const where: Prisma.RosterAssignmentWhereInput = {
      branchId,
      deletedAt: null,
      rosterId,
      ...(staffUserId ? { staffUserId } : {}),
    };
    const rows = await this.assignmentsQuery(where);
    const nameMap = await this.names(rows.map((r) => r.staffUserId));
    const out: DutyRosterRowDto[] = [];
    for (const a of rows) {
      const staff = nameMap.get(a.staffUserId);
      const start = new Date(a.roster.startDate);
      const end = new Date(a.roster.endDate);
      const shiftStartLabel = toLabel(a.roster.shift.startTime);
      const shiftEndLabel = toLabel(a.roster.shift.endTime);
      const hour = shiftHour(a.roster.shift.startTime, a.roster.shift.endTime);
      for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
        out.push({
          staffUserId: a.staffUserId,
          staffName: staff?.name ?? '',
          staffNo: staff?.staffNo ?? null,
          date: new Date(d).toISOString(),
          shiftStartLabel,
          shiftEndLabel,
          shiftHour: hour,
          shiftName: a.roster.shift.name,
          departmentName: a.department?.name ?? null,
          floorName: a.floor?.name ?? null,
        });
      }
    }
    out.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : x.staffName.localeCompare(y.staffName)));
    return out;
  }
}
