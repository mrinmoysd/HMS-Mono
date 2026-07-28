import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AppointmentDetailDto,
  AppointmentDto,
  AppointmentInput,
  AppointmentTab,
  DoctorWiseRow,
  ListQuery,
  Paginated,
  QueueRow,
  RescheduleAppointmentInput,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { SequenceService } from '../common/sequence/sequence.service';
import { paginate, toPrismaPage } from '../common/pagination';
import { startOfToday, endOfToday } from '../common/dates';
import type { RequestUser } from '../common/types/request-user';

const include = {
  patient: { select: { name: true, phone: true, gender: true } },
  case: { select: { caseNo: true } },
  doctor: { select: { name: true } },
} satisfies Prisma.AppointmentInclude;

type Row = Prisma.AppointmentGetPayload<{ include: typeof include }>;

@Injectable()
export class AppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
  ) {}

  async list(
    branchId: string,
    tab: AppointmentTab,
    doctorId: string | undefined,
    query: ListQuery,
  ): Promise<Paginated<AppointmentDto>> {
    const { skip, take } = toPrismaPage(query);
    const dateFilter: Prisma.AppointmentWhereInput =
      tab === 'today'
        ? { apptDate: { gte: startOfToday(), lte: endOfToday() } }
        : tab === 'upcoming'
          ? { apptDate: { gt: endOfToday() } }
          : { apptDate: { lt: startOfToday() } };

    const where: Prisma.AppointmentWhereInput = {
      branchId,
      deletedAt: null,
      ...dateFilter,
      ...(doctorId ? { doctorId } : {}),
      ...(query.search
        ? { patient: { name: { contains: query.search, mode: 'insensitive' } } }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        skip,
        take,
        orderBy: { apptDate: tab === 'old' ? 'desc' : 'asc' },
        include,
      }),
      this.prisma.appointment.count({ where }),
    ]);
    const names = await this.creatorNames(rows.map((r) => r.createdById));
    return paginate(rows.map((r) => toDto(r, names.get(r.createdById ?? '') ?? null)), total, query);
  }

  private async creatorNames(ids: (string | null)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
    return new Map(users.map((u) => [u.id, u.name]));
  }

  async create(user: RequestUser, branchId: string, input: AppointmentInput): Promise<AppointmentDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: input.patientId, branchId, deletedAt: null },
      include: { cases: { take: 1, orderBy: { createdAt: 'asc' } } },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const apptNo = await this.sequence.next(branchId, 'appointment');
    const appt = await this.prisma.appointment.create({
      data: {
        branchId,
        apptNo,
        patientId: input.patientId,
        caseId: patient.cases[0]?.id ?? null,
        doctorId: input.doctorId,
        apptDate: input.apptDate,
        shift: input.shift || null,
        slot: input.slot || null,
        fees: input.fees,
        discountPct: input.discountPct,
        paid: input.paid,
        priority: input.priority,
        source: input.source || null,
        paymentMode: input.paymentMode,
        liveConsult: input.liveConsult,
        status: input.status,
        message: input.message || null,
        alternateAddress: input.alternateAddress || null,
        createdById: user.id,
      },
      include,
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'appointment', entityId: appt.id });
    return toDto(appt, user.name);
  }

  async setStatus(user: RequestUser, branchId: string, id: string, status: string): Promise<AppointmentDto> {
    const existing = await this.prisma.appointment.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Appointment not found');
    const appt = await this.prisma.appointment.update({ where: { id }, data: { status }, include });
    const names = await this.creatorNames([appt.createdById]);
    await this.audit.record({ branchId, userId: user.id, action: 'status', entity: 'appointment', entityId: id, after: { status } });
    return toDto(appt, names.get(appt.createdById ?? '') ?? null);
  }

  async remove(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.appointment.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Appointment not found');
    await this.prisma.appointment.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'appointment', entityId: id });
  }

  // ── A2: detail ─────────────────────────────────────────────
  async get(branchId: string, id: string): Promise<AppointmentDetailDto> {
    const a = await this.prisma.appointment.findFirst({
      where: { id, branchId, deletedAt: null },
      include: {
        patient: { select: { name: true, phone: true, gender: true, email: true, age: true } },
        case: { select: { caseNo: true } },
        doctor: { select: { name: true, staffProfile: { select: { department: { select: { name: true } } } } } },
      },
    });
    if (!a) throw new NotFoundException('Appointment not found');
    const names = await this.creatorNames([a.createdById]);
    const base = toDto(a as unknown as Row, names.get(a.createdById ?? '') ?? null);
    return {
      ...base,
      patientEmail: a.patient.email,
      patientAge: a.patient.age,
      department: a.doctor.staffProfile?.department?.name ?? null,
    };
  }

  // ── A2: reschedule ─────────────────────────────────────────
  async reschedule(user: RequestUser, branchId: string, id: string, input: RescheduleAppointmentInput): Promise<AppointmentDto> {
    const existing = await this.prisma.appointment.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Appointment not found');
    const paid = round2(input.fees * (1 - (input.discountPct || 0) / 100));
    const a = await this.prisma.appointment.update({
      where: { id },
      data: {
        apptDate: input.apptDate,
        shift: input.shift || null,
        slot: input.slot || null,
        fees: input.fees,
        discountPct: input.discountPct,
        paid,
        priority: input.priority,
        status: input.status,
        liveConsult: input.liveConsult,
        message: input.message || null,
        alternateAddress: input.alternateAddress || null,
      },
      include,
    });
    const names = await this.creatorNames([a.createdById]);
    await this.audit.record({ branchId, userId: user.id, action: 'reschedule', entity: 'appointment', entityId: id });
    return toDto(a, names.get(a.createdById ?? '') ?? null);
  }

  // ── A2: doctor-wise ────────────────────────────────────────
  async doctorWise(branchId: string, doctorId: string, date?: string): Promise<DoctorWiseRow[]> {
    const dayFilter: Prisma.AppointmentWhereInput = date
      ? (() => {
          const d = new Date(date);
          const gte = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const lt = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
          return { apptDate: { gte, lt } };
        })()
      : {};
    const rows = await this.prisma.appointment.findMany({
      where: { branchId, doctorId, deletedAt: null, ...dayFilter },
      orderBy: { apptDate: 'desc' },
      include: { patient: { select: { name: true, phone: true, email: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      patientId: r.patientId,
      patientName: r.patient.name,
      phone: r.patient.phone,
      email: r.patient.email,
      date: r.apptDate.toISOString(),
      source: r.source,
    }));
  }

  // ── A2: patient queue + reorder ────────────────────────────
  async queue(branchId: string, doctorId: string, shift: string, date: string, slot?: string): Promise<QueueRow[]> {
    const d = new Date(date);
    const gte = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const lt = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const rows = await this.prisma.appointment.findMany({
      where: { branchId, doctorId, shift, deletedAt: null, apptDate: { gte, lt }, ...(slot ? { slot } : {}) },
      orderBy: [{ queueOrder: 'asc' }, { createdAt: 'asc' }],
      include: { patient: { select: { name: true, phone: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      patientId: r.patientId,
      patientName: r.patient.name,
      apptNo: r.apptNo,
      phone: r.patient.phone,
      priority: r.priority,
      status: r.status,
    }));
  }

  async reorderQueue(user: RequestUser, branchId: string, ids: string[]): Promise<{ reordered: number }> {
    await this.prisma.$transaction(
      ids.map((id, i) => this.prisma.appointment.updateMany({ where: { id, branchId }, data: { queueOrder: i } })),
    );
    await this.audit.record({ branchId, userId: user.id, action: 'queue_reorder', entity: 'appointment', after: { count: ids.length } });
    return { reordered: ids.length };
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function toDto(a: Row, createdByName: string | null): AppointmentDto {
  return {
    id: a.id,
    apptNo: a.apptNo,
    patientId: a.patientId,
    patientName: a.patient.name,
    patientPhone: a.patient.phone,
    patientGender: a.patient.gender,
    caseNo: a.case?.caseNo ?? null,
    doctorId: a.doctorId,
    doctorName: a.doctor.name,
    apptDate: a.apptDate.toISOString(),
    shift: a.shift,
    slot: a.slot,
    fees: Number(a.fees),
    discountPct: Number(a.discountPct),
    paid: Number(a.paid),
    priority: a.priority,
    source: a.source,
    paymentMode: a.paymentMode,
    liveConsult: a.liveConsult,
    status: a.status,
    alternateAddress: a.alternateAddress,
    message: a.message,
    createdByName,
  };
}
