'use client';

import { cn } from '@/lib/utils';

/**
 * Key/value record summary — the header block on Patient 360, TPA Details,
 * payslips and every "Details" modal. Those are currently bare `<table>`s with
 * ad-hoc `[&_td]:py-0.5` selectors.
 */
export function DescriptionList({
  items,
  columns = 1,
  className,
}: {
  items: { label: React.ReactNode; value: React.ReactNode }[];
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  const cols = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }[columns];
  return (
    <dl className={cn('grid gap-x-6 gap-y-2', cols, className)}>
      {items.map((it, i) => (
        <div key={i} className="flex gap-3 text-sm">
          <dt className="w-28 shrink-0 text-fg-muted">{it.label}</dt>
          <dd className="min-w-0 flex-1">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
