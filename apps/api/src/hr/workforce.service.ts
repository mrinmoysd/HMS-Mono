import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AttendanceDto,
  LeaveRequestDto,
  LeaveRequestInput,
  LeaveStatusInput,
  LeaveTypeDto,
  LeaveTypeInput,
  ListQuery,
  MarkAttendanceInput,
  Paginated,
  PayrollDto,
  PayrollInput,
  PayrollLineItem,
  RosterDto,
  RosterInput,
  SaveAttendanceInput,
  ShiftInput,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { paginate, toPrismaPage } from '../common/pagination';
import { startOfToday } from '../common/dates';
import type { RequestUser } from '../common/types/request-user';

type StaffUser = Prisma.UserGetPayload<{
  include: { role: true; staffProfile: { include: { department: true; designation: true } } };
}>;

function daysBetween(from: Date, to: Date): number {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
}

@Injectable()
export class WorkforceService {
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

  private async staffUsers(branchId: string, roleSlug?: string): Promise<StaffUser[]> {
    return this.prisma.user.findMany({
      where: { branchId, type: 'staff', deletedAt: null, ...(roleSlug ? { role: { slug: roleSlug } } : {}) },
      orderBy: { staffProfile: { staffNo: 'asc' } },
      include: { role: true, staffProfile: { include: { department: true, designation: true } } },
    });
  }

  // ── Attendance ───────────────────────────────────────────────
  async markAttendance(user: RequestUser, branchId: string, input: MarkAttendanceInput): Promise<AttendanceDto> {
    const day = input.date ? new Date(input.date) : startOfToday();
    day.setHours(0, 0, 0, 0);
    const existing = await this.prisma.attendance.findUnique({
      where: { branchId_staffUserId_date: { branchId, staffUserId: input.staffUserId, date: day } },
    });
    const now = new Date();
    const row = existing
      ? await this.prisma.attendance.update({
          where: { id: existing.id },
          data: input.action === 'out' ? { outTime: now } : { inTime: existing.inTime ?? now },
        })
      : await this.prisma.attendance.create({
          data: { branchId, staffUserId: input.staffUserId, date: day, method: input.method, status: 'present', ...(input.action === 'out' ? { outTime: now } : { inTime: now }) },
        });
    await this.audit.record({ branchId, userId: user.id, action: `attendance_${input.action}`, entity: 'attendance', entityId: row.id });
    const nameMap = await this.names([row.staffUserId]);
    return toAttendance(row, nameMap.get(row.staffUserId)?.name ?? '', nameMap.get(row.staffUserId)?.staffNo ?? null, '');
  }

  /** Every staff member for a date, joined with any saved attendance (unmarked → Present, N/A source). */
  async listAttendance(branchId: string, date: string | undefined, roleSlug: string | undefined): Promise<AttendanceDto[]> {
    const day = date ? new Date(date) : startOfToday();
    day.setHours(0, 0, 0, 0);
    const staff = await this.staffUsers(branchId, roleSlug);
    const records = await this.prisma.attendance.findMany({ where: { branchId, date: day } });
    const byUser = new Map(records.map((r) => [r.staffUserId, r]));
    return staff.map((u) => {
      const r = byUser.get(u.id);
      const hhmm = (d: Date | null) => (d ? d.toISOString().slice(11, 16) : null);
      return {
        id: r?.id ?? null,
        staffUserId: u.id,
        staffNo: u.staffProfile?.staffNo ?? null,
        staffName: u.name,
        roleLabel: u.role.label,
        date: day.toISOString(),
        inTime: r ? hhmm(r.inTime) : null,
        outTime: r ? hhmm(r.outTime) : null,
        method: r?.method ?? 'manual',
        status: r?.status ?? 'present',
        note: r?.note ?? null,
      };
    });
  }

  async saveAttendance(user: RequestUser, branchId: string, input: SaveAttendanceInput): Promise<{ saved: number }> {
    const day = new Date(input.date);
    day.setHours(0, 0, 0, 0);
    const toDate = (hhmm: string | undefined): Date | null => {
      if (!hhmm) return null;
      const [h, m] = hhmm.split(':').map(Number);
      const d = new Date(day);
      d.setHours(h || 0, m || 0, 0, 0);
      return d;
    };
    await this.prisma.$transaction(
      input.rows.map((row) =>
        this.prisma.attendance.upsert({
          where: { branchId_staffUserId_date: { branchId, staffUserId: row.staffUserId, date: day } },
          create: { branchId, staffUserId: row.staffUserId, date: day, status: row.status, method: 'manual', inTime: toDate(row.inTime), outTime: toDate(row.outTime), note: row.note || null },
          update: { status: row.status, inTime: toDate(row.inTime), outTime: toDate(row.outTime), note: row.note || null },
        }),
      ),
    );
    await this.audit.record({ branchId, userId: user.id, action: 'save', entity: 'attendance', entityId: day.toISOString() });
    return { saved: input.rows.length };
  }

  // ── Shifts & roster ──────────────────────────────────────────
  async listShifts(branchId: string) {
    const rows = await this.prisma.shift.findMany({ where: { branchId, deletedAt: null }, orderBy: { name: 'asc' } });
    return rows.map((s) => ({ id: s.id, name: s.name, startTime: s.startTime, endTime: s.endTime }));
  }

  async createShift(user: RequestUser, branchId: string, input: ShiftInput) {
    const s = await this.prisma.shift.create({ data: { branchId, name: input.name, startTime: input.startTime || null, endTime: input.endTime || null } });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'shift', entityId: s.id });
    return { id: s.id, name: s.name, startTime: s.startTime, endTime: s.endTime };
  }

  async listRoster(branchId: string, date: string | undefined, query: ListQuery): Promise<Paginated<RosterDto>> {
    const { skip, take } = toPrismaPage(query);
    const where: Prisma.DutyRosterWhereInput = { branchId, ...(date ? { date: new Date(date) } : {}) };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.dutyRoster.findMany({ where, skip, take, orderBy: { date: 'desc' }, include: { shift: true } }),
      this.prisma.dutyRoster.count({ where }),
    ]);
    const nameMap = await this.names(rows.map((r) => r.staffUserId));
    return paginate(
      rows.map((r) => ({ id: r.id, staffUserId: r.staffUserId, staffName: nameMap.get(r.staffUserId)?.name ?? '', shiftName: r.shift?.name ?? null, date: r.date.toISOString(), hours: Number(r.hours) })),
      total,
      query,
    );
  }

  async assignRoster(user: RequestUser, branchId: string, input: RosterInput): Promise<RosterDto> {
    const r = await this.prisma.dutyRoster.create({ data: { branchId, staffUserId: input.staffUserId, shiftId: input.shiftId ?? null, date: input.date, hours: input.hours }, include: { shift: true } });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'duty_roster', entityId: r.id });
    const nameMap = await this.names([r.staffUserId]);
    return { id: r.id, staffUserId: r.staffUserId, staffName: nameMap.get(r.staffUserId)?.name ?? '', shiftName: r.shift?.name ?? null, date: r.date.toISOString(), hours: Number(r.hours) };
  }

  // ── Payroll ──────────────────────────────────────────────────
  /** One row per staff for a month, joined with any generated payslip. */
  async listPayroll(branchId: string, roleSlug: string | undefined, month: string): Promise<PayrollDto[]> {
    const staff = await this.staffUsers(branchId, roleSlug);
    const records = await this.prisma.payroll.findMany({ where: { branchId, month } });
    const byUser = new Map(records.map((r) => [r.staffUserId, r]));
    return staff.map((u) => this.toPayrollDto(u, month, byUser.get(u.id) ?? null));
  }

  async getPayslip(branchId: string, userId: string, month: string): Promise<PayrollDto> {
    const u = (await this.staffUsers(branchId)).find((s) => s.id === userId);
    if (!u) throw new NotFoundException('Staff not found');
    const record = await this.prisma.payroll.findUnique({ where: { branchId_staffUserId_month: { branchId, staffUserId: userId, month } } });
    return this.toPayrollDto(u, month, record);
  }

  async generatePayroll(user: RequestUser, branchId: string, input: PayrollInput): Promise<PayrollDto> {
    const staff = await this.prisma.staff.findFirst({ where: { userId: input.staffUserId, branchId, deletedAt: null } });
    const basicSalary = staff ? Number(staff.basicSalary) : 0;
    const earnings = (input.earnings ?? []) as PayrollLineItem[];
    const deductionItems = (input.deductionItems ?? []) as PayrollLineItem[];
    const totalEarn = earnings.reduce((s, e) => s + e.amount, 0);
    const totalDeduct = deductionItems.reduce((s, d) => s + d.amount, 0);
    const gross = basicSalary + totalEarn;
    const net = Math.round((gross - totalDeduct + Number.EPSILON) * 100) / 100;
    const row = await this.prisma.payroll.upsert({
      where: { branchId_staffUserId_month: { branchId, staffUserId: input.staffUserId, month: input.month } },
      create: { branchId, staffUserId: input.staffUserId, month: input.month, basicSalary, gross, deductions: totalDeduct, net, paymentMode: input.paymentMode || 'Transfer to Bank Account', earnings: earnings as unknown as Prisma.InputJsonValue, deductionItems: deductionItems as unknown as Prisma.InputJsonValue, status: 'paid', paidAt: new Date(), createdById: user.id },
      update: { basicSalary, gross, deductions: totalDeduct, net, paymentMode: input.paymentMode || 'Transfer to Bank Account', earnings: earnings as unknown as Prisma.InputJsonValue, deductionItems: deductionItems as unknown as Prisma.InputJsonValue, status: 'paid', paidAt: new Date() },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'generate', entity: 'payroll', entityId: row.id });
    return this.getPayslip(branchId, input.staffUserId, input.month);
  }

  private toPayrollDto(u: StaffUser, month: string, record: { id: string; basicSalary: Prisma.Decimal; gross: Prisma.Decimal; deductions: Prisma.Decimal; net: Prisma.Decimal; paymentMode: string; earnings: Prisma.JsonValue; deductionItems: Prisma.JsonValue; status: string; paidAt: Date | null } | null): PayrollDto {
    const basic = record ? Number(record.basicSalary) : u.staffProfile ? Number(u.staffProfile.basicSalary) : 0;
    return {
      id: record?.id ?? null,
      staffUserId: u.id,
      staffNo: u.staffProfile?.staffNo ?? null,
      staffName: u.name,
      roleLabel: u.role.label,
      departmentName: u.staffProfile?.department?.name ?? null,
      designationName: u.staffProfile?.designation?.name ?? null,
      phone: u.phone,
      month,
      basicSalary: basic,
      earnings: (record?.earnings as unknown as PayrollLineItem[]) ?? [],
      deductionItems: (record?.deductionItems as unknown as PayrollLineItem[]) ?? [],
      gross: record ? Number(record.gross) : basic,
      deductions: record ? Number(record.deductions) : 0,
      net: record ? Number(record.net) : basic,
      paymentMode: record?.paymentMode ?? 'Transfer to Bank Account',
      status: record?.status ?? 'not_generated',
      paidAt: record?.paidAt ? record.paidAt.toISOString() : null,
    };
  }

  // ── Leaves ───────────────────────────────────────────────────
  async listLeaveTypes(branchId: string): Promise<LeaveTypeDto[]> {
    const rows = await this.prisma.leaveType.findMany({ where: { branchId, deletedAt: null }, orderBy: { name: 'asc' } });
    return rows.map((t) => ({ id: t.id, name: t.name, quota: t.quota }));
  }

  async createLeaveType(user: RequestUser, branchId: string, input: LeaveTypeInput): Promise<LeaveTypeDto> {
    const t = await this.prisma.leaveType.create({ data: { branchId, name: input.name, quota: input.quota } });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'leave_type', entityId: t.id });
    return { id: t.id, name: t.name, quota: t.quota };
  }

  async updateLeaveType(user: RequestUser, branchId: string, id: string, input: LeaveTypeInput): Promise<LeaveTypeDto> {
    const existing = await this.prisma.leaveType.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Leave type not found');
    const t = await this.prisma.leaveType.update({ where: { id }, data: { name: input.name, quota: input.quota } });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'leave_type', entityId: id });
    return { id: t.id, name: t.name, quota: t.quota };
  }

  async removeLeaveType(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.leaveType.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Leave type not found');
    await this.prisma.leaveType.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'leave_type', entityId: id });
  }

  async listLeaveRequests(branchId: string, query: ListQuery): Promise<Paginated<LeaveRequestDto>> {
    const { skip, take } = toPrismaPage(query);
    const where: Prisma.LeaveRequestWhereInput = { branchId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.leaveRequest.findMany({ where, skip, take, orderBy: { fromDate: 'desc' }, include: { leaveType: true } }),
      this.prisma.leaveRequest.count({ where }),
    ]);
    const nameMap = await this.names([...rows.map((r) => r.staffUserId), ...rows.map((r) => r.statusById)]);
    const roleMap = await this.roleLabels(rows.map((r) => r.staffUserId));
    return paginate(rows.map((r) => this.toLeave(r, nameMap, roleMap)), total, query);
  }

  async getLeaveRequest(branchId: string, id: string): Promise<LeaveRequestDto> {
    const r = await this.prisma.leaveRequest.findFirst({ where: { id, branchId }, include: { leaveType: true } });
    if (!r) throw new NotFoundException('Leave request not found');
    const nameMap = await this.names([r.staffUserId, r.statusById]);
    const roleMap = await this.roleLabels([r.staffUserId]);
    return this.toLeave(r, nameMap, roleMap);
  }

  private async roleLabels(userIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, role: { select: { label: true } } } });
    return new Map(users.map((u) => [u.id, u.role.label]));
  }

  async createLeaveRequest(user: RequestUser, branchId: string, input: LeaveRequestInput): Promise<LeaveRequestDto> {
    const status = input.status ?? 'pending';
    const r = await this.prisma.leaveRequest.create({
      data: {
        branchId,
        staffUserId: input.staffUserId,
        leaveTypeId: input.leaveTypeId ?? null,
        appliedDate: input.applyDate ?? new Date(),
        fromDate: input.fromDate,
        toDate: input.toDate,
        reason: input.reason || null,
        note: input.note || null,
        attachmentUrl: input.attachmentUrl || null,
        status,
        ...(status !== 'pending' ? { statusById: user.id, statusAt: new Date() } : {}),
      },
      include: { leaveType: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'leave_request', entityId: r.id });
    return this.getLeaveRequest(branchId, r.id);
  }

  async setLeaveStatus(user: RequestUser, branchId: string, id: string, input: LeaveStatusInput): Promise<LeaveRequestDto> {
    const existing = await this.prisma.leaveRequest.findFirst({ where: { id, branchId } });
    if (!existing) throw new NotFoundException('Leave request not found');
    await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: input.status, note: input.note !== undefined ? input.note || null : existing.note, statusById: user.id, statusAt: new Date() },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'leave_status', entity: 'leave_request', entityId: id, after: { status: input.status } });
    return this.getLeaveRequest(branchId, id);
  }

  async removeLeaveRequest(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.leaveRequest.findFirst({ where: { id, branchId } });
    if (!existing) throw new NotFoundException('Leave request not found');
    await this.prisma.leaveRequest.delete({ where: { id } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'leave_request', entityId: id });
  }

  private toLeave(
    r: { id: string; staffUserId: string; leaveType: { name: string } | null; appliedDate: Date; fromDate: Date; toDate: Date; reason: string | null; note: string | null; attachmentUrl: string | null; status: string; statusById: string | null; statusAt: Date | null },
    nameMap: Map<string, { name: string; staffNo: string | null }>,
    roleMap: Map<string, string>,
  ): LeaveRequestDto {
    const staff = nameMap.get(r.staffUserId);
    const by = r.statusById ? nameMap.get(r.statusById) : undefined;
    return {
      id: r.id,
      staffUserId: r.staffUserId,
      staffNo: staff?.staffNo ?? null,
      staffName: staff?.name ?? '',
      roleLabel: roleMap.get(r.staffUserId) ?? '',
      leaveTypeName: r.leaveType?.name ?? null,
      applyDate: r.appliedDate.toISOString(),
      fromDate: r.fromDate.toISOString(),
      toDate: r.toDate.toISOString(),
      days: daysBetween(r.fromDate, r.toDate),
      reason: r.reason,
      note: r.note,
      attachmentUrl: r.attachmentUrl,
      status: r.status,
      statusByName: by?.name ?? null,
      statusByNo: by?.staffNo ?? null,
      statusAt: r.statusAt ? r.statusAt.toISOString() : null,
    };
  }
}

function toAttendance(r: { id: string; staffUserId: string; date: Date; inTime: Date | null; outTime: Date | null; method: string; status: string; note?: string | null }, staffName: string, staffNo: string | null, roleLabel: string): AttendanceDto {
  return {
    id: r.id,
    staffUserId: r.staffUserId,
    staffNo,
    staffName,
    roleLabel,
    date: r.date.toISOString(),
    inTime: r.inTime ? r.inTime.toISOString() : null,
    outTime: r.outTime ? r.outTime.toISOString() : null,
    method: r.method,
    status: r.status,
    note: r.note ?? null,
  };
}
