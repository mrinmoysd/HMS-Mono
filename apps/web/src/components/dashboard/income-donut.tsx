'use client';

import type { IncomeByModuleDto } from '@smart-hospital/shared';
import { MODULE_META, type ModuleKey } from '@smart-hospital/shared';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { CHART_SERIES } from '@/lib/chart-colors';

/**
 * This month's income split by module.
 *
 * Hand-rolled donut in the branch-pie.tsx / credit-donut.tsx style: a rotated
 * circle per slice using stroke-dasharray, no charting library.
 *
 * The row's `module` is an invoice module string ('opd', 'blood', …). Where it
 * matches a ModuleKey we show the human label from MODULE_META rather than the
 * raw slug; invoice modules and RBAC modules are close but not identical
 * (`blood` vs `blood_bank`), so unknown values fall back to a tidied slug.
 */

const money = (n: number): string => `$ ${Math.round(n).toLocaleString()}`;

function moduleLabel(key: string): string {
  const meta = MODULE_META[key as ModuleKey];
  if (meta) return meta.label;
  if (key === 'blood') return 'Blood Bank';
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function IncomeDonut({ data }: { data: IncomeByModuleDto }) {
  const rows = [...(data.rows ?? [])].sort((a, b) => b.income - a.income);
  const total = data.total || 0;

  const r = 52;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const period = (() => {
    const [y, m] = data.period.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  })();

  return (
    <Card>
      <CardHeader title="Income by Module" description={period} />
      <CardBody>
        {total <= 0 || rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">No income billed this month yet.</p>
        ) : (
          // Stacked, not side by side: this card sits in a third of the grid,
          // and module labels ("IPD – In Patient") need the full width or they
          // truncate to nothing useful.
          <div className="flex flex-col items-center gap-4">
            <div className="relative shrink-0">
              <svg viewBox="0 0 140 140" className="h-32 w-32 -rotate-90">
                <circle
                  cx="70"
                  cy="70"
                  r={r}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="18"
                  className="text-border/40"
                />
                {rows.map((row, i) => {
                  if (row.income <= 0) return null;
                  const dash = circumference * (row.income / total);
                  const dashOffset = -offset;
                  offset += dash;
                  return (
                    <circle
                      key={row.module}
                      cx="70"
                      cy="70"
                      r={r}
                      fill="none"
                      stroke={CHART_SERIES[i % CHART_SERIES.length]}
                      strokeWidth="18"
                      strokeDasharray={`${dash} ${circumference - dash}`}
                      strokeDashoffset={dashOffset}
                    >
                      <title>{`${moduleLabel(row.module)} — ${money(row.income)} (${row.share}%)`}</title>
                    </circle>
                  );
                })}
              </svg>
              {/* Centre label: the total the slices add up to. */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase tracking-wide text-fg-muted">Total</span>
                <span className="text-sm font-semibold tabular">{money(total)}</span>
              </div>
            </div>

            <ul className="w-full space-y-1">
              {rows.map((row, i) => (
                <li key={row.module} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ background: CHART_SERIES[i % CHART_SERIES.length] }}
                  />
                  <span className="flex-1 truncate text-fg-muted">{moduleLabel(row.module)}</span>
                  <span className="tabular font-medium">{money(row.income)}</span>
                  <span className="w-10 text-right tabular text-fg-subtle">{row.share}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
