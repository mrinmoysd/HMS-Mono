import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ALL_REPORT_KEYS, type ReportResult } from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { GeneralSettingsCache } from '../settings/general-settings.cache';
import { zonedDayBounds } from '../common/dates';

/**
 * Builders receive the hospital's timezone as well as the range.
 *
 * Anything rendering a clock time needs it. `toISOString().slice(11,16)` reads
 * the UTC wall clock, so a nurse who badged in at 09:05 in Kolkata appeared on
 * the attendance report as 03:35 — the same mistake as the range bug, one
 * layer down.
 */
type Builder = (
  branchId: string,
  range: Prisma.DateTimeFilter,
  zone: string,
) => Promise<Omit<ReportResult, 'key'>>;

/**
 * Unified reporting engine (FRD §2.28). Each of the 19 report categories maps
 * to a builder that queries the operational tables with a date-range filter.
 * All queries are branch-scoped; results are tabular (columns + rows) so the
 * client renders and exports them uniformly.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generalSettings: GeneralSettingsCache,
  ) {}

  async run(key: string, branchId: string, from?: string, to?: string): Promise<ReportResult> {
    const builder = this.builders[key];
    if (!builder) throw new BadRequestException(`Unknown report: ${key}`);
    const { timeZone } = await this.generalSettings.get(branchId);
    const result = await builder(branchId, this.rangeIn(timeZone, from, to), timeZone);
    return { key, ...result };
  }

  /**
   * The instants covering the days the user asked for, in the hospital's zone.
   *
   * "From the 1st to the 11th" means eleven of *their* days. Reading the dates
   * as UTC, or closing the range with `setHours` in the server's zone, silently
   * clips one end: a hospital in Asia/Kolkata lost the last five and a half
   * hours of the 11th and gained the same slice of the 12th. Every figure on
   * every report was drawn from a window nobody asked for.
   */
  private rangeIn(timeZone: string, from?: string, to?: string): Prisma.DateTimeFilter {
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = zonedDayBounds(from, timeZone).start;
    if (to) range.lte = zonedDayBounds(to, timeZone).end;
    return range;
  }

  /** A stored instant as "HH:MM" on the hospital's clock. */
  private clock(at: Date | null, zone: string): string {
    if (!at) return '—';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(at);
    } catch {
      return at.toISOString().slice(11, 16);
    }
  }

  /**
   * The report keys this engine can actually run.
   *
   * `reports.spec.ts` asserts this covers every builder-backed catalogue entry.
   * Without that, a key could be added to the catalogue, appear in the menu for
   * anyone holding its permission, and 400 on click — the menu-of-things-that-
   * fail problem the catalogue filter exists to prevent.
   */
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
    attendance: async (branchId, date, zone) => {
      const rows = await this.prisma.attendance.findMany({ where: { branchId, date }, orderBy: { date: 'desc' } });
      const names = await this.nameMap(rows.map((r) => r.staffUserId));
      return { title: 'Staff Attendance Report', columns: ['Staff', 'Date', 'In', 'Out', 'Status'], rows: rows.map((r) => [names.get(r.staffUserId) ?? '—', this.day(r.date), this.clock(r.inTime, zone), this.clock(r.outTime, zone), r.status]), summary: { Records: rows.length } };
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

    // ── Logs (RP5) ────────────────────────────────────────────────────

    /**
     * Who signed in, and when.
     *
     * Reads the `login` rows the auth service now writes. `User.lastLoginAt`
     * cannot answer this — it is one timestamp per account, overwritten every
     * time, so it says when somebody last signed in and never how often or how
     * many people did.
     *
     * There is no history before the release that started writing these, and
     * none can be reconstructed. An empty report says so rather than leaving
     * the reader to conclude nobody has logged in.
     */
    'user-log': async (branchId, date, zone) => {
      const rows = await this.prisma.auditLog.findMany({
        where: { branchId, action: 'login', createdAt: date },
        orderBy: { createdAt: 'desc' },
        take: 5000,
        include: { user: { select: { name: true, username: true, type: true, role: { select: { label: true } } } } },
      });
      if (!rows.length) {
        return {
          title: 'User Log',
          columns: ['Note'],
          rows: [['No sign-ins recorded for this period. Login history starts from the release that began recording it; earlier sign-ins were never stored and cannot be recovered.']],
          summary: { 'Sign-ins': 0, 'Distinct Users': 0 },
        };
      }
      return {
        title: 'User Log',
        columns: ['User', 'Username', 'Type', 'Role', 'Date', 'Time', 'IP'],
        rows: rows.map((r) => [
          r.user?.name ?? '—',
          r.user?.username ?? '—',
          r.user?.type ?? '—',
          r.user?.role?.label ?? '—',
          this.day(r.createdAt),
          this.clock(r.createdAt, zone),
          r.ip ?? '—',
        ]),
        summary: {
          'Sign-ins': rows.length,
          'Distinct Users': new Set(rows.map((r) => r.userId)).size,
        },
      };
    },

    /**
     * Every SMS and email the hospital sent.
     *
     * Reads the `Notification` rows the messaging module already wrote — the
     * message was always stored, only the delivery outcome was not. Rows
     * predating that column show "—" rather than a zero that would read as
     * "nothing arrived".
     */
    'email-sms-log': async (branchId, date, zone) => {
      const rows = await this.prisma.notification.findMany({
        where: { branchId, deletedAt: null, type: { in: ['sms', 'email', 'credential'] }, date },
        orderBy: { date: 'desc' },
        take: 5000,
      });
      const names = await this.nameMap(rows.map((r) => r.createdById).filter((id): id is string => !!id));
      const known = rows.filter((r) => r.delivered != null);
      return {
        title: 'Email / SMS Log',
        columns: ['Channel', 'Subject', 'Audience', 'Recipients', 'Delivered', 'Failed', 'Sent By', 'Date', 'Time'],
        rows: rows.map((r) => [
          r.type.toUpperCase(),
          r.subject,
          r.audience ?? (r.roles.length ? r.roles.join(', ') : '—'),
          r.delivered != null ? (r.delivered ?? 0) + (r.failed ?? 0) : '—',
          r.delivered ?? '—',
          r.failed ?? '—',
          r.createdById ? names.get(r.createdById) ?? '—' : '—',
          this.day(r.date),
          this.clock(r.date, zone),
        ]),
        summary: {
          Messages: rows.length,
          Delivered: known.reduce((s, r) => s + (r.delivered ?? 0), 0),
          Failed: known.reduce((s, r) => s + (r.failed ?? 0), 0),
          'Outcome Not Recorded': rows.length - known.length,
        },
      };
    },

    // ── HR and patient credentials (RP4) ──────────────────────────────

    /**
     * Payroll rolled up per month rather than per payslip.
     *
     * The flat Payroll Report next to this one lists every payslip; this
     * answers "what did each month cost", which is the question with a
     * different shape, not a filter on the first.
     */
    'payroll-month': async (branchId) => {
      const rows = await this.prisma.payroll.findMany({ where: { branchId }, orderBy: { month: 'desc' } });
      const months = new Map<string, { gross: number; deductions: number; net: number; staff: Set<string>; paid: number }>();
      for (const r of rows) {
        const m = months.get(r.month) ?? { gross: 0, deductions: 0, net: 0, staff: new Set<string>(), paid: 0 };
        m.gross += this.money(r.gross);
        m.deductions += this.money(r.deductions);
        m.net += this.money(r.net);
        m.staff.add(r.staffUserId);
        if (r.status === 'paid') m.paid += 1;
        months.set(r.month, m);
      }
      const ordered = [...months.entries()].sort((a, b) => b[0].localeCompare(a[0]));
      return {
        title: 'Payroll Month Report',
        columns: ['Month', 'Staff', 'Payslips', 'Paid', 'Pending', 'Gross', 'Deductions', 'Net'],
        rows: ordered.map(([month, m]) => {
          const slips = rows.filter((r) => r.month === month).length;
          return [month, m.staff.size, slips, m.paid, slips - m.paid, m.gross, m.deductions, m.net];
        }),
        summary: {
          Months: ordered.length,
          Payslips: rows.length,
          'Total Net': rows.reduce((s, r) => s + this.money(r.net), 0),
        },
      };
    },

    /**
     * Attendance as a per-staff day grid.
     *
     * One row per person with a column per day in the range, which is the
     * shape a manager reads across. Capped at 31 days: beyond a month the
     * table stops being legible and the flat Staff Attendance Report is the
     * better tool, so the report says so rather than rendering 200 columns.
     */
    'staff-day-wise-attendance': async (branchId, date) => {
      const rows = await this.prisma.attendance.findMany({ where: { branchId, date }, orderBy: { date: 'asc' } });
      const names = await this.nameMap(rows.map((r) => r.staffUserId));
      const days = [...new Set(rows.map((r) => this.day(r.date)))].sort();

      if (days.length > 31) {
        return {
          title: 'Staff Day Wise Attendance Report',
          columns: ['Note'],
          rows: [[`This range covers ${days.length} days. Narrow it to a month or less, or use the Staff Attendance Report for a flat list.`]],
          summary: { Staff: 0, Days: days.length, Records: rows.length, 'Present Or Late': 0 },
        };
      }

      // status by staff, then by day
      const grid = new Map<string, Map<string, string>>();
      for (const r of rows) {
        const perStaff = grid.get(r.staffUserId) ?? new Map<string, string>();
        perStaff.set(this.day(r.date), r.status);
        grid.set(r.staffUserId, perStaff);
      }

      const short: Record<string, string> = {
        present: 'P', absent: 'A', late: 'L', half_day: 'H',
        half_day_second_shift: 'H2', holiday: 'O', leave: 'LV',
      };
      const staffIds = [...grid.keys()].sort((a, b) => (names.get(a) ?? '').localeCompare(names.get(b) ?? ''));
      const present = rows.filter((r) => r.status === 'present' || r.status === 'late').length;

      return {
        title: 'Staff Day Wise Attendance Report',
        columns: ['Staff', ...days.map((d) => d.slice(8)), 'Present', 'Absent'],
        rows: staffIds.map((id) => {
          const perStaff = grid.get(id)!;
          const cells = days.map((d) => {
            const s = perStaff.get(d);
            return s ? short[s] ?? s : '—';
          });
          return [
            names.get(id) ?? '—',
            ...cells,
            cells.filter((c) => c === 'P' || c === 'L').length,
            cells.filter((c) => c === 'A').length,
          ];
        }),
        summary: {
          Staff: staffIds.length,
          Days: days.length,
          Records: rows.length,
          'Present Or Late': present,
        },
      };
    },

    /**
     * Which patients have a portal login.
     *
     * Deliberately no password column and no reset token. The reference shows
     * credentials here; a report is a screen people export to a spreadsheet
     * and email, and a patient's password has no business in one. Whether an
     * account exists and when it was last used is the operational question
     * this actually answers.
     */
    'patient-credential': async (branchId, date) => {
      const rows = await this.prisma.user.findMany({
        where: { branchId, deletedAt: null, type: 'patient', createdAt: date },
        orderBy: { createdAt: 'desc' },
        select: { name: true, username: true, email: true, phone: true, isActive: true, lastLoginAt: true, createdAt: true },
      });
      return {
        title: 'Patient Login Credential',
        columns: ['Patient', 'Username', 'Email', 'Phone', 'Active', 'Last Login', 'Created'],
        rows: rows.map((r) => [
          r.name,
          r.username,
          r.email ?? '—',
          r.phone ?? '—',
          r.isActive ? 'Yes' : 'No',
          r.lastLoginAt ? this.day(r.lastLoginAt) : 'Never',
          this.day(r.createdAt),
        ]),
        summary: {
          Accounts: rows.length,
          Active: rows.filter((r) => r.isActive).length,
          'Never Signed In': rows.filter((r) => !r.lastLoginAt).length,
        },
      };
    },

    // ── Finance groups and referral (RP2) ─────────────────────────────

    'income-group': (branchId, date) => this.groupReport('income', branchId, date, 'Income Group Report'),
    'expense-group': (branchId, date) => this.groupReport('expense', branchId, date, 'Expense Group Report'),

    /**
     * Commission earned by whoever sent the patient.
     *
     * One row per payment rather than per person: the same doctor referring
     * five patients is five commissions with five bills behind them, and
     * collapsing them loses the audit trail this report exists to provide. The
     * per-person total is in the summary.
     */
    referral: async (branchId, date) => {
      const rows = await this.prisma.referralPayment.findMany({
        where: { branchId, deletedAt: null, createdAt: date },
        orderBy: { createdAt: 'desc' },
        include: { referralPerson: { select: { name: true, category: true, phone: true } } },
      });
      const commission = rows.reduce((s, r) => s + this.money(r.commissionAmount), 0);
      const billed = rows.reduce((s, r) => s + this.money(r.billAmount), 0);
      return {
        title: 'Referral Report',
        columns: ['Referred By', 'Category', 'Phone', 'Patient', 'Bill No', 'Bill Amount', 'Commission %', 'Commission', 'Date'],
        rows: rows.map((r) => [
          r.referralPerson?.name ?? '—',
          r.referralPerson?.category ?? '—',
          r.referralPerson?.phone ?? '—',
          r.patientName ?? '—',
          r.billNo ?? '—',
          this.money(r.billAmount),
          this.money(r.commissionPct),
          this.money(r.commissionAmount),
          this.day(r.createdAt),
        ]),
        summary: {
          Payments: rows.length,
          'People Paid': new Set(rows.map((r) => r.referralPersonId)).size,
          'Business Referred': billed,
          'Total Commission': commission,
        },
      };
    },

    // ── Inventory and pharmacy (RP3) ──────────────────────────────────

    /**
     * The item master with what is actually on the shelf.
     *
     * On-hand is stock received minus what has gone out and not come back —
     * the same arithmetic the Inventory screen shows, repeated here rather
     * than read from a column, because there is no such column. An issue that
     * was returned is not deducted.
     */
    'inventory-item': async (branchId, date) => {
      const items = await this.prisma.inventoryItem.findMany({
        where: { branchId, deletedAt: null, createdAt: date },
        orderBy: { name: 'asc' },
      });
      // No early return for the empty case: `in: []` is a valid Prisma filter
      // that matches nothing, and a second return path only invites the two to
      // disagree about which summary keys exist.
      const ids = items.map((i) => i.id);
      const [stocks, issues, categories, suppliers] = await Promise.all([
        this.prisma.itemStock.groupBy({ by: ['itemId'], where: { itemId: { in: ids }, deletedAt: null }, _sum: { qty: true } }),
        this.prisma.itemIssue.groupBy({ by: ['itemId'], where: { itemId: { in: ids }, deletedAt: null, status: 'issued' }, _sum: { qty: true } }),
        this.prisma.itemCategory.findMany({ where: { branchId }, select: { id: true, name: true } }),
        this.prisma.itemSupplier.findMany({ where: { branchId }, select: { id: true, name: true } }),
      ]);
      const received = new Map(stocks.map((s) => [s.itemId, s._sum.qty ?? 0]));
      const out = new Map(issues.map((s) => [s.itemId, s._sum.qty ?? 0]));
      const cat = new Map(categories.map((c) => [c.id, c.name]));
      const sup = new Map(suppliers.map((s) => [s.id, s.name]));

      const rows = items.map((i) => {
        const inQty = received.get(i.id) ?? 0;
        const outQty = out.get(i.id) ?? 0;
        const hand = inQty - outQty;
        return [
          i.name,
          i.categoryId ? cat.get(i.categoryId) ?? '—' : '—',
          i.supplierId ? sup.get(i.supplierId) ?? '—' : '—',
          i.unit ?? '—',
          inQty,
          outQty,
          hand,
          Number((hand * this.money(i.purchasePrice)).toFixed(2)),
        ];
      });
      return {
        title: 'Inventory Item Report',
        columns: ['Item', 'Category', 'Supplier', 'Unit', 'Received', 'Issued Out', 'On Hand', 'Value'],
        rows,
        summary: {
          Items: rows.length,
          'Units On Hand': rows.reduce((s, r) => s + (r[6] as number), 0),
          'Stock Value': Number(rows.reduce((s, r) => s + (r[7] as number), 0).toFixed(2)),
        },
      };
    },

    'inventory-issue': async (branchId, date) => {
      const rows = await this.prisma.itemIssue.findMany({
        where: { branchId, deletedAt: null, date },
        orderBy: { date: 'desc' },
        include: { item: { select: { name: true, unit: true } } },
      });
      const outstanding = rows.filter((r) => r.status !== 'returned');
      return {
        title: 'Inventory Issue Report',
        columns: ['Item', 'Unit', 'Issued To', 'Type', 'Qty', 'Issued', 'Due Back', 'Returned', 'Status'],
        rows: rows.map((r) => [
          r.item?.name ?? '—',
          r.item?.unit ?? '—',
          r.issuedTo ?? '—',
          r.userType ?? '—',
          r.qty,
          this.day(r.date),
          r.returnDate ? this.day(r.returnDate) : '—',
          r.returnedAt ? this.day(r.returnedAt) : '—',
          r.status,
        ]),
        summary: {
          Issues: rows.length,
          'Still Out': outstanding.length,
          'Units Still Out': outstanding.reduce((s, r) => s + r.qty, 0),
        },
      };
    },

    /**
     * Medicine stock on hand.
     *
     * Ranged on the medicine record rather than on movements, because the
     * question is what is in the cupboard now. Low-stock counting uses
     * `minLevel` where the master sets one — a medicine with no threshold
     * cannot be below it.
     */
    stock: async (branchId, date) => {
      const rows = await this.prisma.medicine.findMany({
        where: { branchId, deletedAt: null, createdAt: date },
        orderBy: { name: 'asc' },
        include: { category: { select: { name: true } }, unitRef: { select: { name: true } } },
      });
      const value = rows.reduce((s, r) => s + r.stock * this.money(r.purchasePrice), 0);
      const low = rows.filter((r) => r.minLevel != null && r.stock <= r.minLevel);
      return {
        title: 'Stock Report',
        columns: ['Medicine', 'Category', 'Company', 'Unit', 'Rack', 'Stock', 'Min Level', 'Purchase Price', 'Sale Price', 'Value', 'Expiry'],
        rows: rows.map((r) => [
          r.name,
          r.category?.name ?? '—',
          r.company ?? '—',
          r.unitRef?.name ?? r.unit ?? '—',
          r.rackNumber ?? '—',
          r.stock,
          r.minLevel ?? '—',
          this.money(r.purchasePrice),
          this.money(r.salePrice),
          Number((r.stock * this.money(r.purchasePrice)).toFixed(2)),
          r.expiry ? this.day(r.expiry) : '—',
        ]),
        summary: {
          Medicines: rows.length,
          'Units In Stock': rows.reduce((s, r) => s + r.stock, 0),
          'Stock Value': Number(value.toFixed(2)),
          'At Or Below Min Level': low.length,
        },
      };
    },

    'medicine-purchase': async (branchId, date) => {
      const rows = await this.prisma.medicinePurchase.findMany({
        where: { branchId, deletedAt: null, purchaseDate: date },
        orderBy: { purchaseDate: 'desc' },
        include: { supplier: { select: { name: true } }, items: { select: { quantity: true } } },
      });
      const net = rows.reduce((s, r) => s + this.money(r.netAmount), 0);
      const paid = rows.reduce((s, r) => s + this.money(r.paymentAmount), 0);
      return {
        title: 'Medicine Purchase Report',
        columns: ['Purchase No', 'Bill No', 'Supplier', 'Date', 'Items', 'Units', 'Subtotal', 'Discount', 'Tax', 'Net', 'Paid', 'Due'],
        rows: rows.map((r) => [
          r.purchaseNo,
          r.billNo ?? '—',
          r.supplier?.name ?? '—',
          this.day(r.purchaseDate),
          r.items.length,
          r.items.reduce((s, i) => s + i.quantity, 0),
          this.money(r.subtotal),
          this.money(r.discount),
          this.money(r.tax),
          this.money(r.netAmount),
          this.money(r.paymentAmount),
          Number((this.money(r.netAmount) - this.money(r.paymentAmount)).toFixed(2)),
        ]),
        summary: {
          Purchases: rows.length,
          'Total Net': net,
          'Total Paid': paid,
          'Outstanding To Suppliers': Number((net - paid).toFixed(2)),
        },
      };
    },

    // ── Balances (RP1) ────────────────────────────────────────────────
    //
    // What is still owed, per module and in total. These are the reports
    // somebody runs before chasing money, so they list the unpaid rather than
    // the billed: an invoice settled in full is not a line on a balance report.

    'opd-balance': (branchId, date) => this.balanceReport(branchId, date, 'opd', 'OPD Balance Report'),
    'ipd-balance': (branchId, date) => this.balanceReport(branchId, date, 'ipd', 'IPD Balance Report'),
    'pathology-balance': (branchId, date) => this.balanceReport(branchId, date, 'pathology', 'Pathology Balance Report'),
    'radiology-balance': (branchId, date) => this.balanceReport(branchId, date, 'radiology', 'Radiology Balance Report'),
    'balance-amount': (branchId, date) => this.balanceReport(branchId, date, undefined, 'Balance Amount Report'),

    /**
     * Transactions still in flight.
     *
     * The reference calls this "Processing"; our nearest true equivalent is an
     * invoice that has taken money but not all of it — `status = partial`.
     * Deliberately not "anything unpaid": a bill nobody has paid a rupee
     * against is not being processed, it is outstanding, and that is the
     * Balance Amount report above.
     */
    'processing-transaction': async (branchId, date) => {
      const rows = await this.prisma.invoice.findMany({
        where: { branchId, deletedAt: null, createdAt: date, status: 'partial' },
        orderBy: { createdAt: 'desc' },
        include: { patient: { select: { name: true } } },
      });
      const net = rows.reduce((s, r) => s + this.money(r.netAmount), 0);
      const paid = rows.reduce((s, r) => s + this.money(r.paid), 0);
      return {
        title: 'Processing Transaction Report',
        columns: ['Bill No', 'Module', 'Patient', 'Date', 'Net', 'Paid', 'Balance'],
        rows: rows.map((r) => [r.billNo, r.module.toUpperCase(), r.patient.name, this.day(r.createdAt), this.money(r.netAmount), this.money(r.paid), this.money(r.balance)]),
        summary: { 'Total Net': net, 'Collected So Far': paid, 'Still Due': net - paid, Transactions: rows.length },
      };
    },

    /**
     * Discharges in the period.
     *
     * Ranged on `dischargeDate`, not `admissionDate` — the question this report
     * answers is who left, and a patient admitted in March and discharged in
     * August belongs in August's.
     */
    'discharge-patient': async (branchId, date) => {
      const rows = await this.prisma.ipdAdmission.findMany({
        where: { branchId, deletedAt: null, status: 'discharged', dischargeDate: date },
        orderBy: { dischargeDate: 'desc' },
        include: {
          patient: { select: { patientNo: true, name: true } },
          consultant: { select: { name: true } },
          bed: { select: { bedNo: true } },
        },
      });
      const stay = (r: { admissionDate: Date; dischargeDate: Date | null }) =>
        r.dischargeDate
          ? Math.max(1, Math.round((r.dischargeDate.getTime() - r.admissionDate.getTime()) / 86_400_000))
          : 0;
      const deaths = rows.filter((r) => r.dischargeStatus === 'death').length;
      return {
        title: 'Discharge Patient Report',
        columns: ['Patient No', 'Patient', 'Bed', 'Consultant', 'Admitted', 'Discharged', 'Days', 'Status'],
        rows: rows.map((r) => [
          r.patient.patientNo,
          r.patient.name,
          r.bed?.bedNo ?? '—',
          r.consultant?.name ?? '—',
          this.day(r.admissionDate),
          r.dischargeDate ? this.day(r.dischargeDate) : '—',
          stay(r),
          r.dischargeStatus ?? 'normal',
        ]),
        summary: {
          Discharges: rows.length,
          Deaths: deaths,
          'Average Stay (days)': rows.length
            ? Number((rows.reduce((s, r) => s + stay(r), 0) / rows.length).toFixed(1))
            : 0,
        },
      };
    },
  };

  /**
   * Income or expense rolled up by head.
   *
   * Rows with no head are kept under "Unassigned" rather than dropped: an
   * entry nobody categorised still spent or earned money, and a total that
   * silently omits it disagrees with the flat Income/Expense report next to it
   * in the same menu.
   */
  private async groupReport(
    kind: 'income' | 'expense',
    branchId: string,
    date: Prisma.DateTimeFilter,
    title: string,
  ): Promise<Omit<ReportResult, 'key'>> {
    const rows =
      kind === 'income'
        ? await this.prisma.income.findMany({ where: { branchId, deletedAt: null, date }, include: { head: true } })
        : await this.prisma.expense.findMany({ where: { branchId, deletedAt: null, date }, include: { head: true } });

    const groups = new Map<string, { total: number; count: number }>();
    for (const r of rows) {
      const key = r.head?.name ?? 'Unassigned';
      const g = groups.get(key) ?? { total: 0, count: 0 };
      g.total += this.money(r.amount);
      g.count += 1;
      groups.set(key, g);
    }

    const total = [...groups.values()].reduce((s, g) => s + g.total, 0);
    const ordered = [...groups.entries()].sort((a, b) => b[1].total - a[1].total);
    return {
      title,
      columns: ['Head', 'Entries', 'Amount', 'Share %'],
      rows: ordered.map(([head, g]) => [
        head,
        g.count,
        g.total,
        total ? Number(((g.total / total) * 100).toFixed(1)) : 0,
      ]),
      summary: { Total: total, Heads: ordered.length, Entries: rows.length },
    };
  }

  /**
   * Money still owed, optionally narrowed to one module.
   *
   * `balance > 0` rather than `status != 'paid'`: status is a label and balance
   * is the number people act on, and a refund can leave the two disagreeing.
   */
  private async balanceReport(
    branchId: string,
    date: Prisma.DateTimeFilter,
    module: string | undefined,
    title: string,
  ): Promise<Omit<ReportResult, 'key'>> {
    const rows = await this.prisma.invoice.findMany({
      where: { branchId, deletedAt: null, createdAt: date, balance: { gt: 0 }, ...(module ? { module } : {}) },
      orderBy: { balance: 'desc' },
      include: { patient: { select: { patientNo: true, name: true, phone: true } } },
    });
    const due = rows.reduce((s, r) => s + this.money(r.balance), 0);
    const net = rows.reduce((s, r) => s + this.money(r.netAmount), 0);
    return {
      title,
      // Module column only earns its place when the report spans modules.
      columns: module
        ? ['Bill No', 'Patient No', 'Patient', 'Phone', 'Date', 'Net', 'Paid', 'Balance']
        : ['Bill No', 'Module', 'Patient No', 'Patient', 'Phone', 'Date', 'Net', 'Paid', 'Balance'],
      rows: rows.map((r) => {
        const tail = [
          r.patient.patientNo,
          r.patient.name,
          r.patient.phone ?? '—',
          this.day(r.createdAt),
          this.money(r.netAmount),
          this.money(r.paid),
          this.money(r.balance),
        ];
        return module ? [r.billNo, ...tail] : [r.billNo, r.module.toUpperCase(), ...tail];
      }),
      summary: { 'Total Billed': net, 'Total Outstanding': due, 'Unpaid Bills': rows.length },
    };
  }

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
