'use client';

import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { MODULE_META, MODULES } from '@smart-hospital/shared';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonText } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuthStore, useAbility } from '@/lib/auth-store';
import { useDashboardOverview } from '@/lib/hooks/use-dashboard';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { DetailCards } from '@/components/dashboard/detail-cards';
import { IncomeExpenseChart } from '@/components/dashboard/income-expense-chart';
import { IncomeDonut } from '@/components/dashboard/income-donut';
import { NoticesBanner } from '@/components/dashboard/notices-banner';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { StaffAttendance } from '@/components/dashboard/staff-attendance';
import { ModuleRevenueTable } from '@/components/dashboard/module-revenue-table';
import { hasWidget } from '@/lib/hooks/use-dashboard';
import { moduleHref } from '@/components/app-shell/nav-config';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const ability = useAbility();
  const { data, isLoading, error } = useDashboardOverview();

  const accessible = MODULES.filter((m) => ability.canAccess(m) && m !== 'dashboard');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          <>
            Welcome back, {user?.name} · signed in as{' '}
            <span className="font-medium">{user?.roleLabel}</span>
          </>
        }
      />

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-md border border-border bg-surface p-4">
              <SkeletonText lines={3} />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
          Could not load the dashboard: {(error as Error).message}
        </p>
      )}

      {/* Notices are ungated by design, so they sit above the KPI row where
          every role sees them — including one with no other widget at all. */}
      {data && hasWidget(data, 'notices') && data.notices && (
        <NoticesBanner notices={data.notices} />
      )}

      {data && <KpiCards data={data} />}
      {data && <DetailCards data={data} />}

      {/* Both charts are gated on finance:view, so in practice they appear
          together — but each is checked on its own so neither can leak if the
          contract changes. The line chart carries 12 points and needs the
          width; the donut is happy in a third. */}
      {data && (hasWidget(data, 'incomeExpense') || hasWidget(data, 'incomeByModule')) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {hasWidget(data, 'incomeExpense') && data.incomeExpense && (
            <div className="lg:col-span-2">
              <IncomeExpenseChart data={data.incomeExpense} />
            </div>
          )}
          {hasWidget(data, 'incomeByModule') && data.incomeByModule && (
            <div className={data.incomeExpense ? '' : 'lg:col-span-3'}>
              <IncomeDonut data={data.incomeByModule} />
            </div>
          )}
        </div>
      )}

      {/* Audit trail and attendance. Different gates (setup:edit vs
          human_resource:view), so a role can hold either alone — each takes the
          full width when it is the only one. */}
      {data && (hasWidget(data, 'recentActivity') || hasWidget(data, 'staffAttendance')) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {hasWidget(data, 'recentActivity') && data.recentActivity && (
            <div className={data.staffAttendance ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <RecentActivity rows={data.recentActivity} />
            </div>
          )}
          {hasWidget(data, 'staffAttendance') && data.staffAttendance && (
            <div className={data.recentActivity ? '' : 'lg:col-span-3'}>
              <StaffAttendance data={data.staffAttendance} />
            </div>
          )}
        </div>
      )}

      {/* Month-on-month movement per module. The donut above shows composition;
          this shows direction. */}
      {data && hasWidget(data, 'incomeByModule') && data.incomeByModule && (
        <ModuleRevenueTable data={data.incomeByModule} />
      )}

      {/* A role with only a couple of widgets would otherwise land on a
          near-empty screen, so point it at the modules it can actually reach. */}
      {data && data.widgets.length <= 4 && accessible.length > 0 && (
        <div className="rounded-md border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Jump to</h2>
          <p className="mb-3 text-sm text-fg-muted">
            {accessible.length} modules available to your role.
          </p>
          <div className="flex flex-wrap gap-2">
            {accessible.map((m) => (
              <Link
                key={m}
                href={moduleHref(m)}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium transition hover:border-primary hover:text-primary"
              >
                {MODULE_META[m].label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {data && data.widgets.length === 0 && (
        <EmptyState
          icon={LayoutDashboard}
          title="Nothing to show yet"
          description="Your role has no dashboard widgets assigned. Use the sidebar to reach the modules you can access."
        />
      )}
    </div>
  );
}
