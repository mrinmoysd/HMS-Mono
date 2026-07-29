import type { ModuleKey } from '../rbac/modules';
import type { ActionKey } from '../rbac/roles';

/**
 * Dashboard widget contract.
 *
 * The dashboard is role-scoped, and this map is the single place that decides
 * what each role sees. Both sides import it:
 *
 *   · the API uses it to decide which aggregations to *run* — unpermitted data
 *     is never computed, never serialised, never sent
 *   · the web app uses it to decide what to *render*
 *
 * Keeping one map rather than two lists is the point. If the client filtered on
 * its own, the server would still have put revenue figures on the wire for a
 * doctor to read out of the network tab — hiding a widget in the DOM is not
 * access control. And two independent lists drift the first time a widget moves.
 */

export const DASHBOARD_WIDGETS = {
  // ── KPI row ───────────────────────────────────────────────────────────────
  revenueKpi: { module: 'billing', action: 'view' },
  bedOccupancyKpi: { module: 'ipd', action: 'view' },
  appointmentsKpi: { module: 'appointment', action: 'view' },
  outstandingKpi: { module: 'billing', action: 'view' },

  // ── detail cards ──────────────────────────────────────────────────────────
  todayAppointments: { module: 'appointment', action: 'view' },
  bedOccupancy: { module: 'ipd', action: 'view' },
  medicineStock: { module: 'pharmacy', action: 'view' },
  bloodBank: { module: 'blood_bank', action: 'view' },

  // ── charts ────────────────────────────────────────────────────────────────
  incomeExpense: { module: 'finance', action: 'view' },
  incomeByModule: { module: 'finance', action: 'view' },

  // ── tables ────────────────────────────────────────────────────────────────
  // Audit data exposes who touched what across every module, so it needs an
  // administrator gate. Deliberately `setup:edit`, not `setup:view`: every
  // seeded role — nurse and pharmacist included — holds `setup:view`, so
  // gating on it would show the audit trail to the whole hospital.
  // `setup:edit` is held only by super_admin and admin.
  recentActivity: { module: 'setup', action: 'edit' },
  staffAttendance: { module: 'human_resource', action: 'view' },

  // Notices are broadcast to all staff by design — no gate.
  notices: null,
} as const satisfies Record<string, { module: ModuleKey; action: ActionKey } | null>;

export type DashboardWidgetKey = keyof typeof DASHBOARD_WIDGETS;

export const DASHBOARD_WIDGET_KEYS = Object.keys(DASHBOARD_WIDGETS) as DashboardWidgetKey[];

/** Widgets a given permission set may see. Used identically on both sides. */
export function permittedDashboardWidgets(
  has: (module: ModuleKey, action: ActionKey) => boolean,
): DashboardWidgetKey[] {
  return DASHBOARD_WIDGET_KEYS.filter((key) => {
    const req = DASHBOARD_WIDGETS[key];
    return req === null || has(req.module, req.action);
  });
}

// ── widget payloads ─────────────────────────────────────────────────────────

/** One point of a sparkline / trend series. */
export interface TrendPoint {
  /** ISO date (day or month granularity, per widget). */
  date: string;
  value: number;
}

export interface RevenueKpiDto {
  /** Month-to-date collected. */
  total: number;
  /** Percent change vs the same span last month; null when there is no baseline. */
  changePct: number | null;
  trend: TrendPoint[];
}

export interface BedOccupancyKpiDto {
  occupied: number;
  total: number;
  /** 0–100, already rounded. */
  percent: number;
  trend: TrendPoint[];
}

export interface AppointmentsKpiDto {
  today: number;
  confirmed: number;
  pending: number;
  trend: TrendPoint[];
}

export interface OutstandingKpiDto {
  /** Sum of unpaid balances. */
  amount: number;
  unpaid: number;
  /**
   * Invoice has no dueDate column, so "overdue" is derived: unpaid and billed
   * more than `overdueAfterDays` ago. Surfaced so the UI can label it honestly
   * and so the rule is visible rather than buried in a query.
   */
  overdue: number;
  overdueAfterDays: number;
  trend: TrendPoint[];
}

export interface TodayAppointmentRow {
  id: string;
  patientName: string;
  doctorName: string | null;
  slot: string | null;
  status: string;
}

export interface BedOccupancyDto {
  total: number;
  allotted: number;
  available: number;
  /**
   * Bed.status is only available|allotted, so there is no third state to count.
   * Kept in the contract for parity with the target design and reported as 0
   * until "unused" is actually defined.
   */
  unused: number;
  percent: number;
}

export interface MedicineStockDto {
  belowReorder: number;
  critical: number;
  /** A few names for the inline warning line. */
  runningLow: string[];
  expiringSoon: number;
  expiringWithinDays: number;
}

export interface BloodGroupStock {
  group: string;
  units: number;
  /** Drives the tinting: ok | low | critical. */
  level: 'ok' | 'low' | 'critical';
}

export interface BloodBankDto {
  groups: BloodGroupStock[];
  issuedToday: number;
  issuedThisWeek: number;
}

export interface IncomeExpenseDto {
  /** 12 months, oldest first. */
  income: TrendPoint[];
  expense: TrendPoint[];
  incomeYtd: number;
  expenseYtd: number;
  netYtd: number;
}

export interface ModuleIncomeRow {
  module: string;
  income: number;
  /** 0–100 share of the period total. */
  share: number;
  lastMonth: number;
}

export interface IncomeByModuleDto {
  period: string;
  total: number;
  rows: ModuleIncomeRow[];
}

export interface ActivityRow {
  id: string;
  userName: string | null;
  action: string;
  detail: string | null;
  module: string;
  amount: number | null;
  at: string;
}

export interface StaffAttendanceRow {
  role: string;
  total: number;
  present: number;
  /** 0–100. */
  percent: number;
}

export interface StaffAttendanceDto {
  date: string;
  present: number;
  total: number;
  percent: number;
  rows: StaffAttendanceRow[];
}

export interface NoticeRow {
  id: string;
  title: string;
  noticeDate: string | null;
}

/**
 * Every slice is optional. Present means permitted *and* computed; absent means
 * the role may not see it. `widgets` states which keys are present so the UI
 * never has to infer intent from a missing field — an empty widget and a
 * forbidden one look different.
 */
export interface DashboardOverviewDto {
  generatedAt: string;
  widgets: DashboardWidgetKey[];

  revenueKpi?: RevenueKpiDto;
  bedOccupancyKpi?: BedOccupancyKpiDto;
  appointmentsKpi?: AppointmentsKpiDto;
  outstandingKpi?: OutstandingKpiDto;

  todayAppointments?: TodayAppointmentRow[];
  bedOccupancy?: BedOccupancyDto;
  medicineStock?: MedicineStockDto;
  bloodBank?: BloodBankDto;

  incomeExpense?: IncomeExpenseDto;
  incomeByModule?: IncomeByModuleDto;

  recentActivity?: ActivityRow[];
  staffAttendance?: StaffAttendanceDto;
  notices?: NoticeRow[];
}
