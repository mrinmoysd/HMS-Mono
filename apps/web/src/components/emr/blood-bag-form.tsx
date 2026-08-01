'use client';

import { useState } from 'react';
import { bloodBagSchema, computeInvoiceTotals, type BloodBagDto } from '@smart-hospital/shared';
import { Field, TextInput, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useCharges } from '@/lib/hooks/use-masters';
import { useBloodDonors, useCreateBloodBag } from '@/lib/hooks/use-departments';
import { ApiRequestError } from '@/lib/api';

const EMPTY = { bagNo: '', donateDate: new Date().toISOString().slice(0, 10), volume: '', unitType: '', lot: '', institution: '', chargeId: '', standardCharge: '0', discountPct: '0', taxPct: '0', note: '' };

/** Add a whole-blood bag — "Bag Stock Details" (donor context) / "Blood Donor Details" (standalone) in the demo. */
export function BloodBagForm({ open, donorId, onClose, onSaved }: { open: boolean; donorId?: string | null; onClose: () => void; onSaved?: (b: BloodBagDto) => void }) {
  const { data: donors } = useBloodDonors({ size: 300 });
  const { data: charges } = useCharges({ size: 300, module: 'blood-bank' });
  const create = useCreateBloodBag();

  const [selectedDonorId, setSelectedDonorId] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const totals = computeInvoiceTotals([
    { name: 'x', standardCharge: Number(form.standardCharge) || 0, appliedCharge: Number(form.standardCharge) || 0, qty: 1, discountPct: Number(form.discountPct) || 0, taxPct: Number(form.taxPct) || 0 },
  ]);

  function reset() {
    setForm(EMPTY);
    setSelectedDonorId('');
    setPaymentMode('cash');
    setPaymentAmount('0');
    setError(null);
  }

  async function submit() {
    setError(null);
    const effectiveDonorId = donorId ?? selectedDonorId;
    const parsed = bloodBagSchema.safeParse({
      donorId: effectiveDonorId,
      bagNo: form.bagNo,
      donateDate: form.donateDate,
      volume: form.volume,
      unitType: form.unitType,
      lot: form.lot,
      institution: form.institution,
      chargeId: form.chargeId,
      standardCharge: form.standardCharge,
      discountPct: form.discountPct,
      taxPct: form.taxPct,
      note: form.note,
      payment: { amount: paymentAmount, mode: paymentMode },
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the highlighted fields');
      return;
    }
    try {
      const saved = await create.mutateAsync(parsed.data);
      onSaved?.(saved);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  const donorLabel = donorId ? donors?.data.find((d) => d.id === donorId)?.name : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bag Stock Details"
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={submit} loading={create.isPending}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
          {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          {donorId ? (
            <Field label="Blood Donor"><TextInput value={donorLabel ?? ''} disabled /></Field>
          ) : (
            <Field label="Blood Donor" required>
              <Select value={selectedDonorId} onChange={(e) => setSelectedDonorId(e.target.value)} placeholder="Select…" options={(donors?.data ?? []).map((d) => ({ value: d.id, label: `${d.name} (${d.bloodGroup})` }))} />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Bag No" required><TextInput value={form.bagNo} onChange={(e) => set('bagNo', e.target.value)} /></Field>
            <Field label="Donate Date"><TextInput type="date" value={form.donateDate} onChange={(e) => set('donateDate', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Volume"><TextInput value={form.volume} onChange={(e) => set('volume', e.target.value)} placeholder="350 ML" /></Field>
            <Field label="Unit Type"><TextInput value={form.unitType} onChange={(e) => set('unitType', e.target.value)} /></Field>
            <Field label="Lot"><TextInput value={form.lot} onChange={(e) => set('lot', e.target.value)} /></Field>
          </div>
          <Field label="Institution"><TextInput value={form.institution} onChange={(e) => set('institution', e.target.value)} /></Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Charge Category / Name" required>
              <Select
                value={form.chargeId}
                onChange={(e) => {
                  const c = charges?.data.find((x) => x.id === e.target.value);
                  set('chargeId', e.target.value);
                  if (c) {
                    set('standardCharge', String(c.standardCharge));
                    set('taxPct', String(c.taxPercent));
                  }
                }}
                placeholder="Select…"
                options={(charges?.data ?? []).map((c) => ({ value: c.id, label: c.categoryName ? `${c.categoryName} — ${c.name}` : c.name }))}
              />
            </Field>
            <Field label="Standard Charge ($)"><TextInput type="number" value={form.standardCharge} onChange={(e) => set('standardCharge', e.target.value)} /></Field>
          </div>
          <Field label="Note"><TextInput value={form.note} onChange={(e) => set('note', e.target.value)} /></Field>

          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2 rounded-md border border-border p-4 text-sm">
              <SummaryRow label="Total ($)" value={totals.subtotal.toFixed(2)} />
              <div className="flex items-center justify-between gap-2">
                <span className="text-fg-muted">Discount (%)</span>
                <input type="number" value={form.discountPct} onChange={(e) => set('discountPct', e.target.value)} className="h-8 w-28 rounded-sm border border-border bg-surface px-2 text-right text-sm tabular" />
              </div>
              <SummaryRow label="Discount ($)" value={totals.discount.toFixed(2)} />
              <div className="flex items-center justify-between gap-2">
                <span className="text-fg-muted">Tax (%)</span>
                <input type="number" value={form.taxPct} onChange={(e) => set('taxPct', e.target.value)} className="h-8 w-28 rounded-sm border border-border bg-surface px-2 text-right text-sm tabular" />
              </div>
              <SummaryRow label="Tax ($)" value={totals.tax.toFixed(2)} />
              <SummaryRow label="Net Amount ($)" value={totals.netAmount.toFixed(2)} bold />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Field label="Payment Mode">
                  <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} options={['cash', 'card', 'upi', 'cheque'].map((m) => ({ value: m, label: m.toUpperCase() }))} />
                </Field>
                <Field label="Amount ($)">
                  <TextInput type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
        </div>

    </Modal>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-fg-muted">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
