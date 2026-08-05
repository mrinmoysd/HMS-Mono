import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { BranchDto, BranchInput, BranchOverviewDto, BranchOverviewSection, BranchUpdateInput } from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import type { RequestUser } from '../common/types/request-user';

const ONLINE_MODES = ['card', 'upi'];

function toBranchDto(b: { id: string; name: string; code: string; url: string | null; isHome: boolean }): BranchDto {
  return { id: b.id, name: b.name, code: b.code, url: b.url, isHome: b.isHome };
}

/** Slugify the branch name into a short unique code (e.g. "Smart Hospital Branch 2" -> "SHB2-A1C3"). */
function generateBranchCode(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .join('')
    .slice(0, 6) || 'BR';
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${initials}-${suffix}`;
}

@Injectable()
export class MultiBranchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listBranches(): Promise<BranchDto[]> {
    const rows = await this.prisma.branch.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'asc' } });
    return rows.map(toBranchDto);
  }

  async createBranch(user: RequestUser, input: BranchInput): Promise<BranchDto> {
    const b = await this.prisma.branch.create({ data: { name: input.name, code: generateBranchCode(input.name), url: input.url || null } });
    await this.audit.record({ branchId: b.id, userId: user.id, action: 'create', entity: 'branch', entityId: b.id });
    return toBranchDto(b);
  }

  async updateBranch(user: RequestUser, id: string, input: BranchUpdateInput): Promise<BranchDto> {
    const existing = await this.prisma.branch.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Branch not found');
    const b = await this.prisma.branch.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.url !== undefined ? { url: input.url || null } : {}),
      },
    });
    await this.audit.record({ branchId: id, userId: user.id, action: 'update', entity: 'branch', entityId: id });
    return toBranchDto(b);
  }

  async removeBranch(user: RequestUser, id: string): Promise<void> {
    const existing = await this.prisma.branch.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Branch not found');
    await this.prisma.branch.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId: id, userId: user.id, action: 'delete', entity: 'branch', entityId: id });
  }

  /** Consolidated cross-branch overview — one table + pie chart per operational area. */
  async overview(from?: string, to?: string): Promise<BranchOverviewDto> {
    const range: Prisma.DateTimeFilter | undefined =
      from || to
        ? {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: (() => { const e = new Date(to); e.setHours(23, 59, 59, 999); return e; })() } : {}),
          }
        : undefined;

    const branches = await this.prisma.branch.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'asc' } });

    const perBranch = await Promise.all(branches.map((b) => this.branchMetrics(b.id, range)));

    const section = (
      key: string,
      title: string,
      columns: { key: string; label: string }[],
      pieMetric: string,
    ): BranchOverviewSection => ({
      key,
      title,
      columns,
      pieMetric,
      rows: branches.map((b, i) => ({
        branchId: b.id,
        branchName: b.isHome ? `${b.name} (Home Branch)` : b.name,
        isHome: b.isHome,
        values: perBranch[i]![key]!,
      })),
    });

    const sections: BranchOverviewSection[] = [
      section('appointment', 'Appointment', [
        { key: 'onlineCount', label: 'Online Appointment' },
        { key: 'onlineAmount', label: 'Online Amount ($)' },
        { key: 'offlineCount', label: 'Offline Appointment' },
        { key: 'offlineAmount', label: 'Offline Amount ($)' },
        { key: 'totalCount', label: 'Total Appointments' },
        { key: 'totalAmount', label: 'Total Amount ($)' },
      ], 'totalCount'),
      section('opd', 'OPD - Out Patient', [
        { key: 'totalOpd', label: 'Total OPD' },
        { key: 'totalVisit', label: 'Total Visit' },
        { key: 'totalAmount', label: 'Total Amount ($)' },
        { key: 'totalPaid', label: 'Total Paid ($)' },
      ], 'totalVisit'),
      section('ipd', 'IPD - In Patient', [
        { key: 'patientCount', label: 'Patient Count' },
        { key: 'totalIpd', label: 'Total IPD' },
        { key: 'totalAmount', label: 'Total Amount ($)' },
        { key: 'totalPaid', label: 'Total Paid ($)' },
      ], 'totalIpd'),
      section('ot', 'Operation Theatre', [
        { key: 'patientCount', label: 'Patient Count' },
        { key: 'totalOperation', label: 'Total Operation' },
      ], 'totalOperation'),
      section('pharmacy', 'Pharmacy', [
        { key: 'patientCount', label: 'Patient Count' },
        { key: 'totalAmount', label: 'Total Amount ($)' },
        { key: 'totalPaid', label: 'Total Paid ($)' },
        { key: 'totalRefund', label: 'Total Refund ($)' },
      ], 'totalAmount'),
      section('pathology', 'Pathology', [
        { key: 'patientCount', label: 'Patient Count' },
        { key: 'totalAmount', label: 'Total Amount ($)' },
        { key: 'totalPaid', label: 'Total Paid ($)' },
      ], 'totalAmount'),
      section('radiology', 'Radiology', [
        { key: 'patientCount', label: 'Patient Count' },
        { key: 'totalAmount', label: 'Total Amount ($)' },
        { key: 'totalPaid', label: 'Total Paid ($)' },
      ], 'totalAmount'),
      section('bloodDonor', 'Blood Donor Transactions', [
        { key: 'patientCount', label: 'Patient Count' },
        { key: 'totalAmount', label: 'Total Amount ($)' },
        { key: 'totalPaid', label: 'Total Paid ($)' },
      ], 'patientCount'),
      section('bloodIssue', 'Blood Issue Transactions', [
        { key: 'patientCount', label: 'Patient Count' },
        { key: 'totalAmount', label: 'Total Amount ($)' },
        { key: 'totalPaid', label: 'Total Paid ($)' },
      ], 'totalAmount'),
      section('componentIssue', 'Component Issue Transactions', [
        { key: 'patientCount', label: 'Patient Count' },
        { key: 'totalAmount', label: 'Total Amount ($)' },
        { key: 'totalPaid', label: 'Total Paid ($)' },
      ], 'totalAmount'),
      section('ambulance', 'Ambulance', [
        { key: 'patientCount', label: 'Patient Count' },
        { key: 'totalAmount', label: 'Total Amount ($)' },
        { key: 'totalPaid', label: 'Total Paid ($)' },
      ], 'totalAmount'),
      section('birth', 'Birth Record', [{ key: 'totalBirth', label: 'Total Birth' }], 'totalBirth'),
      section('death', 'Death Record', [{ key: 'totalDeath', label: 'Total Death' }], 'totalDeath'),
      section('staffAttendance', 'Staff Attendance', [
        { key: 'totalStaff', label: 'Total Staff' },
        { key: 'totalPresent', label: 'Total Present' },
        { key: 'totalAbsent', label: 'Total Absent' },
      ], 'totalStaff'),
      section('payroll', 'Payroll', [
        { key: 'totalStaff', label: 'Total Staff' },
        { key: 'payrollGenerated', label: 'Payroll Generated' },
        { key: 'netPayrollAmount', label: 'Net Payroll Amount ($)' },
        { key: 'payrollPaid', label: 'Payroll Paid ($)' },
      ], 'netPayrollAmount'),
      section('transactions', 'Transactions', [
        { key: 'patientCount', label: 'Patient Count' },
        { key: 'onlinePaid', label: 'Online Paid ($)' },
        { key: 'offlinePaid', label: 'Offline Paid ($)' },
        { key: 'totalRefund', label: 'Total Refund ($)' },
        { key: 'total', label: 'Total ($)' },
      ], 'total'),
    ];

    return { sections };
  }

  private async branchMetrics(branchId: string, range?: Prisma.DateTimeFilter): Promise<Record<string, Record<string, number>>> {
    const dateWhere = range ? { gte: range.gte, lte: range.lte } : undefined;

    const [
      appointments,
      opdVisits,
      opdInv,
      ipdAdmissions,
      ipdInv,
      operationRecords,
      pharmacyInv,
      pathologyInv,
      radiologyInv,
      bloodDonors,
      bloodIssues,
      componentIssues,
      ambulanceCalls,
      ambulanceInv,
      totalBirth,
      totalDeath,
      totalStaff,
      presentCount,
      absentCount,
      payrolls,
      allInvoices,
      allPayments,
    ] = await Promise.all([
      this.prisma.appointment.findMany({ where: { branchId, deletedAt: null, ...(dateWhere ? { apptDate: dateWhere } : {}) }, select: { paymentMode: true, paid: true } }),
      this.prisma.opdVisit.findMany({ where: { branchId, deletedAt: null, ...(dateWhere ? { appointmentDate: dateWhere } : {}) }, select: { patientId: true } }),
      this.invoiceAgg(branchId, 'opd', dateWhere),
      this.prisma.ipdAdmission.findMany({ where: { branchId, deletedAt: null, ...(dateWhere ? { admissionDate: dateWhere } : {}) }, select: { patientId: true } }),
      this.invoiceAgg(branchId, 'ipd', dateWhere),
      this.prisma.operationRecord.findMany({ where: { branchId, ...(dateWhere ? { date: dateWhere } : {}) }, select: { patientId: true } }),
      this.invoiceAgg(branchId, 'pharmacy', dateWhere),
      this.invoiceAgg(branchId, 'pathology', dateWhere),
      this.invoiceAgg(branchId, 'radiology', dateWhere),
      this.prisma.bloodDonor.count({ where: { branchId, deletedAt: null, ...(dateWhere ? { createdAt: dateWhere } : {}) } }),
      this.prisma.bloodIssue.findMany({ where: { branchId, type: 'blood', ...(dateWhere ? { issuedAt: dateWhere } : {}) }, select: { patientId: true, invoiceId: true } }),
      this.prisma.bloodIssue.findMany({ where: { branchId, type: 'component', ...(dateWhere ? { issuedAt: dateWhere } : {}) }, select: { patientId: true, invoiceId: true } }),
      this.prisma.ambulanceCall.findMany({ where: { branchId, deletedAt: null, ...(dateWhere ? { date: dateWhere } : {}) }, select: { patientId: true } }),
      this.invoiceAgg(branchId, 'ambulance', dateWhere),
      this.prisma.birthRecord.count({ where: { branchId, deletedAt: null, ...(dateWhere ? { birthDate: dateWhere } : {}) } }),
      this.prisma.deathRecord.count({ where: { branchId, deletedAt: null, ...(dateWhere ? { deathDate: dateWhere } : {}) } }),
      this.prisma.staff.count({ where: { branchId, deletedAt: null } }),
      this.prisma.attendance.count({ where: { branchId, status: 'present', ...(dateWhere ? { date: dateWhere } : {}) } }),
      this.prisma.attendance.count({ where: { branchId, status: 'absent', ...(dateWhere ? { date: dateWhere } : {}) } }),
      this.prisma.payroll.findMany({ where: { branchId, ...(dateWhere ? { createdAt: dateWhere } : {}) }, select: { net: true, status: true } }),
      this.prisma.invoice.findMany({ where: { branchId, deletedAt: null, ...(dateWhere ? { createdAt: dateWhere } : {}) }, select: { id: true, patientId: true, refund: true, netAmount: true } }),
      this.prisma.payment.findMany({ where: { deletedAt: null, invoice: { branchId, deletedAt: null }, ...(dateWhere ? { paidAt: dateWhere } : {}) }, select: { amount: true, mode: true } }),
    ]);

    const apptOnline = appointments.filter((a) => ONLINE_MODES.includes(a.paymentMode));
    const apptOffline = appointments.filter((a) => !ONLINE_MODES.includes(a.paymentMode));
    const bloodIssueInv = await this.invoiceAggByIds(bloodIssues.map((i) => i.invoiceId).filter((x): x is string => !!x));
    const componentIssueInv = await this.invoiceAggByIds(componentIssues.map((i) => i.invoiceId).filter((x): x is string => !!x));

    const netPayroll = payrolls.reduce((s, p) => s + Number(p.net), 0);
    const payrollPaid = payrolls.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.net), 0);

    const txnPatients = new Set(allInvoices.map((i) => i.patientId)).size;
    const txnRefund = allInvoices.reduce((s, i) => s + Number(i.refund), 0);
    const txnTotal = allInvoices.reduce((s, i) => s + Number(i.netAmount), 0);
    const onlinePaid = allPayments.filter((p) => ONLINE_MODES.includes(p.mode)).reduce((s, p) => s + Number(p.amount), 0);
    const offlinePaid = allPayments.filter((p) => !ONLINE_MODES.includes(p.mode)).reduce((s, p) => s + Number(p.amount), 0);

    return {
      appointment: {
        onlineCount: apptOnline.length,
        onlineAmount: apptOnline.reduce((s, a) => s + Number(a.paid), 0),
        offlineCount: apptOffline.length,
        offlineAmount: apptOffline.reduce((s, a) => s + Number(a.paid), 0),
        totalCount: appointments.length,
        totalAmount: appointments.reduce((s, a) => s + Number(a.paid), 0),
      },
      opd: {
        totalOpd: opdVisits.length,
        totalVisit: opdVisits.length,
        totalAmount: opdInv.amount,
        totalPaid: opdInv.paid,
      },
      ipd: {
        patientCount: new Set(ipdAdmissions.map((r) => r.patientId)).size,
        totalIpd: ipdAdmissions.length,
        totalAmount: ipdInv.amount,
        totalPaid: ipdInv.paid,
      },
      ot: {
        patientCount: new Set(operationRecords.map((r) => r.patientId)).size,
        totalOperation: operationRecords.length,
      },
      pharmacy: {
        patientCount: pharmacyInv.patientCount,
        totalAmount: pharmacyInv.amount,
        totalPaid: pharmacyInv.paid,
        totalRefund: pharmacyInv.refund,
      },
      pathology: {
        patientCount: pathologyInv.patientCount,
        totalAmount: pathologyInv.amount,
        totalPaid: pathologyInv.paid,
      },
      radiology: {
        patientCount: radiologyInv.patientCount,
        totalAmount: radiologyInv.amount,
        totalPaid: radiologyInv.paid,
      },
      bloodDonor: {
        patientCount: bloodDonors,
        totalAmount: 0,
        totalPaid: 0,
      },
      bloodIssue: {
        patientCount: new Set(bloodIssues.map((r) => r.patientId).filter(Boolean)).size,
        totalAmount: bloodIssueInv.amount,
        totalPaid: bloodIssueInv.paid,
      },
      componentIssue: {
        patientCount: new Set(componentIssues.map((r) => r.patientId).filter(Boolean)).size,
        totalAmount: componentIssueInv.amount,
        totalPaid: componentIssueInv.paid,
      },
      ambulance: {
        patientCount: new Set(ambulanceCalls.map((r) => r.patientId).filter(Boolean)).size,
        totalAmount: ambulanceInv.amount,
        totalPaid: ambulanceInv.paid,
      },
      birth: { totalBirth },
      death: { totalDeath },
      staffAttendance: {
        totalStaff,
        totalPresent: presentCount,
        totalAbsent: absentCount,
      },
      payroll: {
        totalStaff,
        payrollGenerated: payrolls.length,
        netPayrollAmount: netPayroll,
        payrollPaid,
      },
      transactions: {
        patientCount: txnPatients,
        onlinePaid,
        offlinePaid,
        totalRefund: txnRefund,
        total: txnTotal,
      },
    };
  }

  private async invoiceAgg(branchId: string, module: string, dateWhere?: Prisma.DateTimeFilter): Promise<{ patientCount: number; amount: number; paid: number; refund: number }> {
    const rows = await this.prisma.invoice.findMany({
      where: { branchId, module, deletedAt: null, ...(dateWhere ? { createdAt: dateWhere } : {}) },
      select: { patientId: true, netAmount: true, paid: true, refund: true },
    });
    return {
      patientCount: new Set(rows.map((r) => r.patientId)).size,
      amount: rows.reduce((s, r) => s + Number(r.netAmount), 0),
      paid: rows.reduce((s, r) => s + Number(r.paid), 0),
      refund: rows.reduce((s, r) => s + Number(r.refund), 0),
    };
  }

  private async invoiceAggByIds(ids: string[]): Promise<{ amount: number; paid: number }> {
    if (ids.length === 0) return { amount: 0, paid: 0 };
    const rows = await this.prisma.invoice.findMany({ where: { id: { in: ids } }, select: { netAmount: true, paid: true } });
    return {
      amount: rows.reduce((s, r) => s + Number(r.netAmount), 0),
      paid: rows.reduce((s, r) => s + Number(r.paid), 0),
    };
  }
}
