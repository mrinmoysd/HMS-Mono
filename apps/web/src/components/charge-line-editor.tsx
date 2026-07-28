'use client';

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
                      <select
                        value={line.chargeId ?? ''}
                        onChange={(e) => pickCharge(i, e.target.value)}
                        className="w-full rounded-sm border border-border bg-surface px-2 py-1 text-sm"
                      >
                        <option value="">Custom…</option>
                        {charges.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
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
                <td colSpan={7} className="px-2 py-4 text-center text-fg-muted">
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
