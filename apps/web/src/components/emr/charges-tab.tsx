'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { EncounterBillingDto, EncounterType } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { ChargeLineEditor, type ChargeLine } from '@/components/charge-line-editor';
import { useCharges } from '@/lib/hooks/use-masters';
import { useAddCharges } from '@/lib/hooks/use-encounter-billing';

const EMPTY_LINE: ChargeLine = { name: '', appliedCharge: 0, standardCharge: 0, qty: 1, discountPct: 0, taxPct: 0 };

/** Encounter Charges tab: ledger table + Add Charges modal (Apply-TPA). Reused by OPD & IPD. */
export function ChargesTab({
  type,
  id,
  data,
  canEdit,
}: {
  type: EncounterType;
  id: string;
  data: EncounterBillingDto;
  canEdit: boolean;
}) {
  const { data: chargeData } = useCharges({ size: 100 });
  const add = useAddCharges(type, id);
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<ChargeLine[]>([{ ...EMPTY_LINE }]);
  const [applyTpa, setApplyTpa] = useState(false);

  async function save() {
    const valid = lines.filter((l) => l.name);
    if (valid.length === 0) return;
    await add.mutateAsync({ items: valid, applyTpa });
    setOpen(false);
    setLines([{ ...EMPTY_LINE }]);
    setApplyTpa(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Charges</h2>
        {canEdit && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add Charges
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-3 py-2.5 font-semibold">Charge</th>
              <th className="px-3 py-2.5 text-right font-semibold">Applied</th>
              <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
              <th className="px-3 py-2.5 text-right font-semibold">Disc %</th>
              <th className="px-3 py-2.5 text-right font-semibold">Tax %</th>
              <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.charges.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-fg-muted">No charges added</td></tr>
            )}
            {data.charges.map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-medium">{c.name}</td>
                <td className="px-3 py-2.5 text-right tabular">{c.appliedCharge.toFixed(2)}</td>
                <td className="px-3 py-2.5 text-right tabular">{c.qty}</td>
                <td className="px-3 py-2.5 text-right tabular">{c.discountPct}</td>
                <td className="px-3 py-2.5 text-right tabular">{c.taxPct}</td>
                <td className="px-3 py-2.5 text-right tabular font-medium">{c.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          {data.charges.length > 0 && (
            <tfoot>
              <tr className="border-t border-border text-sm">
                <td colSpan={5} className="px-3 py-2 text-right text-fg-muted">Subtotal</td>
                <td className="px-3 py-2 text-right tabular">{data.subtotal.toFixed(2)}</td>
              </tr>
              <tr className="text-sm">
                <td colSpan={5} className="px-3 py-1 text-right text-fg-muted">Discount</td>
                <td className="px-3 py-1 text-right tabular">{data.discount.toFixed(2)}</td>
              </tr>
              <tr className="text-sm">
                <td colSpan={5} className="px-3 py-1 text-right text-fg-muted">Tax</td>
                <td className="px-3 py-1 text-right tabular">{data.tax.toFixed(2)}</td>
              </tr>
              <tr className="border-t border-border text-sm font-semibold">
                <td colSpan={5} className="px-3 py-2 text-right">Net Amount</td>
                <td className="px-3 py-2 text-right tabular text-primary">{data.netAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <FormDrawer open={open} title="Add Charges" onClose={() => setOpen(false)} onSubmit={save} submitting={add.isPending} wide>
        <div className="space-y-4">
          <ChargeLineEditor lines={lines} onChange={setLines} charges={chargeData?.data} />
          <Checkbox label="Apply TPA (bill to the patient&apos;s third-party administrator)" checked={applyTpa} onChange={(e) => setApplyTpa(e.target.checked)} />
        </div>
      </FormDrawer>
    </div>
  );
}
