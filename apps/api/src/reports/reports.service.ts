import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ALL_REPORT_KEYS, type ReportResult } from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';

type Builder = (branchId: string, range: Prisma.DateTimeFilter) => Promise<Omit<ReportResult, 'key'>>;

/**
 * Unified reporting engine (FRD §2.28). Each of the 19 report categories maps
 * to a builder that queries the operational tables with a date-range filter.
 * All queries are branch-scoped; results are tabular (columns + rows) so the
 * client renders and exports them uniformly.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async run(key: string, branchId: string, from?: string, to?: string): Promise<ReportResult> {
    const builder = this.builders[key];
    if (!builder) throw new BadRequestException(`Unknown report: ${key}`);
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    const result = await builder(branchId, range);
    return { key, ...result };
  }

  keys(): string[] {
    return ALL_REPORT_KEYS.filter((k) => this.builders[k]);
  }

  private money = (d: Prisma.Decimal | number) => Number(d);
  private day = (d: Date) => d.toISOString().slice(0, 10);

  private readonly builders: Record<string, Builder> = {
    'finance-income': async (branchId, date) => {
      const rows = await this.prisma.income.findMany({ where: { branchId, deletedAt: null, date }, orderBy: { date: 'desc' }, include: { head: true } });
      const total = rows.reduce((s, r) => s + this.money(r.amount), 0);
      return {
        title: 'Income Report',
        columns: ['Invoice No', 'Name', 'Head', 'Date', 'Amount'],
        rows: rows.map((r) => [r.invoiceNo ?? "—", r.name, r.head?.name ?? '—', this.day(r.date), this.money(r.amount)]),
        summary: { 'Total Income': total, Entries: rows.length },
      };
    },
    'finance-expense': async (branchId, date) => {
      const rows = await this.prisma.expense.findMany({ where: { branchId, deletedAt: null, date }, orderBy: { date: 'desc' }, include: { head: true } });
      const total = rows.reduce((s, r) => s + this.money(r.amount), 0);
      return {
        title: 'Expense Report',
        columns: ['Invoice No', 'Name', 'Head', 'Date', 'Amount'],
        rows: rows.map((r) => [r.invoiceNo ?? "—", r.name, r.head?.name ?? '—', this.day(r.date), this.money(r.amount)]),
        summary: { 'Total Expense': total, Entries: rows.length },
      };
    },
    'finance-daily': async (branchId, date) => {
      const rows = await this.prisma.invoice.findMany({ where: { branchId, deletedAt: null, createdAt: date }, orderBy: { createdAt: 'desc' }, include: { patient: { select: { name: true } } } });
      const billed = rows.reduce((s, r) => s + this.money(r.netAmount), 0);
      const paid = rows.reduce((s, r) => s + this.money(r.paid), 0);
      return {
        title: 'Daily Transaction Report',
        columns: ['Bill No', 'Module', 'Patient', 'Date', 'Net', 'Paid', 'Balance'],
        rows: rows.map((r) => [r.billNo, r.module.toUpperCase(), r.patient.name, this.day(r.createdAt), this.money(r.netAmount), this.money(r.paid), this.money(r.balance)]),
        summary: { 'Total Billed': billed, 'Total Collected': paid, Transactions: rows.length },
      };
    },
    'finance-patient-bill': async (branchId, date) => this.invoiceReport(branchId, date, undefined, 'Patient Bill Report'),
    pharmacy: async (branchId, date) => this.invoiceReport(branchId, date, 'pharmacy', 'Pharmacy Bill Report'),
    pathology: async (branchId, date) => this.invoiceReport(branchId, date, 'pathology', 'Pathology Report'),
    radiology: async (branchId, date) => this.invoiceReport(branchId, date, 'radiology', 'Radiology Report'),
    ambulance: async (branchId, date) => this.invoiceReport(branchId, date, 'ambulance', 'Ambulance Report'),

    'blood-donor': async (branchId, date) => {
      const rows = await this.prisma.bloodDonor.findMany({ where: { branchId, deletedAt: null, createdAt: date }, orderBy: { createdAt: 'desc' } });
      return {
        title: 'Blood Donor Report',
        columns: ['Name', 'Blood Group', 'Phone', 'Age', 'Last Donation'],
        rows: rows.map((r) => [r.name, r.bloodGroup, r.phone ?? '—', r.age ?? '—', r.lastDonation ? this.day(r.lastDonation) : '—']),
        summary: { Donors: rows.length },
      };
    },
    'blood-issue': async (branchId, date) => this.bloodIssueReport(branchId, date, 'blood', 'Blood Issue Report'),
    'component-issue': async (branchId, date) => this.bloodIssueReport(branchId, date, 'component', 'Component Issue Report'),

    ot: async (branchId, date) => {
      const rows = await this.prisma.operationRecord.findMany({ where: { branchId, date }, orderBy: { date: 'desc' }, include: { patient: { select: { name: true } } } });
      return {
        title: 'OT Report',
        columns: ['Operation', 'Patient', 'Consultant', 'Date', 'Result'],
        rows: rows.map((r) => [r.name, r.patient.name, r.consultant ?? '—', this.day(r.date), r.result ?? '—']),
        summary: { Operations: rows.length },
      };
    },
    'medicine-expiry': async (branchId, date) => {
      const rows = await this.prisma.medicine.findMany({ where: { branchId, deletedAt: null, expiry: date }, orderBy: { expiry: 'asc' } });
      return {
        title: 'Medicine Expiry Report',
        columns: ['Medicine', 'Company', 'Stock', 'Expiry'],
        rows: rows.map((r) => [r.name, r.company ?? '—', r.stock, r.expiry ? this.day(r.expiry) : '—']),
        summary: { Medicines: rows.length },
      };
    },
    transaction: async (branchId, date) => {
      const rows = await this.prisma.invoice.findMany({ where: { branchId, deletedAt: null, createdAt: date }, orderBy: { createdAt: 'desc' }, include: { patient: { select: { name: true } } } });
      const net = rows.reduce((s, r) => s + this.money(r.netAmount), 0);
      const paid = rows.reduce((s, r) => s + this.money(r.paid), 0);
      const refund = rows.reduce((s, r) => s + this.money(r.refund), 0);
      return {
        title: 'Transaction Report',
        columns: ['Bill No', 'Module', 'Patient', 'Date', 'Net', 'Paid', 'Refund'],
        rows: rows.map((r) => [r.billNo, r.module.toUpperCase(), r.patient.name, this.day(r.createdAt), this.money(r.netAmount), this.money(r.paid), this.money(r.refund)]),
        summary: { 'Total Net': net, 'Total Paid': paid, 'Total Refund': refund, Transactions: rows.length },
      };
    },

    appointment: async (branchId, date) => {
      const rows = await this.prisma.appointment.findMany({ where: { branchId, deletedAt: null, apptDate: date }, orderBy: { apptDate: 'desc' }, include: { patient: { select: { name: true } }, doctor: { select: { name: true } } } });
      return {
        title: 'Appointment Report',
        columns: ['Appt No', 'Patient', 'Doctor', 'Date', 'Fees', 'Paid', 'Status'],
        rows: rows.map((r) => [r.apptNo, r.patient.name, r.doctor.name, this.day(r.apptDate), this.money(r.fees), this.money(r.paid), r.status]),
        summary: { Appointments: rows.length },
      };
    },
    opd: async (branchId, date) => {
      const rows = await this.prisma.opdVisit.findMany({ where: { branchId, deletedAt: null, appointmentDate: date }, orderBy: { appointmentDate: 'desc' }, include: { patient: { select: { name: true } }, consultant: { select: { name: true } } } });
      return { title: 'OPD Report', columns: ['OPD No', 'Patient', 'Consultant', 'Date'], rows: rows.map((r) => [r.opdNo, r.patient.name, r.consultant.name, this.day(r.appointmentDate)]), summary: { 'OPD Visits': rows.length } };
    },
    ipd: async (branchId, date) => {
      const rows = await this.prisma.ipdAdmission.findMany({ where: { branchId, deletedAt: null, admissionDate: date }, orderBy: { admissionDate: 'desc' }, include: { patient: { select: { name: true } }, bed: { select: { bedNo: true } } } });
      return { title: 'IPD Report', columns: ['IPD No', 'Patient', 'Bed', 'Admitted', 'Status'], rows: rows.map((r) => [r.ipdNo, r.patient.name, r.bed.bedNo, this.day(r.admissionDate), r.status]), summary: { Admissions: rows.length } };
    },
    birth: async (branchId, date) => {
      const rows = await this.prisma.birthRecord.findMany({ where: { branchId, deletedAt: null, birthDate: date }, orderBy: { birthDate: 'desc' } });
      return { title: 'Birth Report', columns: ['Ref No', 'Child', 'Gender', 'Date', 'Mother'], rows: rows.map((r) => [r.referenceNo, r.childName, r.gender ?? '—', this.day(r.birthDate), r.motherName ?? '—']), summary: { Births: rows.length } };
    },
    death: async (branchId, date) => {
      const rows = await this.prisma.deathRecord.findMany({ where: { branchId, deletedAt: null, deathDate: date }, orderBy: { deathDate: 'desc' } });
      return { title: 'Death Report', columns: ['Ref No', 'Patient', 'Gender', 'Date'], rows: rows.map((r) => [r.referenceNo, r.patientName, r.gender ?? '—', this.day(r.deathDate)]), summary: { Deaths: rows.length } };
    },
    payroll: async (branchId) => {
      const rows = await this.prisma.payroll.findMany({ where: { branchId }, orderBy: { month: 'desc' } });
      const names = await this.nameMap(rows.map((r) => r.staffUserId));
      const total = rows.reduce((s, r) => s + this.money(r.net), 0);
      return { title: 'Payroll Report', columns: ['Staff', 'Month', 'Gross', 'Deductions', 'Net'], rows: rows.map((r) => [names.get(r.staffUserId) ?? '—', r.month, this.money(r.gross), this.money(r.deductions), this.money(r.net)]), summary: { 'Total Net': total, Payslips: rows.length } };
    },
    attendance: async (branchId, date) => {
      const rows = await this.prisma.attendance.findMany({ where: { branchId, date }, orderBy: { date: 'desc' } });
      const names = await this.nameMap(rows.map((r) => r.staffUserId));
      return { title: 'Staff Attendance Report', columns: ['Staff', 'Date', 'In', 'Out', 'Status'], rows: rows.map((r) => [names.get(r.staffUserId) ?? '—', this.day(r.date), r.inTime ? r.inTime.toISOString().slice(11, 16) : '—', r.outTime ? r.outTime.toISOString().slice(11, 16) : '—', r.status]), summary: { Records: rows.length } };
    },
    'inventory-stock': async (branchId) => {
      const items = await this.prisma.inventoryItem.findMany({ where: { branchId, deletedAt: null }, include: { stocks: true, issues: true } });
      return { title: 'Inventory Stock Report', columns: ['Item', 'Purchase Price', 'In Stock'], rows: items.map((i) => [i.name, this.money(i.purchasePrice), i.stocks.reduce((s, x) => s + x.qty, 0) - i.issues.reduce((s, x) => s + x.qty, 0)]), summary: { Items: items.length } };
    },
    live: async (branchId, date) => {
      const rows = await this.prisma.liveConsultation.findMany({ where: { branchId, deletedAt: null, date }, orderBy: { date: 'desc' } });
      return { title: 'Live Consultation Report', columns: ['Title', 'Kind', 'Date', 'API', 'Status'], rows: rows.map((r) => [r.title, r.kind, this.day(r.date), r.apiUsed ?? '—', r.status]), summary: { Sessions: rows.length } };
    },
    audit: async (branchId, date) => {
      const rows = await this.prisma.auditLog.findMany({ where: { branchId, createdAt: date }, orderBy: { createdAt: 'desc' }, take: 500, include: { user: { select: { name: true } } } });
      return { title: 'Audit Trail Report', columns: ['User', 'Action', 'Entity', 'When'], rows: rows.map((r) => [r.user?.name ?? 'system', r.action, r.entity, r.createdAt.toISOString().slice(0, 16).replace('T', ' ')]), summary: { Events: rows.length } };
    },
    patient: async (branchId, date) => {
      const rows = await this.prisma.patient.findMany({ where: { branchId, deletedAt: null, createdAt: date }, orderBy: { createdAt: 'desc' } });
      return { title: 'Patient Visit Report', columns: ['Patient No', 'Name', 'Age', 'Gender', 'Phone', 'Registered'], rows: rows.map((r) => [r.patientNo, r.name, r.age, r.gender ?? '—', r.phone ?? '—', this.day(r.createdAt)]), summary: { Patients: rows.length } };
    },
  };

  private async invoiceReport(branchId: string, date: Prisma.DateTimeFilter, module: string | undefined, title: string): Promise<Omit<ReportResult, 'key'>> {
    const rows = await this.prisma.invoice.findMany({ where: { branchId, deletedAt: null, createdAt: date, ...(module ? { module } : {}) }, orderBy: { createdAt: 'desc' }, include: { patient: { select: { name: true } } } });
    const net = rows.reduce((s, r) => s + this.money(r.netAmount), 0);
    const paid = rows.reduce((s, r) => s + this.money(r.paid), 0);
    return {
      title,
      columns: ['Bill No', 'Patient', 'Date', 'Net', 'Paid', 'Balance'],
      rows: rows.map((r) => [r.billNo, r.patient.name, this.day(r.createdAt), this.money(r.netAmount), this.money(r.paid), this.money(r.balance)]),
      summary: { 'Total Net': net, 'Total Paid': paid, Bills: rows.length },
    };
  }

  private async bloodIssueReport(branchId: string, date: Prisma.DateTimeFilter, type: 'blood' | 'component', title: string): Promise<Omit<ReportResult, 'key'>> {
    const rows = await this.prisma.bloodIssue.findMany({
      where: { branchId, type, issuedAt: date },
      orderBy: { issuedAt: 'desc' },
      include: { donor: { select: { name: true, bloodGroup: true } } },
    });
    return {
      title,
      columns: ['Donor', 'Blood Group', 'Units', 'Technician', 'Issued'],
      rows: rows.map((r) => [r.donor?.name ?? '—', r.donor?.bloodGroup ?? r.bloodQty ?? '—', r.units, r.technician ?? '—', this.day(r.issuedAt)]),
      summary: { Issued: rows.length },
    };
  }

  private async nameMap(userIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)];
    if (!unique.length) return new Map();
    const users = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
    return new Map(users.map((u) => [u.id, u.name]));
  }
}
