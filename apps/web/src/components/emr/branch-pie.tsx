'use client';

import type { BranchOverviewRow } from '@smart-hospital/shared';

const COLORS = ['#14B8A6', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6', '#10B981', '#EF4444', '#06B6D4'];

/** Multi-branch pie chart (hand-rolled SVG, matching the credit-donut.tsx house style — no charting library). */
export function BranchPie({ rows, metricKey }: { rows: BranchOverviewRow[]; metricKey: string }) {
  const values = rows.map((r) => Math.max(0, r.values[metricKey] ?? 0));
  const total = values.reduce((a, b) => a + b, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 140 140" className="h-24 w-24 shrink-0 -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor" strokeWidth="18" className="text-border/40" />
        {total > 0 &&
          rows.map((row, i) => {
            const val = values[i]!;
            if (!val) return null;
            const frac = val / total;
            const dash = c * frac;
            const dashOffset = -offset;
            offset += dash;
            return (
              <circle
                key={row.branchId}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={COLORS[i % COLORS.length]}
                strokeWidth="18"
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={dashOffset}
              />
            );
          })}
      </svg>
      <ul className="space-y-1 text-xs">
        {rows.map((row, i) => (
          <li key={row.branchId} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-fg-muted">{row.branchName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
