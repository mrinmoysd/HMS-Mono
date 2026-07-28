'use client';

import { useState } from 'react';
import { X, Pencil, Trash2, Plus } from 'lucide-react';
import { medicineBadStockSchema } from '@smart-hospital/shared';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { useMedicine, useCreateBadStock, useDeleteMedicines } from '@/lib/hooks/use-departments';
import { MedicineForm } from './medicine-form';
import { ApiRequestError } from '@/lib/api';

type Tab = 'stock' | 'bad-stock';

export function MedicineDetailsModal({ id, open, onClose, canEdit, canDelete }: { id: string | null; open: boolean; onClose: () => void; canEdit: boolean; canDelete: boolean }) {
  const { data, isLoading } = useMedicine(open ? id : null);
  const del = useDeleteMedicines();
  const [tab, setTab] = useState<Tab>('stock');
  const [editing, setEditing] = useState(false);
  const [addingBadStock, setAddingBadStock] = useState(false);

  if (!open) return null;

  async function onDelete() {
    if (!data) return;
    if (confirm(`Delete medicine "${data.name}"?`)) {
      await del.mutateAsync({ ids: [data.id] });
      onClose();
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
        <div role="dialog" aria-modal="true" aria-label="Medicine Details" className="relative z-10 w-full max-w-4xl rounded-md bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-base font-semibold">Medicine Details</h2>
            <div className="flex items-center gap-2">
              {data && canEdit && (
                <button onClick={() => setEditing(true)} aria-label="Edit" className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              {data && canDelete && (
                <button onClick={onDelete} aria-label="Delete" disabled={del.isPending} className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger disabled:opacity-40">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-border/50">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-5">
            {isLoading || !data ? (
              <p className="py-12 text-center text-sm text-fg-muted">Loading…</p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                  <Row label="Medicine Name" value={data.name} />
                  <Row label="Medicine Category" value={data.categoryName ?? '—'} />
                  <Row label="Medicine Company" value={data.companyName ?? '—'} />
                  <Row label="Medicine Composition" value={data.composition ?? '—'} />
                  <Row label="Medicine Group" value={data.groupName ?? '—'} />
                  <Row label="Unit" value={data.unitName ?? '—'} />
                  <Row label="Min Level" value={data.minLevel ?? '—'} />
                  <Row label="Re-Order Level" value={data.reorderLevel ?? '—'} />
                  <Row label="Tax(%)" value={data.taxPercent ?? '—'} />
                  <Row label="Box/Packing" value={data.boxPacking ?? '—'} />
                  <Row label="VAT A/C" value={data.vatAc ?? '—'} />
                  <Row label="Rack Number" value={data.rackNumber ?? '—'} />
                  <Row label="Note" value={data.note ?? '—'} />
                  <Row
                    label="Available Qty"
                    value={
                      <span className={data.isOutOfStock ? 'text-danger' : data.needsReorder ? 'text-warning' : ''}>
                        {data.stock} {data.isOutOfStock ? '(Out of Stock)' : data.needsReorder ? '(Reorder)' : ''}
                      </span>
                    }
                  />
                </div>

                <div className="mt-5 flex gap-1 border-b border-border">
                  {(['stock', 'bad-stock'] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${tab === t ? 'border-primary text-primary' : 'border-transparent text-fg-muted hover:text-fg'}`}
                    >
                      {t === 'stock' ? 'Stock' : 'Bad Stock'}
                    </button>
                  ))}
                </div>

                {tab === 'stock' && (
                  <div className="mt-3 overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                          <th className="px-3 py-2 font-semibold">Inward Date</th>
                          <th className="px-3 py-2 font-semibold">Batch No</th>
                          <th className="px-3 py-2 font-semibold">Purchase No</th>
                          <th className="px-3 py-2 font-semibold">Expiry Date</th>
                          <th className="px-3 py-2 font-semibold">Packing Qty</th>
                          <th className="px-3 py-2 font-semibold">Purchase Rate</th>
                          <th className="px-3 py-2 font-semibold">Amount</th>
                          <th className="px-3 py-2 font-semibold">Quantity</th>
                          <th className="px-3 py-2 font-semibold">MRP</th>
                          <th className="px-3 py-2 font-semibold">Sale Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.stockBatches.length === 0 && (
                          <tr><td colSpan={10} className="px-3 py-8 text-center text-fg-muted">No stock batches yet</td></tr>
                        )}
                        {data.stockBatches.map((b) => (
                          <tr key={b.id} className="border-b border-border/60 last:border-0">
                            <td className="px-3 py-2">{new Date(b.inwardDate).toLocaleDateString()}</td>
                            <td className="px-3 py-2">{b.batchNo}</td>
                            <td className="px-3 py-2">{b.purchaseNo}</td>
                            <td className="px-3 py-2">{new Date(b.expiryDate).toLocaleDateString([], { month: 'short', year: 'numeric' })}</td>
                            <td className="px-3 py-2">{b.packingQty ?? '—'}</td>
                            <td className="px-3 py-2 tabular">{b.purchaseRate.toFixed(2)}</td>
                            <td className="px-3 py-2 tabular">{b.amount.toFixed(2)}</td>
                            <td className="px-3 py-2 tabular">{b.quantity}</td>
                            <td className="px-3 py-2 tabular">{b.mrp.toFixed(2)}</td>
                            <td className="px-3 py-2 tabular">{b.salePrice.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {tab === 'bad-stock' && (
                  <div className="mt-3 space-y-3">
                    {canEdit && (
                      <div className="flex justify-end">
                        <Button size="sm" onClick={() => setAddingBadStock(true)}>
                          <Plus className="h-4 w-4" /> Add Bad Stock
                        </Button>
                      </div>
                    )}
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                            <th className="px-3 py-2 font-semibold">Batch No</th>
                            <th className="px-3 py-2 font-semibold">Expiry Date</th>
                            <th className="px-3 py-2 font-semibold">Outward Date</th>
                            <th className="px-3 py-2 font-semibold">Qty</th>
                            <th className="px-3 py-2 font-semibold">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.badStocks.length === 0 && (
                            <tr><td colSpan={5} className="px-3 py-8 text-center text-fg-muted">No bad stock recorded</td></tr>
                          )}
                          {data.badStocks.map((b) => (
                            <tr key={b.id} className="border-b border-border/60 last:border-0">
                              <td className="px-3 py-2">{b.batchNo ?? '—'}</td>
                              <td className="px-3 py-2">{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}</td>
                              <td className="px-3 py-2">{new Date(b.outwardDate).toLocaleDateString()}</td>
                              <td className="px-3 py-2 tabular">{b.qty}</td>
                              <td className="px-3 py-2 text-fg-muted">{b.note ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {data && <MedicineForm open={editing} onClose={() => setEditing(false)} medicine={data} />}
      {data && <AddBadStockDrawer medicineId={data.id} batches={data.stockBatches} open={addingBadStock} onClose={() => setAddingBadStock(false)} />}
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-2">
      <span className="text-fg-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function AddBadStockDrawer({
  medicineId,
  batches,
  open,
  onClose,
}: {
  medicineId: string;
  batches: { id: string; batchNo: string; expiryDate: string }[];
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateBadStock(medicineId);
  const [purchaseItemId, setPurchaseItemId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [outwardDate, setOutwardDate] = useState(new Date().toISOString().slice(0, 10));
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  function pickBatch(id: string) {
    setPurchaseItemId(id);
    const b = batches.find((x) => x.id === id);
    if (b) setExpiryDate(b.expiryDate.slice(0, 10));
  }

  async function submit() {
    setApiError(null);
    const parsed = medicineBadStockSchema.safeParse({ purchaseItemId, expiryDate, outwardDate, qty, note });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const i of parsed.error.issues) fe[String(i.path[0] ?? '')] = i.message;
      setErrors(fe);
      return;
    }
    try {
      await create.mutateAsync(parsed.data);
      setPurchaseItemId(''); setExpiryDate(''); setQty(''); setNote('');
      onClose();
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  return (
    <FormDrawer open={open} title="Add Bad Stock" onClose={onClose} onSubmit={submit} submitting={create.isPending}>
      {apiError && (
        <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
          {apiError}
        </p>
      )}
      <div className="space-y-4">
        <Field label="Batch No" required error={errors.purchaseItemId}>
          <Select value={purchaseItemId} onChange={(e) => pickBatch(e.target.value)} placeholder="Select…" options={batches.map((b) => ({ value: b.id, label: b.batchNo }))} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Expiry Date" required error={errors.expiryDate}>
            <TextInput type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </Field>
          <Field label="Outward Date" required error={errors.outwardDate}>
            <TextInput type="date" value={outwardDate} onChange={(e) => setOutwardDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Qty" required error={errors.qty}>
          <TextInput type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label="Note">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </FormDrawer>
  );
}
