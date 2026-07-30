import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import type {
  AppointmentDto,
  InvoiceDto,
  LoginResponse,
  PortalBookInput,
  PortalDoctorDto,
  PortalProfileDto,
  PortalRegisterInput,
  PortalVisitDto,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../common/audit/audit.service';
import { SequenceService } from '../common/sequence/sequence.service';
import { InvoiceService } from '../billing/invoice.service';
import type { RequestUser } from '../common/types/request-user';

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
    private readonly invoices: InvoiceService,
  ) {}

  /** Resolve the patient owned by the authenticated user — the scoping boundary. */
  private async requirePatient(user: RequestUser) {
    const patient = await this.prisma.patient.findFirst({
      where: { userId: user.id, deletedAt: null },
      include: { cases: { take: 1, orderBy: { createdAt: 'asc' } } },
    });
    if (!patient) throw new ForbiddenException('No patient profile linked to this account');
    return patient;
  }

  async register(input: PortalRegisterInput): Promise<LoginResponse> {
    const exists = await this.prisma.user.findUnique({ where: { username: input.username } });
    if (exists) throw new BadRequestException('Username already taken');
    const role = await this.prisma.role.findUniqueOrThrow({ where: { slug: 'patient' } });
    const branch = await this.prisma.branch.findFirstOrThrow({ where: { isHome: true } });
    const passwordHash = await argon2.hash(input.password);

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          branchId: branch.id,
          roleId: role.id,
          username: input.username,
          name: input.name,
          email: input.email || null,
          phone: input.phone || null,
          passwordHash,
          type: 'patient',
        },
      });
      const patientNo = await this.sequence.next(branch.id, 'patient', tx);
      const patient = await tx.patient.create({
        data: {
          branchId: branch.id,
          patientNo,
          userId: user.id,
          name: input.name,
          age: input.age,
          gender: input.gender ?? null,
          phone: input.phone || null,
          email: input.email || null,
        },
      });
      const caseNo = await this.sequence.next(branch.id, 'case', tx);
      await tx.patientCase.create({ data: { branchId: branch.id, patientId: patient.id, caseNo, type: 'general' } });
    });

    await this.audit.record({ branchId: branch.id, action: 'portal_register', entity: 'patient' });
    // Auto-login the new patient.
    return this.auth.login({ username: input.username, password: input.password });
  }

  async profile(user: RequestUser): Promise<PortalProfileDto> {
    const p = await this.requirePatient(user);
    return {
      patientId: p.id,
      patientNo: p.patientNo,
      name: p.name,
      age: p.age,
      gender: p.gender,
      phone: p.phone,
      email: p.email,
      bloodGroup: p.bloodGroup,
      address: p.address,
    };
  }

  async doctors(user: RequestUser): Promise<PortalDoctorDto[]> {
    const p = await this.requirePatient(user);
    const rows = await this.prisma.user.findMany({
      where: { branchId: p.branchId, deletedAt: null, isActive: true, role: { slug: 'doctor' } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return rows;
  }

  async listAppointments(user: RequestUser): Promise<AppointmentDto[]> {
    const p = await this.requirePatient(user);
    const rows = await this.prisma.appointment.findMany({
      where: { patientId: p.id, deletedAt: null },
      orderBy: { apptDate: 'desc' },
      include: { doctor: { select: { name: true } }, case: { select: { caseNo: true } } },
    });
    return rows.map((a) => ({
      id: a.id, apptNo: a.apptNo, patientId: a.patientId, patientName: p.name, patientPhone: p.phone,
      patientGender: p.gender, caseNo: a.case?.caseNo ?? null, doctorId: a.doctorId, doctorName: a.doctor.name,
      apptDate: a.apptDate.toISOString(), shift: a.shift, slot: a.slot, fees: Number(a.fees),
      discountPct: Number(a.discountPct), paid: Number(a.paid), priority: a.priority, source: a.source,
      paymentMode: a.paymentMode, liveConsult: a.liveConsult, status: a.status,
      alternateAddress: a.alternateAddress, message: a.message, createdByName: null,
    }));
  }

  async book(user: RequestUser, input: PortalBookInput): Promise<AppointmentDto> {
    const p = await this.requirePatient(user);
    const apptNo = await this.sequence.next(p.branchId, 'appointment');
    const a = await this.prisma.appointment.create({
      data: {
        branchId: p.branchId, apptNo, patientId: p.id, caseId: p.cases[0]?.id ?? null,
        doctorId: input.doctorId, apptDate: input.apptDate, fees: 0, paid: 0,
        priority: 'normal', status: 'pending', source: 'portal', message: input.message || null,
      },
      include: { doctor: { select: { name: true } }, case: { select: { caseNo: true } } },
    });
    await this.audit.record({ branchId: p.branchId, userId: user.id, action: 'portal_book', entity: 'appointment', entityId: a.id });
    return {
      id: a.id, apptNo: a.apptNo, patientId: a.patientId, patientName: p.name, patientPhone: p.phone,
      patientGender: p.gender, caseNo: a.case?.caseNo ?? null, doctorId: a.doctorId, doctorName: a.doctor.name,
      apptDate: a.apptDate.toISOString(), shift: null, slot: null, fees: 0, discountPct: 0, paid: 0,
      priority: 'normal', source: 'portal', paymentMode: 'cash', liveConsult: false, status: 'pending',
      alternateAddress: null, message: a.message, createdByName: null,
    };
  }

  async visits(user: RequestUser): Promise<PortalVisitDto[]> {
    const p = await this.requirePatient(user);
    const [opd, ipd] = await Promise.all([
      this.prisma.opdVisit.findMany({ where: { patientId: p.id, deletedAt: null }, include: { consultant: { select: { name: true } }, case: { select: { caseNo: true } } } }),
      this.prisma.ipdAdmission.findMany({ where: { patientId: p.id, deletedAt: null }, include: { consultant: { select: { name: true } }, case: { select: { caseNo: true } } } }),
    ]);
    const visits: PortalVisitDto[] = [
      ...opd.map((o) => ({ id: o.id, type: 'opd' as const, no: o.opdNo, caseNo: o.case?.caseNo ?? null, consultantName: o.consultant.name, date: o.appointmentDate.toISOString(), detail: o.symptoms })),
      ...ipd.map((i) => ({ id: i.id, type: 'ipd' as const, no: i.ipdNo, caseNo: i.case?.caseNo ?? null, consultantName: i.consultant.name, date: i.admissionDate.toISOString(), detail: i.status })),
    ];
    return visits.sort((a, b) => b.date.localeCompare(a.date));
  }

  async listInvoices(user: RequestUser): Promise<InvoiceDto[]> {
    const p = await this.requirePatient(user);
    const rows = await this.prisma.invoice.findMany({
      where: { patientId: p.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { case: { select: { caseNo: true } } },
    });
    return rows.map((r) => ({
      id: r.id, billNo: r.billNo, module: r.module, patientId: r.patientId, patientName: p.name, patientPhone: p.phone,
      caseNo: r.case?.caseNo ?? null, billDate: r.billDate.toISOString(), subtotal: Number(r.subtotal),
      discount: Number(r.discount), tax: Number(r.tax), netAmount: Number(r.netAmount), paid: Number(r.paid),
      refund: Number(r.refund), balance: Number(r.balance), status: r.status,
      consultantId: null, consultantName: null, referenceDoctor: null, prescriptionNo: null, note: r.note, previousReportValue: r.previousReportValue, createdByName: null,
      tpaName: null, tpaIdNo: null, tpaValidity: null, patientAge: p.age, patientGender: p.gender,
      patientBloodGroup: p.bloodGroup, patientEmail: p.email, patientAddress: p.address,
    }));
  }

  async pay(user: RequestUser, invoiceId: string, amount: number): Promise<InvoiceDto> {
    const p = await this.requirePatient(user);
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, patientId: p.id, deletedAt: null } });
    if (!invoice) throw new ForbiddenException('Invoice not found');
    return this.invoices.addPayment(user, p.branchId, invoiceId, amount, 'upi', 'portal');
  }

  async notifications(user: RequestUser) {
    const p = await this.requirePatient(user);
    const rows = await this.prisma.notification.findMany({
      where: { branchId: p.branchId, deletedAt: null },
      orderBy: { date: 'desc' },
      take: 20,
    });
    return rows.map((n) => ({ id: n.id, type: n.type, subject: n.subject, body: n.body, date: n.date.toISOString() }));
  }
}
