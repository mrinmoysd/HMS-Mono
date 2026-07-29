'use client';

import Link from 'next/link';
import { CalendarClock, Pill, Droplet } from 'lucide-react';
import type { DashboardOverviewDto } from '@smart-hospital/shared';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { hasWidget } from '@/lib/hooks/use-dashboard';

/**
 * The four "what's happening right now" cards under the KPI row.
 *
 * Each is independently permission-gated, so the grid is assembled from
 * whatever the role may see rather than laid out up front. Same reasoning as
 * KpiCards: an unpermitted card is absent, not empty.
 */

// ── Today's appointments ────────────────────────────────────────────────────

function TodayAppointmentsCard({ rows }: { rows: DashboardOverviewDto['todayAppointments'] }) {
  const list = rows ?? [];
  return (
    <Card>
      <CardHeader
        title="Today's Appointments"
        description={list.length > 0 ? `${list.length} scheduled` : undefined}
        actions={
          <Link href="/appointment" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        }
      />
      <CardBody className="p-0">
        {list.length === 0 ? (
          <div className="px-4 py-6">
            <EmptyState
              icon={CalendarClock}
              title="Nothing booked today"
              description="Appointments scheduled for today will appear here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.patientName}</p>
                  <p className="truncate text-xs text-fg-muted">{a.doctorName ?? 'Unassigned'}</p>
                </div>
                {a.slot && <span className="tabular text-xs text-fg-muted">{a.slot}</span>}
                <StatusPill status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

// ── Bed occupancy ───────────────────────────────────────────────────────────

function BedOccupancyCard({ data }: { data: NonNullable<DashboardOverviewDto['bedOccupancy']> }) {
  const stats = [
    { label: 'Total', value: data.total, tint: 'text-fg' },
    { label: 'Allotted', value: data.allotted, tint: 'text-occupied' },
    { label: 'Available', value: data.available, tint: 'text-success' },
  ];
  return (
    <Card>
      <CardHeader
        title="Bed Occupancy"
        description={`${data.percent}% of beds in use`}
        actions={
          <Link href="/ipd" className="text-xs font-medium text-primary hover:underline">
            Bed status
          </Link>
        }
      />
      <CardBody className="space-y-4">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
          role="img"
          aria-label={`${data.allotted} of ${data.total} beds allotted`}
        >
          <div className="h-full bg-occupied" style={{ width: `${data.percent}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-sm bg-surface-sunken px-3 py-2">
              <p className="text-xs text-fg-muted">{s.label}</p>
              <p className={cn('text-lg font-semibold tabular', s.tint)}>{s.value}</p>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

// ── Medicine stock ──────────────────────────────────────────────────────────

function MedicineStockCard({ data }: { data: NonNullable<DashboardOverviewDto['medicineStock']> }) {
  const healthy = data.belowReorder === 0 && data.expiringSoon === 0;
  return (
    <Card>
      <CardHeader
        title="Medicine Stock"
        description="Reorder and expiry watch"
        actions={
          <Link href="/pharmacy" className="text-xs font-medium text-primary hover:underline">
            Pharmacy
          </Link>
        }
      />
      <CardBody className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-sm bg-surface-sunken px-3 py-2">
            <p className="text-xs text-fg-muted">Below reorder</p>
            <p
              className={cn(
                'text-lg font-semibold tabular',
                data.belowReorder > 0 ? 'text-warning' : 'text-fg',
              )}
            >
              {data.belowReorder}
            </p>
          </div>
          <div className="rounded-sm bg-surface-sunken px-3 py-2">
            <p className="text-xs text-fg-muted">Critical</p>
            <p
              className={cn(
                'text-lg font-semibold tabular',
                data.critical > 0 ? 'text-danger' : 'text-fg',
              )}
            >
              {data.critical}
            </p>
          </div>
          <div className="rounded-sm bg-surface-sunken px-3 py-2">
            {/* The window is server-defined, so show it rather than hardcoding "30d". */}
            <p className="text-xs text-fg-muted">Expiring &lt;{data.expiringWithinDays}d</p>
            <p
              className={cn(
                'text-lg font-semibold tabular',
                data.expiringSoon > 0 ? 'text-warning' : 'text-fg',
              )}
            >
              {data.expiringSoon}
            </p>
          </div>
        </div>

        {data.runningLow.length > 0 && (
          <p className="text-xs text-fg-muted">
            <span className="font-medium text-warning">Running low:</span>{' '}
            {data.runningLow.join(', ')}
          </p>
        )}
        {healthy && (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <Pill className="h-3.5 w-3.5" />
            All medicines above reorder level.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

// ── Blood bank ──────────────────────────────────────────────────────────────

const LEVEL_STYLE: Record<'ok' | 'low' | 'critical', string> = {
  ok: 'bg-success/10 text-success ring-success/20',
  low: 'bg-warning/10 text-warning ring-warning/20',
  critical: 'bg-danger/10 text-danger ring-danger/20',
};

function BloodBankCard({ data }: { data: NonNullable<DashboardOverviewDto['bloodBank']> }) {
  return (
    <Card>
      <CardHeader
        title="Blood Bank"
        description={`${data.issuedToday} issued today · ${data.issuedThisWeek} this week`}
        actions={
          <Link href="/blood_bank" className="text-xs font-medium text-primary hover:underline">
            Blood bank
          </Link>
        }
      />
      <CardBody>
        {data.groups.length === 0 ? (
          <EmptyState
            icon={Droplet}
            title="No blood products configured"
            description="Add blood products in Setup to track stock here."
          />
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {data.groups.map((g) => (
              <div
                key={g.group}
                className={cn(
                  'rounded-sm px-2 py-2 text-center ring-1 ring-inset',
                  LEVEL_STYLE[g.level],
                )}
                title={`${g.group}: ${g.units} unit${g.units === 1 ? '' : 's'} (${g.level})`}
              >
                <p className="text-xs font-semibold">{g.group}</p>
                <p className="text-lg font-semibold tabular leading-tight">{g.units}</p>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ── assembly ────────────────────────────────────────────────────────────────

export function DetailCards({ data }: { data: DashboardOverviewDto }) {
  const cards: React.ReactNode[] = [];

  if (hasWidget(data, 'todayAppointments')) {
    cards.push(<TodayAppointmentsCard key="appts" rows={data.todayAppointments} />);
  }
  if (hasWidget(data, 'bedOccupancy') && data.bedOccupancy) {
    cards.push(<BedOccupancyCard key="beds" data={data.bedOccupancy} />);
  }
  if (hasWidget(data, 'medicineStock') && data.medicineStock) {
    cards.push(<MedicineStockCard key="meds" data={data.medicineStock} />);
  }
  if (hasWidget(data, 'bloodBank') && data.bloodBank) {
    cards.push(<BloodBankCard key="blood" data={data.bloodBank} />);
  }

  if (cards.length === 0) return null;

  return (
    <div className={cn('grid grid-cols-1 gap-4', cards.length > 1 && 'lg:grid-cols-2')}>{cards}</div>
  );
}
