'use client';

import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import type { IncomeByModuleDto } from '@smart-hospital/shared';
import { MODULE_META, type ModuleKey } from '@smart-hospital/shared';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Module revenue, this month against last.
 *
 * Reads the same slice as IncomeDonut but answers a different question: the
 * donut shows *composition* (who earns what share now), this shows *movement*
 * (which modules are up or down). Keeping both is deliberate — collapsing them
 * would lose one or the other.
 */

const money = (n: number): string => `$ ${Math.round(n).toLocaleString()}`;

function moduleLabel(key: string): string {
  const meta = MODULE_META[key as ModuleKey];
  if (meta) return meta.label;
  // Invoice modules and RBAC modules overlap but are not identical.
  if (key === 'blood') return 'Blood Bank';
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Percent change vs last month; null when there is no baseline to divide by. */
function delta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function ModuleRevenueTable({ data }: { data: IncomeByModuleDto }) {
  const rows = [...(data.rows ?? [])].sort((a, b) => b.income - a.income);
  if (rows.length === 0) return null;

  const lastTotal = rows.reduce((s, r) => s + r.lastMonth, 0);
  const totalDelta = delta(data.total, lastTotal);

  return (
    <Card>
      <CardHeader
        title="Module Revenue"
        description="This month against last"
        actions={
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-fg-muted">Total</span>
            <span className="tabular text-sm font-semibold">{money(data.total)}</span>
            {totalDelta !== null && (
              <span
                className={cn(
                  'tabular text-xs font-medium',
                  totalDelta >= 0 ? 'text-success' : 'text-danger',
                )}
              >
                {totalDelta >= 0 ? '+' : ''}
                {totalDelta}%
              </span>
            )}
          </div>
        }
      />
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                <th className="px-4 py-2 font-medium">Module</th>
                <th className="px-4 py-2 text-right font-medium">This month</th>
                <th className="px-4 py-2 text-right font-medium">Last month</th>
                <th className="px-4 py-2 text-right font-medium">Change</th>
                <th className="w-32 px-4 py-2 font-medium">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const d = delta(r.income, r.lastMonth);
                const Icon = d === null ? ArrowRight : d >= 0 ? ArrowUpRight : ArrowDownRight;
                return (
                  <tr key={r.module}>
                    <td className="px-4 py-2 font-medium">{moduleLabel(r.module)}</td>
                    <td className="px-4 py-2 text-right tabular">{money(r.income)}</td>
                    <td className="px-4 py-2 text-right tabular text-fg-muted">
                      {money(r.lastMonth)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={cn(
                          'inline-flex items-center gap-0.5 tabular text-xs font-medium',
                          d === null ? 'text-fg-subtle' : d >= 0 ? 'text-success' : 'text-danger',
                        )}
                      >
                        <Icon className="h-3 w-3" aria-hidden />
                        {/* No prior revenue means the percentage is undefined,
                            not zero — say "new" rather than inventing ∞%. */}
                        {d === null ? 'new' : `${d >= 0 ? '+' : ''}${d}%`}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                          <div className="h-full bg-primary" style={{ width: `${r.share}%` }} />
                        </div>
                        <span className="w-10 shrink-0 text-right tabular text-xs text-fg-muted">
                          {r.share}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
