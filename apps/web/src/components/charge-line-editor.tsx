'use client';

import { useMemo, useState } from 'react';
import { Select } from '@/components/ui/field';
import { Plus, Trash2 } from 'lucide-react';
import {
  computeInvoiceTotals,
  computeLineAmount,
  type ChargeDto,
  type InvoiceItemInput,
} from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';

export type ChargeLine = InvoiceItemInput;

interface Props {
  lines: ChargeLine[];
  onChange: (lines: ChargeLine[]) => void;
  /**
   * Already filtered to this module by the caller's `useCharges({ module })`.
   * The Charge Category select below narrows that list further; it does not
   * widen it, so a charge type hidden from this module stays hidden.
   */
  charges?: ChargeDto[];
}

const EMPTY_LINE: ChargeLine = {
  name: '',
  appliedCharge: 0,
  standardCharge: 0,
  qty: 1,
  discountPct: 0,
  taxPct: 0,
};

/**
 * Reusable charge-line editor with live totals. Shared by OPD/IPD/pharmacy/etc.
 * Uses the same compute functions as the API so totals always match (§Billing).
 */
export function ChargeLineEditor({ lines, onChange, charges }: Props) {
  const totals = computeInvoiceTotals(lines.filter((l) => l.name));

  // Charge Category is a filter over the charges we were handed, per row.
  // Derived from those charges rather than fetched separately, so a category
  // whose charges are all hidden from this module never appears at all.
  const [categoryByRow, setCategoryByRow] = useState<Record<number, string>>({});
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of charges ?? []) {
      if (c.categoryId && c.categoryName) seen.set(c.categoryId, c.categoryName);
    }
    return [...seen].map(([value, label]) => ({ value, label }));
  }, [charges]);

  function chargesFor(row: number): ChargeDto[] {
    const cat = categoryByRow[row];
    if (!cat) return charges ?? [];
    return (charges ?? []).filter((c) => c.categoryId === cat);
  }

  function update(i: number, patch: Partial<ChargeLine>) {
    onChange(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function remove(i: number) {
    onChange(lines.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...lines, { ...EMPTY_LINE }]);
  }
  function pickCharge(i: number, chargeId: string) {
    const c = charges?.find((x) => x.id === chargeId);
    if (!c) return;
    update(i, {
      chargeId: c.id,
      name: c.name,
      standardCharge: c.standardCharge,
      appliedCharge: c.standardCharge,
      taxPct: c.taxPercent,
    });
  }

  const num =
    'w-full rounded-sm border border-border bg-surface px-2 py-1 text-sm outline-none focus:border-primary tabular';

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg text-left text-xs uppercase text-fg-muted">
              <th className="px-2 py-2 font-semibold">Charge</th>
              <th className="w-20 px-2 py-2 font-semibold">Standard</th>
              <th className="w-20 px-2 py-2 font-semibold">Applied</th>
              <th className="w-14 px-2 py-2 font-semibold">Qty</th>
              <th className="w-16 px-2 py-2 font-semibold">Disc %</th>
              <th className="w-16 px-2 py-2 font-semibold">Tax %</th>
              <th className="w-24 px-2 py-2 text-right font-semibold">Amount</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="border-b border-border/60 last:border-0">
                <td className="px-2 py-1.5">
                  {charges && charges.length > 0 ? (
                    <div className="space-y-1">
                      {categories.length > 1 && (
                        <Select
                          value={categoryByRow[i] ?? ''}
                          aria-label="Charge Category"
                          onChange={(e) => {
                            setCategoryByRow((m) => ({ ...m, [i]: e.target.value }));
                            // The selected charge may not belong to the new
                            // category, so clear it rather than leaving a
                            // charge shown under a category it is not in.
                            update(i, { chargeId: undefined });
                          }}
                          placeholder="All categories"
                          options={categories}
                          className="py-1"
                        />
                      )}
                      <Select
                        value={line.chargeId ?? ''}
                        aria-label="Charge"
                        onChange={(e) => pickCharge(i, e.target.value)}
                        placeholder="Custom…"
                        options={chargesFor(i).map((c) => ({ value: c.id, label: c.name }))}
                        className="py-1"
                      />
                      <input
                        value={line.name}
                        onChange={(e) => update(i, { name: e.target.value })}
                        placeholder="Item name"
                        className="w-full rounded-sm border border-border bg-surface px-2 py-1 text-sm"
                      />
                    </div>
                  ) : (
                    <input
                      value={line.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="Item name"
                      className="w-full rounded-sm border border-border bg-surface px-2 py-1 text-sm"
                    />
                  )}
                </td>
                {/* Standard is what the master says; Applied is what is being
                    charged. Showing only one hid the fact that a rate had been
                    overridden. Read-only — to change the standard rate you edit
                    the charge in Setup. */}
                <td className="px-2 py-1.5 text-right tabular text-fg-muted">
                  {line.standardCharge ? line.standardCharge.toFixed(2) : '—'}
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    value={line.appliedCharge}
                    onChange={(e) => update(i, { appliedCharge: Number(e.target.value) })}
                    className={num}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    value={line.qty}
                    onChange={(e) => update(i, { qty: Math.max(1, Number(e.target.value)) })}
                    className={num}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    value={line.discountPct}
                    onChange={(e) => update(i, { discountPct: Number(e.target.value) })}
                    className={num}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    value={line.taxPct}
                    onChange={(e) => update(i, { taxPct: Number(e.target.value) })}
                    className={num}
                  />
                </td>
                <td className="px-2 py-1.5 text-right tabular">{computeLineAmount(line).toFixed(2)}</td>
                <td className="px-1">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label="Remove line"
                    className="flex h-6 w-6 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={8} className="px-2 py-4 text-center text-fg-muted">
                  No charges added
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          <Plus className="h-4 w-4" /> Add charge line
        </Button>
        <div className="flex gap-4 text-sm tabular">
          <span className="text-fg-muted">
            Subtotal <b className="text-fg">{totals.subtotal.toFixed(2)}</b>
          </span>
          <span className="text-fg-muted">
            Disc <b className="text-fg">{totals.discount.toFixed(2)}</b>
          </span>
          <span className="text-fg-muted">
            Tax <b className="text-fg">{totals.tax.toFixed(2)}</b>
          </span>
          <span className="text-fg-muted">
            Net <b className="text-primary">{totals.netAmount.toFixed(2)}</b>
          </span>
        </div>
      </div>
    </div>
  );
}
