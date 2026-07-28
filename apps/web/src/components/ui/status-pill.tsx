'use client';

import { cn } from '@/lib/utils';

/**
 * Maps a known workflow status to a tone automatically. Use Badge instead when
 * the tone needs to be chosen explicitly.
 *
 * Keys are matched case-insensitively so the demo-parity labels the modules
 * emit ("Paid", "Not Generated", "Returned") land on the right tone without
 * every call site normalising first.
 */
const TONE: Record<string, string> = {
  // positive
  approved: 'bg-success-soft text-success ring-success/20',
  completed: 'bg-success-soft text-success ring-success/20',
  paid: 'bg-success-soft text-success ring-success/20',
  active: 'bg-success-soft text-success ring-success/20',
  generated: 'bg-success-soft text-success ring-success/20',
  issued: 'bg-success-soft text-success ring-success/20',
  // in-flight
  pending: 'bg-warning-soft text-warning ring-warning/20',
  partial: 'bg-warning-soft text-warning ring-warning/20',
  processing: 'bg-warning-soft text-warning ring-warning/20',
  returned: 'bg-warning-soft text-warning ring-warning/20',
  // negative
  cancelled: 'bg-danger-soft text-danger ring-danger/20',
  unpaid: 'bg-danger-soft text-danger ring-danger/20',
  expired: 'bg-danger-soft text-danger ring-danger/20',
  rejected: 'bg-danger-soft text-danger ring-danger/20',
  // informational
  scheduled: 'bg-info-soft text-info ring-info/20',
  draft: 'bg-info-soft text-info ring-info/20',
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
        TONE[status?.toLowerCase?.()] ?? 'bg-surface-sunken text-fg-muted ring-line',
        className,
      )}
    >
      {status}
    </span>
  );
}
