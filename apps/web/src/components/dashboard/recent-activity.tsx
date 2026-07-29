'use client';

import type { ActivityRow } from '@smart-hospital/shared';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { History } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Audit trail, most recent first.
 *
 * Gated on `setup:edit` rather than `setup:view` — every seeded role holds
 * `setup:view`, so gating on it would show who-touched-what across the whole
 * hospital to the whole hospital. See DASHBOARD_WIDGETS.
 */

const ACTION_STYLE: Record<string, string> = {
  create: 'bg-success/10 text-success',
  update: 'bg-info/10 text-info',
  delete: 'bg-danger/10 text-danger',
  login: 'bg-surface-sunken text-fg-muted',
};

/** "just now" / "12m ago" / "3h ago" / "2d ago", falling back to a date. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days <= 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** `entity` arrives as a table name — "ipd_admission" reads better as words. */
const humanise = (s: string): string => s.replace(/_/g, ' ');

export function RecentActivity({ rows }: { rows: ActivityRow[] }) {
  return (
    <Card className="h-full">
      <CardHeader title="Recent Activity" description="Across all modules" />
      <CardBody className="p-0">
        {rows.length === 0 ? (
          <div className="px-4 py-6">
            <EmptyState
              icon={History}
              title="No activity yet"
              description="Changes staff make across the system will show up here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <span
                  className={cn(
                    'shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    ACTION_STYLE[r.action] ?? 'bg-surface-sunken text-fg-muted',
                  )}
                >
                  {r.action}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-medium capitalize">{humanise(r.module)}</span>
                    {r.detail && <span className="text-fg-muted"> · {r.detail}</span>}
                  </p>
                  <p className="truncate text-xs text-fg-muted">{r.userName ?? 'System'}</p>
                </div>
                {r.amount != null && (
                  <span className="tabular text-xs font-medium">
                    $ {Math.round(r.amount).toLocaleString()}
                  </span>
                )}
                <span className="shrink-0 text-xs text-fg-subtle">{timeAgo(r.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
