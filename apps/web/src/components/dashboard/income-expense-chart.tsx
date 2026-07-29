'use client';

import { useId } from 'react';
import type { IncomeExpenseDto, TrendPoint } from '@smart-hospital/shared';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Yearly income vs expense, twelve months.
 *
 * Hand-rolled SVG like the rest of the app's charts. Unlike Sparkline this one
 * carries axes and labels, so it keeps the default preserveAspectRatio — a
 * stretched viewBox would smear the text along with the paths.
 *
 * Points arrive keyed "YYYY-MM" (see DashboardService.incomeExpense), not full
 * ISO dates.
 */

const money = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
};

const monthLabel = (key: string): string => {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString(undefined, { month: 'short' });
};

/** Round up to a clean 1/2/5 × 10ⁿ so the axis labels are readable numbers. */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  const norm = v / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />
      <span className="text-xs text-fg-muted">{label}</span>
      <span className="text-xs font-semibold tabular">{value}</span>
    </div>
  );
}

export function IncomeExpenseChart({ data }: { data: IncomeExpenseDto }) {
  const gradId = useId();
  const income = data.income ?? [];
  const expense = data.expense ?? [];
  const n = Math.max(income.length, expense.length);

  // Geometry, in viewBox units. Left gutter holds the y labels, bottom the months.
  const W = 620;
  const H = 240;
  const padL = 44;
  const padR = 8;
  const padT = 12;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const max = niceMax(Math.max(1, ...income.map((p) => p.value), ...expense.map((p) => p.value)));
  const x = (i: number): number => (n <= 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW);
  const y = (v: number): number => padT + plotH - (v / max) * plotH;

  const path = (pts: TrendPoint[]): string =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');

  const areaPath = (pts: TrendPoint[]): string =>
    pts.length === 0
      ? ''
      : `${path(pts)} L${x(pts.length - 1).toFixed(1)},${padT + plotH} L${x(0).toFixed(1)},${padT + plotH} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const incomeColor = 'rgb(var(--success))';
  const expenseColor = 'rgb(var(--danger))';

  // Twelve labels collide at card width, so show every other one — first and
  // last always land on a tick, which is what people read off.
  const labelEvery = n > 8 ? 2 : 1;

  const net = data.netYtd;

  return (
    <Card>
      <CardHeader
        title="Income vs Expense"
        description="Last 12 months"
        actions={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Legend color={incomeColor} label="Income YTD" value={money(data.incomeYtd)} />
            <Legend color={expenseColor} label="Expense YTD" value={money(data.expenseYtd)} />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-fg-muted">Net</span>
              <span
                className={cn(
                  'text-xs font-semibold tabular',
                  net >= 0 ? 'text-success' : 'text-danger',
                )}
              >
                {net < 0 ? '−' : ''}
                {money(Math.abs(net))}
              </span>
            </div>
          </div>
        }
      />
      <CardBody>
        {n === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">
            No income or expense recorded in the last 12 months.
          </p>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label={`Income versus expense over ${n} months. Income year to date ${data.incomeYtd}, expense ${data.expenseYtd}.`}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={incomeColor} stopOpacity="0.18" />
                <stop offset="100%" stopColor={incomeColor} stopOpacity="0" />
              </linearGradient>
            </defs>

            {gridLines.map((g) => {
              const gy = padT + plotH - g * plotH;
              return (
                <g key={g}>
                  <line
                    x1={padL}
                    x2={W - padR}
                    y1={gy}
                    y2={gy}
                    stroke="rgb(var(--border))"
                    strokeWidth="1"
                  />
                  <text
                    x={padL - 6}
                    y={gy + 3.5}
                    textAnchor="end"
                    className="fill-fg-subtle"
                    fontSize="9"
                  >
                    {money(max * g)}
                  </text>
                </g>
              );
            })}

            {income.map((p, i) =>
              i % labelEvery === 0 || i === n - 1 ? (
                <text
                  key={p.date}
                  x={x(i)}
                  y={H - 8}
                  textAnchor="middle"
                  className="fill-fg-subtle"
                  fontSize="9"
                >
                  {monthLabel(p.date)}
                </text>
              ) : null,
            )}

            <path d={areaPath(income)} fill={`url(#${gradId})`} />
            <path
              d={path(expense)}
              fill="none"
              stroke={expenseColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4 3"
            />
            <path
              d={path(income)}
              fill="none"
              stroke={incomeColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {income.map((p, i) => (
              <circle key={p.date} cx={x(i)} cy={y(p.value)} r="2.5" fill={incomeColor}>
                <title>{`${monthLabel(p.date)} — income ${Math.round(p.value)}`}</title>
              </circle>
            ))}
            {expense.map((p, i) => (
              <circle key={p.date} cx={x(i)} cy={y(p.value)} r="2.5" fill={expenseColor}>
                <title>{`${monthLabel(p.date)} — expense ${Math.round(p.value)}`}</title>
              </circle>
            ))}
          </svg>
        )}
      </CardBody>
    </Card>
  );
}
