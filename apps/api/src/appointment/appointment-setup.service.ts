import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AppointmentPriorityDto,
  AppointmentPriorityInput,
  DoctorFeeDto,
  DoctorShiftMatrixDto,
  ShiftDto,
  ShiftInput,
  SlotConfigDto,
  SlotConfigInput,
  SlotDto,
  ToggleDoctorShiftInput,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import type { RequestUser } from '../common/types/request-user';

@Injectable()
export class AppointmentSetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Shifts ─────────────────────────────────────────────────
  async listShifts(branchId: string): Promise<ShiftDto[]> {
    const rows = await this.prisma.shift.findMany({ where: { branchId, deletedAt: null }, orderBy: { startTime: 'asc' } });
    return rows.map((s) => ({ id: s.id, name: s.name, startTime: s.startTime, endTime: s.endTime }));
  }
  async createShift(user: RequestUser, branchId: string, input: ShiftInput): Promise<ShiftDto> {
    const s = await this.prisma.shift.create({ data: { branchId, name: input.name, startTime: input.startTime, endTime: input.endTime } });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'shift', entityId: s.id });
    return { id: s.id, name: s.name, startTime: s.startTime, endTime: s.endTime };
  }
  async updateShift(user: RequestUser, branchId: string, id: string, input: ShiftInput): Promise<ShiftDto> {
    const existing = await this.prisma.shift.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Shift not found');
    const s = await this.prisma.shift.update({ where: { id }, data: { name: input.name, startTime: input.startTime, endTime: input.endTime } });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'shift', entityId: id });
    return { id: s.id, name: s.name, startTime: s.startTime, endTime: s.endTime };
  }
  async removeShift(user: RequestUser, branchId: string, id: string): Promise<void> {
    await this.prisma.shift.updateMany({ where: { id, branchId }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'shift', entityId: id });
  }

  // ── Appointment priorities ─────────────────────────────────
  async listPriorities(branchId: string): Promise<AppointmentPriorityDto[]> {
    const rows = await this.prisma.appointmentPriority.findMany({ where: { branchId, deletedAt: null }, orderBy: { sortOrder: 'asc' } });
    return rows.map((p) => ({ id: p.id, name: p.name, sortOrder: p.sortOrder }));
  }
  async createPriority(user: RequestUser, branchId: string, input: AppointmentPriorityInput): Promise<AppointmentPriorityDto> {
    const p = await this.prisma.appointmentPriority.create({ data: { branchId, name: input.name, sortOrder: input.sortOrder } });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'appointment_priority', entityId: p.id });
    return { id: p.id, name: p.name, sortOrder: p.sortOrder };
  }
  async updatePriority(user: RequestUser, branchId: string, id: string, input: AppointmentPriorityInput): Promise<AppointmentPriorityDto> {
    const existing = await this.prisma.appointmentPriority.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Priority not found');
    const p = await this.prisma.appointmentPriority.update({ where: { id }, data: { name: input.name, sortOrder: input.sortOrder } });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'appointment_priority', entityId: id });
    return { id: p.id, name: p.name, sortOrder: p.sortOrder };
  }
  async removePriority(user: RequestUser, branchId: string, id: string): Promise<void> {
    await this.prisma.appointmentPriority.updateMany({ where: { id, branchId }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'appointment_priority', entityId: id });
  }

  // ── Doctor Shift matrix ────────────────────────────────────
  async doctorShiftMatrix(branchId: string): Promise<DoctorShiftMatrixDto> {
    const [shifts, doctors, links] = await Promise.all([
      this.prisma.shift.findMany({ where: { branchId, deletedAt: null }, orderBy: { startTime: 'asc' }, select: { id: true, name: true } }),
      this.prisma.user.findMany({ where: { branchId, deletedAt: null, isActive: true, role: { slug: 'doctor' } }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      this.prisma.doctorShift.findMany({ where: { branchId, deletedAt: null }, select: { doctorId: true, shiftId: true, active: true } }),
    ]);
    const activeByKey = new Map(links.map((l) => [`${l.doctorId}:${l.shiftId}`, l.active]));
    return {
      shifts,
      doctors: doctors.map((d) => ({
        id: d.id,
        name: d.name,
        shifts: Object.fromEntries(shifts.map((s) => [s.id, activeByKey.get(`${d.id}:${s.id}`) ?? false])),
      })),
    };
  }

  async toggleDoctorShift(user: RequestUser, branchId: string, input: ToggleDoctorShiftInput): Promise<{ active: boolean }> {
    const existing = await this.prisma.doctorShift.findFirst({ where: { doctorId: input.doctorId, shiftId: input.shiftId } });
    if (existing) {
      await this.prisma.doctorShift.update({ where: { id: existing.id }, data: { active: input.active, deletedAt: null } });
    } else {
      await this.prisma.doctorShift.create({ data: { branchId, doctorId: input.doctorId, shiftId: input.shiftId, active: input.active } });
    }
    await this.audit.record({ branchId, userId: user.id, action: 'toggle', entity: 'doctor_shift', after: { ...input } });
    return { active: input.active };
  }

  // ── Slot configuration ─────────────────────────────────────
  async getSlotConfig(branchId: string, doctorId: string, shiftId: string): Promise<SlotConfigDto> {
    const row = await this.prisma.doctorShift.findFirst({ where: { branchId, doctorId, shiftId, deletedAt: null } });
    return {
      doctorId,
      shiftId,
      consultationDurationMinutes: row?.consultationDurationMinutes ?? null,
      chargeId: row?.chargeId ?? null,
      amount: row ? Number(row.amount) : 0,
    };
  }

  async saveSlotConfig(user: RequestUser, branchId: string, input: SlotConfigInput): Promise<SlotConfigDto> {
    const existing = await this.prisma.doctorShift.findFirst({ where: { doctorId: input.doctorId, shiftId: input.shiftId } });
    const data = {
      consultationDurationMinutes: input.consultationDurationMinutes,
      chargeId: input.chargeId ?? null,
      amount: input.amount,
      deletedAt: null,
    };
    if (existing) {
      await this.prisma.doctorShift.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.doctorShift.create({ data: { branchId, doctorId: input.doctorId, shiftId: input.shiftId, active: true, ...data } });
    }
    await this.audit.record({ branchId, userId: user.id, action: 'slot_config', entity: 'doctor_shift', after: { doctorId: input.doctorId, shiftId: input.shiftId } });
    return this.getSlotConfig(branchId, input.doctorId, input.shiftId);
  }

  // ── Slot generation + fee lookup (drives the appointment form) ──
  async doctorFee(branchId: string, doctorId: string, shiftId: string): Promise<DoctorFeeDto> {
    const row = await this.prisma.doctorShift.findFirst({ where: { branchId, doctorId, shiftId, deletedAt: null } });
    return { amount: row ? Number(row.amount) : 0, consultationDurationMinutes: row?.consultationDurationMinutes ?? null };
  }

  async availableSlots(branchId: string, doctorId: string, shiftId: string, date: string): Promise<SlotDto[]> {
    const [config, shift] = await Promise.all([
      this.prisma.doctorShift.findFirst({ where: { branchId, doctorId, shiftId, deletedAt: null } }),
      this.prisma.shift.findFirst({ where: { id: shiftId, branchId, deletedAt: null } }),
    ]);
    if (!config?.consultationDurationMinutes || !shift?.startTime || !shift?.endTime) return [];

    const start = toMinutes(shift.startTime);
    const end = toMinutes(shift.endTime);
    const step = config.consultationDurationMinutes;
    if (start == null || end == null || step <= 0 || end <= start) return [];

    // Slots already booked by this doctor on this date.
    const day = new Date(date);
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    const booked = await this.prisma.appointment.findMany({
      where: { branchId, doctorId, deletedAt: null, apptDate: { gte: dayStart, lt: dayEnd }, slot: { not: null } },
      select: { slot: true },
    });
    const bookedLabels = new Set(booked.map((b) => b.slot).filter(Boolean) as string[]);

    const slots: SlotDto[] = [];
    for (let t = start; t + step <= end; t += step) {
      const label = `${fmt(t)} - ${fmt(t + step)}`;
      slots.push({ start: fromMinutes(t), end: fromMinutes(t + step), label, available: !bookedLabels.has(label) });
    }
    return slots;
  }
}

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const mm = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
/** 12-hour label, e.g. 630 → "10:30 AM". */
function fmt(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const mm = mins % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
}
