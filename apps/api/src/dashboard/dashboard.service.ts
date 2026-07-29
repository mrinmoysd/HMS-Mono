import { Injectable } from '@nestjs/common';
import {
  Ability,
  BLOOD_GROUPS,
  permittedDashboardWidgets,
  type DashboardOverviewDto,
  type DashboardWidgetKey,
  type PermissionKey,
  type TrendPoint,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';

/** Unpaid invoices older than this count as overdue — see DashboardOverviewDto. */
const OVERDUE_AFTER_DAYS = 30;
const EXPIRING_WITHIN_DAYS = 30;
const SPARK_DAYS = 14;
const BLOOD_LOW = 5;
const BLOOD_CRITICAL = 2;

const dec = (v: unknown): number => (v == null ? 0 : Number(v));

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
/**
 * Local-time YYYY-MM-DD.
 *
 * Deliberately not `toISOString().slice(0,10)`: that converts back to UTC, so
 * in any timezone ahead of it local midnight becomes the *previous* day. In
 * IST (UTC+5:30) the 1st of July rendered as "2026-06-30", which both mislabels
 * the period and drops rows into the wrong day/month bucket.
 */
function iso(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Bucket dated rows into a dense day series so the sparkline has no gaps. */
function daySeries(
  rows: { at: Date; value: number }[],
  from: Date,
  days: number,
): TrendPoint[] {
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) buckets.set(iso(addDays(from, i)), 0);
  for (const r of rows) {
    const k = iso(r.at);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + r.value);
  }
  return [...buckets.entries()].map(([date, value]) => ({ date, value }));
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Role-scoped dashboard payload.
   *
   * Only the permitted widgets are computed — unpermitted data never reaches a
   * query, let alone the wire. That is the access boundary; it also keeps the
   * work proportional to the role (a pharmacist runs two queries, not thirteen),
   * which matters on the 1 GB production box.
   */
  async overview(branchId: string, permissions: PermissionKey[]): Promise<DashboardOverviewDto> {
    const ability = new Ability(permissions);
    const widgets = permittedDashboardWidgets((m, a) => ability.can(m, a));
    const want = (k: DashboardWidgetKey): boolean => widgets.includes(k);

    const now = new Date();
    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);
    const monthStart = startOfMonth(now);
    const sparkFrom = addDays(today, -(SPARK_DAYS - 1));

    const out: DashboardOverviewDto = { generatedAt: now.toISOString(), widgets };

    // Every branch below is independent, so they run together rather than in
    // sequence. Only the permitted ones are enqueued at all.
    const jobs: Promise<void>[] = [];

    if (want('revenueKpi')) jobs.push(this.revenueKpi(out, branchId, monthStart, sparkFrom, now));
    if (want('bedOccupancyKpi') || want('bedOccupancy')) {
      jobs.push(this.beds(out, branchId, want('bedOccupancyKpi'), want('bedOccupancy'), sparkFrom));
    }
    if (want('appointmentsKpi') || want('todayAppointments')) {
      jobs.push(
        this.appointments(
          out,
          branchId,
          today,
          tomorrow,
          sparkFrom,
          want('appointmentsKpi'),
          want('todayAppointments'),
        ),
      );
    }
    if (want('outstandingKpi')) jobs.push(this.outstanding(out, branchId, sparkFrom));
    if (want('medicineStock')) jobs.push(this.medicineStock(out, branchId));
    if (want('bloodBank')) jobs.push(this.bloodBank(out, branchId, today));
    if (want('incomeExpense')) jobs.push(this.incomeExpense(out, branchId, now));
    if (want('incomeByModule')) jobs.push(this.incomeByModule(out, branchId, now));
    if (want('recentActivity')) jobs.push(this.recentActivity(out, branchId));
    if (want('staffAttendance')) jobs.push(this.staffAttendance(out, branchId, today));
    if (want('notices')) jobs.push(this.notices(out, branchId));

    await Promise.all(jobs);
    return out;
  }

  // ── revenue ───────────────────────────────────────────────────────────────
  private async revenueKpi(
    out: DashboardOverviewDto,
    branchId: string,
    monthStart: Date,
    sparkFrom: Date,
    now: Date,
  ): Promise<void> {
    const prevStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
    // Same span of the previous month, so early in a month the comparison is
    // like-for-like instead of against a full month.
    const prevEnd = new Date(prevStart);
    prevEnd.setDate(Math.min(now.getDate(), 28));

    const [mtd, prev, spark] = await Promise.all([
      this.prisma.payment.findMany({
        where: { invoice: { branchId, deletedAt: null }, paidAt: { gte: monthStart } },
        select: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: {
          invoice: { branchId, deletedAt: null },
          paidAt: { gte: prevStart, lt: prevEnd },
        },
        select: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: { invoice: { branchId, deletedAt: null }, paidAt: { gte: sparkFrom } },
        select: { amount: true, paidAt: true },
      }),
    ]);

    const total = mtd.reduce((s, p) => s + dec(p.amount), 0);
    const prevTotal = prev.reduce((s, p) => s + dec(p.amount), 0);

    out.revenueKpi = {
      total,
      changePct: prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 1000) / 10 : null,
      trend: daySeries(
        spark.map((p) => ({ at: p.paidAt, value: dec(p.amount) })),
        sparkFrom,
        SPARK_DAYS,
      ),
    };
  }

  // ── beds ──────────────────────────────────────────────────────────────────
  private async beds(
    out: DashboardOverviewDto,
    branchId: string,
    wantKpi: boolean,
    wantCard: boolean,
    sparkFrom: Date,
  ): Promise<void> {
    const [total, allotted, admissions] = await Promise.all([
      this.prisma.bed.count({ where: { branchId, deletedAt: null } }),
      this.prisma.bed.count({ where: { branchId, deletedAt: null, status: 'allotted' } }),
      wantKpi
        ? this.prisma.ipdAdmission.findMany({
            where: { branchId, deletedAt: null, admissionDate: { gte: sparkFrom } },
            select: { admissionDate: true },
          })
        : Promise.resolve([]),
    ]);

    const percent = total > 0 ? Math.round((allotted / total) * 100) : 0;

    if (wantKpi) {
      out.bedOccupancyKpi = {
        occupied: allotted,
        total,
        percent,
        trend: daySeries(
          admissions.map((a) => ({ at: a.admissionDate, value: 1 })),
          sparkFrom,
          SPARK_DAYS,
        ),
      };
    }
    if (wantCard) {
      out.bedOccupancy = {
        total,
        allotted,
        available: total - allotted,
        // Bed.status has no third state — reported as 0 until "unused" is defined.
        unused: 0,
        percent,
      };
    }
  }

  // ── appointments ──────────────────────────────────────────────────────────
  private async appointments(
    out: DashboardOverviewDto,
    branchId: string,
    today: Date,
    tomorrow: Date,
    sparkFrom: Date,
    wantKpi: boolean,
    wantList: boolean,
  ): Promise<void> {
    const [todays, spark] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { branchId, deletedAt: null, apptDate: { gte: today, lt: tomorrow } },
        select: {
          id: true,
          status: true,
          slot: true,
          patient: { select: { name: true } },
          doctor: { select: { name: true } },
        },
        orderBy: { slot: 'asc' },
        take: 50,
      }),
      wantKpi
        ? this.prisma.appointment.findMany({
            where: { branchId, deletedAt: null, apptDate: { gte: sparkFrom } },
            select: { apptDate: true },
          })
        : Promise.resolve([]),
    ]);

    if (wantKpi) {
      out.appointmentsKpi = {
        today: todays.length,
        // The DTO calls this "confirmed" to match the dashboard's wording, but
        // the domain status is `approved` — APPOINTMENT_STATUSES is
        // pending|approved|cancelled|completed, with no "confirmed" member.
        confirmed: todays.filter((a) => a.status === 'approved').length,
        pending: todays.filter((a) => a.status === 'pending').length,
        trend: daySeries(
          spark.map((a) => ({ at: a.apptDate, value: 1 })),
          sparkFrom,
          SPARK_DAYS,
        ),
      };
    }
    if (wantList) {
      out.todayAppointments = todays.slice(0, 8).map((a) => ({
        id: a.id,
        patientName: a.patient?.name ?? '—',
        doctorName: a.doctor?.name ?? null,
        slot: a.slot,
        status: a.status,
      }));
    }
  }

  // ── outstanding ───────────────────────────────────────────────────────────
  private async outstanding(
    out: DashboardOverviewDto,
    branchId: string,
    sparkFrom: Date,
  ): Promise<void> {
    const overdueBefore = addDays(new Date(), -OVERDUE_AFTER_DAYS);

    const [open, spark] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { branchId, deletedAt: null, status: { in: ['unpaid', 'partial'] } },
        select: { balance: true, billDate: true },
      }),
      this.prisma.invoice.findMany({
        where: { branchId, deletedAt: null, billDate: { gte: sparkFrom } },
        select: { balance: true, billDate: true },
      }),
    ]);

    out.outstandingKpi = {
      amount: open.reduce((s, i) => s + dec(i.balance), 0),
      unpaid: open.length,
      overdue: open.filter((i) => i.billDate < overdueBefore).length,
      overdueAfterDays: OVERDUE_AFTER_DAYS,
      trend: daySeries(
        spark.map((i) => ({ at: i.billDate, value: dec(i.balance) })),
        sparkFrom,
        SPARK_DAYS,
      ),
    };
  }

  // ── medicine stock ────────────────────────────────────────────────────────
  private async medicineStock(out: DashboardOverviewDto, branchId: string): Promise<void> {
    const expiryCutoff = addDays(new Date(), EXPIRING_WITHIN_DAYS);

    const [meds, expiring] = await Promise.all([
      this.prisma.medicine.findMany({
        where: { branchId, deletedAt: null },
        select: { name: true, stock: true, reorderLevel: true, minLevel: true },
      }),
      this.prisma.medicine.count({
        where: {
          branchId,
          deletedAt: null,
          expiry: { not: null, lte: expiryCutoff, gte: new Date() },
        },
      }),
    ]);

    const below = meds.filter((m) => {
      const threshold = m.reorderLevel ?? m.minLevel;
      return threshold != null && m.stock <= threshold;
    });
    const critical = below.filter((m) => m.minLevel != null && m.stock <= m.minLevel);

    out.medicineStock = {
      belowReorder: below.length,
      critical: critical.length,
      runningLow: below.slice(0, 3).map((m) => m.name),
      expiringSoon: expiring,
      expiringWithinDays: EXPIRING_WITHIN_DAYS,
    };
  }

  // ── blood bank ────────────────────────────────────────────────────────────
  private async bloodBank(
    out: DashboardOverviewDto,
    branchId: string,
    today: Date,
  ): Promise<void> {
    const weekStart = addDays(today, -6);

    const [products, issuedToday, issuedWeek] = await Promise.all([
      // Blood group lives on BloodProduct, not BloodStock, so the units have to
      // come through the relation and be summed per group.
      this.prisma.bloodProduct.findMany({
        where: { branchId, deletedAt: null },
        select: { bloodGroup: true, stock: { select: { units: true } } },
      }),
      this.prisma.bloodIssue.count({ where: { branchId, issuedAt: { gte: today } } }),
      this.prisma.bloodIssue.count({ where: { branchId, issuedAt: { gte: weekStart } } }),
    ]);

    const byGroup = new Map<string, number>();
    for (const p of products) {
      if (!p.bloodGroup) continue;
      byGroup.set(p.bloodGroup, (byGroup.get(p.bloodGroup) ?? 0) + (p.stock?.units ?? 0));
    }

    out.bloodBank = {
      // Report all eight groups, not just the stocked ones. A group missing
      // from the grid reads as "fine"; a group showing 0 units in red is the
      // thing staff actually need to see. Padding happens here rather than in
      // the UI so the low/critical thresholds stay in one place.
      groups: BLOOD_GROUPS.map((group) => {
        const units = byGroup.get(group) ?? 0;
        return {
          group,
          units,
          level: (units <= BLOOD_CRITICAL ? 'critical' : units <= BLOOD_LOW ? 'low' : 'ok') as
            | 'ok'
            | 'low'
            | 'critical',
        };
      }),
      issuedToday,
      issuedThisWeek: issuedWeek,
    };
  }

  // ── income vs expense, 12 months ──────────────────────────────────────────
  private async incomeExpense(
    out: DashboardOverviewDto,
    branchId: string,
    now: Date,
  ): Promise<void> {
    const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [income, expense] = await Promise.all([
      this.prisma.income.findMany({
        where: { branchId, deletedAt: null, date: { gte: from } },
        select: { amount: true, date: true },
      }),
      this.prisma.expense.findMany({
        where: { branchId, deletedAt: null, date: { gte: from } },
        select: { amount: true, date: true },
      }),
    ]);

    const monthKeys: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
      monthKeys.push(iso(d).slice(0, 7));
    }
    const bucket = (rows: { amount: unknown; date: Date }[]): TrendPoint[] => {
      const m = new Map(monthKeys.map((k) => [k, 0]));
      for (const r of rows) {
        const k = iso(r.date).slice(0, 7);
        if (m.has(k)) m.set(k, (m.get(k) ?? 0) + dec(r.amount));
      }
      return [...m.entries()].map(([date, value]) => ({ date, value }));
    };

    const ytd = (rows: { amount: unknown; date: Date }[]): number =>
      rows.filter((r) => r.date >= yearStart).reduce((s, r) => s + dec(r.amount), 0);

    const incomeYtd = ytd(income);
    const expenseYtd = ytd(expense);

    out.incomeExpense = {
      income: bucket(income),
      expense: bucket(expense),
      incomeYtd,
      expenseYtd,
      netYtd: incomeYtd - expenseYtd,
    };
  }

  // ── income by module ──────────────────────────────────────────────────────
  private async incomeByModule(
    out: DashboardOverviewDto,
    branchId: string,
    now: Date,
  ): Promise<void> {
    const monthStart = startOfMonth(now);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [current, previous] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['module'],
        where: { branchId, deletedAt: null, billDate: { gte: monthStart } },
        _sum: { netAmount: true },
      }),
      this.prisma.invoice.groupBy({
        by: ['module'],
        where: { branchId, deletedAt: null, billDate: { gte: prevStart, lt: monthStart } },
        _sum: { netAmount: true },
      }),
    ]);

    const prevByModule = new Map(previous.map((r) => [r.module, dec(r._sum.netAmount)]));
    const total = current.reduce((s, r) => s + dec(r._sum.netAmount), 0);

    out.incomeByModule = {
      period: iso(monthStart).slice(0, 7),
      total,
      rows: current
        .map((r) => {
          const income = dec(r._sum.netAmount);
          return {
            module: r.module,
            income,
            share: total > 0 ? Math.round((income / total) * 1000) / 10 : 0,
            lastMonth: prevByModule.get(r.module) ?? 0,
          };
        })
        .sort((a, b) => b.income - a.income),
    };
  }

  // ── recent activity ───────────────────────────────────────────────────────
  private async recentActivity(out: DashboardOverviewDto, branchId: string): Promise<void> {
    const rows = await this.prisma.auditLog.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });

    out.recentActivity = rows.map((r) => ({
      id: r.id,
      userName: r.user?.name ?? null,
      action: r.action,
      detail: r.entityId ? `#${r.entityId.slice(0, 8).toUpperCase()}` : null,
      module: r.entity,
      amount: null,
      at: r.createdAt.toISOString(),
    }));
  }

  // ── staff attendance ──────────────────────────────────────────────────────
  private async staffAttendance(
    out: DashboardOverviewDto,
    branchId: string,
    today: Date,
  ): Promise<void> {
    const [staff, present] = await Promise.all([
      this.prisma.staff.findMany({
        where: { branchId, deletedAt: null },
        select: { userId: true, user: { select: { role: { select: { label: true } } } } },
      }),
      this.prisma.attendance.findMany({
        where: { branchId, date: today, status: { in: ['present', 'late', 'half_day'] } },
        select: { staffUserId: true },
      }),
    ]);

    const presentIds = new Set(present.map((a) => a.staffUserId));
    const byRole = new Map<string, { total: number; present: number }>();
    for (const s of staff) {
      const role = s.user?.role?.label ?? 'Unassigned';
      const cur = byRole.get(role) ?? { total: 0, present: 0 };
      cur.total += 1;
      if (presentIds.has(s.userId)) cur.present += 1;
      byRole.set(role, cur);
    }

    const totalStaff = staff.length;
    const totalPresent = staff.filter((s) => presentIds.has(s.userId)).length;

    out.staffAttendance = {
      date: iso(today),
      present: totalPresent,
      total: totalStaff,
      percent: totalStaff > 0 ? Math.round((totalPresent / totalStaff) * 100) : 0,
      rows: [...byRole.entries()]
        .map(([role, v]) => ({
          role,
          total: v.total,
          present: v.present,
          percent: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total || a.role.localeCompare(b.role)),
    };
  }

  // ── notices ───────────────────────────────────────────────────────────────
  private async notices(out: DashboardOverviewDto, branchId: string): Promise<void> {
    const rows = await this.prisma.notification.findMany({
      where: { branchId, type: 'notice' },
      orderBy: { date: 'desc' },
      take: 5,
      select: { id: true, subject: true, noticeDate: true },
    });

    out.notices = rows.map((r) => ({
      id: r.id,
      title: r.subject,
      noticeDate: r.noticeDate ? r.noticeDate.toISOString() : null,
    }));
  }
}
