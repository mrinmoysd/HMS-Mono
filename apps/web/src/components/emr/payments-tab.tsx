'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { EncounterBillingDto, EncounterType } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, Select } from '@/components/ui/field';
import { useAddEncounterPayment } from '@/lib/hooks/use-encounter-billing';

const MODES = ['cash', 'card', 'upi', 'tpa', 'cheque'] as const;

/** Encounter Payments tab: payment history + Add Payment modal. Reused by OPD & IPD. */
export function PaymentsTab({
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
  const add = useAddEncounterPayment(type, id);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<(typeof MODES)[number]>('cash');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError('Enter a payment amount');
      return;
    }
    await add.mutateAsync({ amount: amt, mode, reference: reference || undefined });
    setOpen(false);
    setAmount(''); setMode('cash'); setReference('');
  }

  const noLedger = !data.invoiceId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payments</h2>
        {canEdit && (
          <Button size="sm" onClick={() => setOpen(true)} disabled={noLedger} title={noLedger ? 'Add charges first' : undefined}>
            <Plus className="h-4 w-4" /> Add Payment
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Net Amount" value={data.netAmount} />
        <Stat label="Paid" value={data.paid} accent="text-success" />
        <Stat label="Balance" value={data.balance} accent={data.balance > 0 ? 'text-warning' : 'text-success'} />
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-3 py-2.5 font-semibold">Date</th>
              <th className="px-3 py-2.5 font-semibold">Mode</th>
              <th className="px-3 py-2.5 font-semibold">Reference</th>
              <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.payments.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-10 text-center text-fg-muted">No payments recorded</td></tr>
            )}
            {data.payments.map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5">{new Date(p.paidAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td className="px-3 py-2.5 uppercase">{p.mode}</td>
                <td className="px-3 py-2.5 text-fg-muted">{p.reference ?? '—'}</td>
                <td className="px-3 py-2.5 text-right tabular font-medium">{p.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormDrawer open={open} title="Add Payment" onClose={() => setOpen(false)} onSubmit={save} submitting={add.isPending}>
        {error && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="space-y-4">
          <Field label={`Amount (Balance ${data.balance.toFixed(2)})`} required>
            <TextInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Payment Mode">
            <Select value={mode} onChange={(e) => setMode(e.target.value as (typeof MODES)[number])} options={MODES.map((m) => ({ value: m, label: m }))} />
          </Field>
          <Field label="Transaction / Reference No.">
            <TextInput value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
        </div>
      </FormDrawer>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <p className="text-xs text-fg-muted">{label}</p>
      <p className={`tabular text-lg font-semibold ${accent ?? ''}`}>{value.toFixed(2)}</p>
    </div>
  );
}
