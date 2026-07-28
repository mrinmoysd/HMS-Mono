'use client';

import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { medicinePurchaseSchema, type MedicinePurchaseItemInput } from '@smart-hospital/shared';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { useCatalog } from '@/lib/hooks/use-masters';
import { usePharmaSuppliers, useMedicines, useCreateMedicinePurchase } from '@/lib/hooks/use-departments';
import { ApiRequestError } from '@/lib/api';

type Line = Omit<MedicinePurchaseItemInput, 'expiryMonth'> & { expiryMonth: string };

const EMPTY_LINE: Line = {
  categoryId: null,
  medicineId: '',
  batchNo: '',
  expiryMonth: '',
  mrp: 0,
  batchAmount: 0,
  salePrice: 0,
  packingQty: undefined,
  quantity: 1,
  purchasePrice: 0,
  taxPercent: 0,
};

function lineAmount(l: Line): number {
  const gross = (l.purchasePrice || 0) * (l.quantity || 0);
  return gross + gross * ((l.taxPercent || 0) / 100);
}

/** Purchase Medicine — multi-batch line editor + payment capture (mirrors ChargeLineEditor). */
export function PurchaseMedicineForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: suppliers } = usePharmaSuppliers();
  const { data: categories } = useCatalog('medicine-category', { size: 100 });
  const { data: medicines } = useMedicines({ size: 500 });
  const create = useCreateMedicinePurchase();

  const [supplierId, setSupplierId] = useState('');
  const [billNo, setBillNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);
  const [note, setNote] = useState('');
  const [discountPct, setDiscountPct] = useState('0');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [paymentNote, setPaymentNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});

  if (!open) return null;

  function update(i: number, patch: Partial<Line>) {
    setLines((rs) => rs.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  const validLines = lines.filter((l) => l.medicineId);
  const subtotal = validLines.reduce((s, l) => s + (l.purchasePrice || 0) * (l.quantity || 0), 0);
  const tax = validLines.reduce((s, l) => s + ((l.purchasePrice || 0) * (l.quantity || 0)) * ((l.taxPercent || 0) / 100), 0);
  const discount = subtotal * (Number(discountPct) / 100);
  const netAmount = subtotal - discount + tax;

  function reset() {
    setSupplierId(''); setBillNo(''); setNote(''); setDiscountPct('0');
    setPaymentMode('cash'); setPaymentAmount('0'); setPaymentNote('');
    setLines([{ ...EMPTY_LINE }]);
    setErrors({});
    setError(null);
  }

  async function submit() {
    setError(null);
    const parsed = medicinePurchaseSchema.safeParse({
      supplierId,
      billNo,
      purchaseDate,
      note,
      discountPct,
      items: validLines,
      paymentMode,
      paymentAmount,
      paymentNote,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the highlighted fields');
      return;
    }
    try {
      await create.mutateAsync(parsed.data);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div role="dialog" aria-modal="true" aria-label="Purchase Medicine" className="relative w-full max-w-6xl rounded-md bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-semibold">Purchase Medicine</h2>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} placeholder="Select Supplier" options={(suppliers?.data ?? []).map((s) => ({ value: s.id, label: s.name }))} className="w-56" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-fg-muted">Purchase Date</span>
            <TextInput type="datetime-local" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="h-8 w-52" />
            <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-border/50">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
          {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          <Field label="Bill No">
            <TextInput value={billNo} onChange={(e) => setBillNo(e.target.value)} className="max-w-xs" />
          </Field>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                  <th className="px-2 py-2 font-semibold">Category</th>
                  <th className="px-2 py-2 font-semibold">Medicine</th>
                  <th className="px-2 py-2 font-semibold">Batch No</th>
                  <th className="px-2 py-2 font-semibold">Expiry Month</th>
                  <th className="px-2 py-2 font-semibold">MRP</th>
                  <th className="px-2 py-2 font-semibold">Batch Amt</th>
                  <th className="px-2 py-2 font-semibold">Sale Price</th>
                  <th className="px-2 py-2 font-semibold">Pack Qty</th>
                  <th className="px-2 py-2 font-semibold">Qty</th>
                  <th className="px-2 py-2 font-semibold">Purchase Price</th>
                  <th className="px-2 py-2 font-semibold">Tax %</th>
                  <th className="px-2 py-2 font-semibold">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const opts = (medicines?.data ?? []).filter((m) => !l.categoryId || m.categoryId === l.categoryId);
                  return (
                    <tr key={i} className="border-b border-border/60 last:border-0">
                      <td className="px-1 py-1"><Select value={l.categoryId ?? ''} onChange={(e) => update(i, { categoryId: e.target.value || null, medicineId: '' })} placeholder="Select" options={(categories?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} className="h-8 w-32" /></td>
                      <td className="px-1 py-1"><Select value={l.medicineId} onChange={(e) => update(i, { medicineId: e.target.value })} placeholder="Select" options={opts.map((m) => ({ value: m.id, label: m.name }))} className="h-8 w-36" /></td>
                      <td className="px-1 py-1"><input value={l.batchNo} onChange={(e) => update(i, { batchNo: e.target.value })} className="h-8 w-24 rounded-sm border border-border bg-surface px-2 text-sm" /></td>
                      <td className="px-1 py-1"><input type="month" value={l.expiryMonth} onChange={(e) => update(i, { expiryMonth: e.target.value })} className="h-8 w-32 rounded-sm border border-border bg-surface px-2 text-sm" /></td>
                      <td className="px-1 py-1"><input type="number" value={l.mrp || ''} onChange={(e) => update(i, { mrp: Number(e.target.value) })} className="h-8 w-20 rounded-sm border border-border bg-surface px-2 text-sm tabular" /></td>
                      <td className="px-1 py-1"><input type="number" value={l.batchAmount || ''} onChange={(e) => update(i, { batchAmount: Number(e.target.value) })} className="h-8 w-20 rounded-sm border border-border bg-surface px-2 text-sm tabular" /></td>
                      <td className="px-1 py-1"><input type="number" value={l.salePrice || ''} onChange={(e) => update(i, { salePrice: Number(e.target.value) })} className="h-8 w-20 rounded-sm border border-border bg-surface px-2 text-sm tabular" /></td>
                      <td className="px-1 py-1"><input type="number" value={l.packingQty ?? ''} onChange={(e) => update(i, { packingQty: e.target.value ? Number(e.target.value) : undefined })} className="h-8 w-16 rounded-sm border border-border bg-surface px-2 text-sm tabular" /></td>
                      <td className="px-1 py-1"><input type="number" value={l.quantity || ''} onChange={(e) => update(i, { quantity: Number(e.target.value) })} className="h-8 w-16 rounded-sm border border-border bg-surface px-2 text-sm tabular" /></td>
                      <td className="px-1 py-1"><input type="number" value={l.purchasePrice || ''} onChange={(e) => update(i, { purchasePrice: Number(e.target.value) })} className="h-8 w-20 rounded-sm border border-border bg-surface px-2 text-sm tabular" /></td>
                      <td className="px-1 py-1"><input type="number" value={l.taxPercent || ''} onChange={(e) => update(i, { taxPercent: Number(e.target.value) })} className="h-8 w-16 rounded-sm border border-border bg-surface px-2 text-sm tabular" /></td>
                      <td className="px-2 py-1 text-right tabular font-medium">{lineAmount(l).toFixed(2)}</td>
                      <td className="px-1 py-1">
                        <button type="button" onClick={() => setLines((rs) => rs.filter((_, idx) => idx !== i))} className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setLines((rs) => [...rs, { ...EMPTY_LINE }])}>
            <Plus className="h-4 w-4" /> Add Medicine
          </Button>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <Field label="Note">
                <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
            </div>
            <div className="space-y-2 rounded-md border border-border p-4 text-sm">
              <SummaryRow label="Total ($)" value={subtotal.toFixed(2)} />
              <div className="flex items-center justify-between gap-2">
                <span className="text-fg-muted">Discount (%)</span>
                <input type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} className="h-8 w-28 rounded-sm border border-border bg-surface px-2 text-right text-sm tabular" />
              </div>
              <SummaryRow label="Discount ($)" value={discount.toFixed(2)} />
              <SummaryRow label="Tax ($)" value={tax.toFixed(2)} />
              <SummaryRow label="Net Amount ($)" value={netAmount.toFixed(2)} bold />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Field label="Payment Mode">
                  <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} options={['cash', 'card', 'upi', 'cheque', 'bank_transfer'].map((m) => ({ value: m, label: m }))} />
                </Field>
                <Field label="Payment Amount">
                  <TextInput type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                </Field>
              </div>
              <Field label="Payment Note">
                <TextInput value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} loading={create.isPending}>
            Save
          </Button>
        </div>
      </div>
    </div>
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
