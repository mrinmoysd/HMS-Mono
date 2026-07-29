'use client';

import Link from 'next/link';
import type { StaffAttendanceDto } from '@smart-hospital/shared';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Today's staff attendance, overall and per role.
 *
 * "Present" counts present | late | half_day — someone who came in late is at
 * work, and rolling them into the absent figure would misreport staffing. The
 * split lives in DashboardService.staffAttendance.
 */

/** Green when nearly everyone is in, amber when thin, red when badly short. */
function tone(percent: number): { bar: string; text: string } {
  if (percent >= 85) return { bar: 'bg-success', text: 'text-success' };
  if (percent >= 60) return { bar: 'bg-warning', text: 'text-warning' };
  return { bar: 'bg-danger', text: 'text-danger' };
}

export function StaffAttendance({ data }: { data: StaffAttendanceDto }) {
  const overall = tone(data.percent);
  const rows = [...(data.rows ?? [])].sort((a, b) => b.total - a.total);

  return (
    <Card className="h-full">
      <CardHeader
        title="Staff Attendance"
        description={new Date(`${data.date}T00:00:00`).toLocaleDateString(undefined, {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        })}
        actions={
          <Link
            href="/human_resource"
            className="text-xs font-medium text-primary hover:underline"
          >
            Attendance
          </Link>
        }
      />
      <CardBody className="space-y-4">
        <div>
          <div className="flex items-baseline justify-between">
            <span className={cn('text-2xl font-semibold tabular', overall.text)}>
              {data.percent}%
            </span>
            <span className="text-xs text-fg-muted">
              {data.present} of {data.total} present
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
            <div className={cn('h-full', overall.bar)} style={{ width: `${data.percent}%` }} />
          </div>
        </div>

        {rows.length > 0 && (
          <ul className="space-y-2">
            {rows.map((r) => {
              const t = tone(r.percent);
              return (
                <li key={r.role}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="truncate text-fg-muted">{r.role}</span>
                    <span className="tabular">
                      {r.present}/{r.total}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                    <div className={cn('h-full', t.bar)} style={{ width: `${r.percent}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
