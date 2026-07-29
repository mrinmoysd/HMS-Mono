'use client';

import type { DashboardOverviewDto, TrendPoint } from '@smart-hospital/shared';
import { Sparkline } from '@/components/ui/sparkline';
import { cn } from '@/lib/utils';
import { hasWidget } from '@/lib/hooks/use-dashboard';

const money = (n: number): string =>
  `$ ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const values = (t: TrendPoint[] | undefined): number[] => (t ?? []).map((p) => p.value);

function KpiCard({
  label,
  value,
  sub,
  subTone = 'muted',
  trend,
  color,
}: {
  label: string;
  value: string;
  sub: React.ReactNode;
  subTone?: 'muted' | 'success' | 'danger';
  trend: number[];
  color: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-md border border-border bg-surface p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold tabular">{value}</p>
        <p
          className={cn(
            'mt-0.5 text-xs',
            subTone === 'success' && 'text-success',
            subTone === 'danger' && 'text-danger',
            subTone === 'muted' && 'text-fg-muted',
          )}
        >
          {sub}
        </p>
      </div>
      {/* Negative bottom margin lets the sparkline bleed to the card edge. */}
      <div className="-mx-4 -mb-4 mt-3">
        <Sparkline points={trend} color={color} height={44} />
      </div>
    </div>
  );
}

/**
 * The KPI row. Renders only the cards this role may see and reflows for 1–4 of
 * them, so a nurse gets one full-width-ish card rather than a broken 4-column
 * grid with three holes.
 */
export function KpiCards({ data }: { data: DashboardOverviewDto }) {
  const cards: React.ReactNode[] = [];

  if (hasWidget(data, 'revenueKpi') && data.revenueKpi) {
    const k = data.revenueKpi;
    cards.push(
      <KpiCard
        key="revenue"
        label="Total Revenue · MTD"
        value={money(k.total)}
        sub={
          k.changePct === null
            ? 'no prior month to compare'
            : `${k.changePct >= 0 ? '+' : ''}${k.changePct}% vs last month`
        }
        subTone={k.changePct === null ? 'muted' : k.changePct >= 0 ? 'success' : 'danger'}
        trend={values(k.trend)}
        color="rgb(var(--success))"
      />,
    );
  }

  if (hasWidget(data, 'bedOccupancyKpi') && data.bedOccupancyKpi) {
    const k = data.bedOccupancyKpi;
    cards.push(
      <KpiCard
        key="beds"
        label="Bed Occupancy"
        value={`${k.percent}%`}
        sub={`${k.occupied} of ${k.total} occupied`}
        trend={values(k.trend)}
        color="rgb(var(--primary))"
      />,
    );
  }

  if (hasWidget(data, 'appointmentsKpi') && data.appointmentsKpi) {
    const k = data.appointmentsKpi;
    cards.push(
      <KpiCard
        key="appts"
        label="Today's Appointments"
        value={String(k.today)}
        sub={`${k.confirmed} Confirmed · ${k.pending} Pending`}
        subTone="success"
        trend={values(k.trend)}
        color="rgb(var(--info))"
      />,
    );
  }

  if (hasWidget(data, 'outstandingKpi') && data.outstandingKpi) {
    const k = data.outstandingKpi;
    cards.push(
      <KpiCard
        key="outstanding"
        label="Outstanding Bills"
        value={money(k.amount)}
        sub={
          <>
            {k.unpaid} Unpaid · {k.overdue} Overdue
            {/* The rule is derived, not stored — say so rather than implying
                the system tracks a real due date. */}
            <span className="text-fg-subtle"> (&gt;{k.overdueAfterDays}d)</span>
          </>
        }
        subTone="danger"
        trend={values(k.trend)}
        color="rgb(var(--danger))"
      />,
    );
  }

  if (cards.length === 0) return null;

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2',
        cards.length >= 4 && 'lg:grid-cols-4',
        cards.length === 3 && 'lg:grid-cols-3',
        cards.length <= 2 && 'lg:grid-cols-2',
      )}
    >
      {cards}
    </div>
  );
}
