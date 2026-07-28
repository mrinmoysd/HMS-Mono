'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { TextInput } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { useBatchTpaDetail, useUpdateBatchTpaSchedule } from '@/lib/hooks/use-departments';
import { useAbility } from '@/lib/auth-store';

/** "Medicine TPA Charges" — per-batch TPA rate scheduling (mirrors Hospital Charges' schedule panel). */
export function PurchaseTpaChargesModal({ purchaseItemId, open, onClose }: { purchaseItemId: string | null; open: boolean; onClose: () => void }) {
  const ability = useAbility();
  const canEdit = ability.can('pharmacy', 'edit');
  const { data, isLoading } = useBatchTpaDetail(open ? purchaseItemId : null);
  const updateSchedule = useUpdateBatchTpaSchedule();
  const [rates, setRates] = useState<Record<string, string>>({});
  const [applyAll, setApplyAll] = useState('');

  useEffect(() => {
    if (!data) return;
    setRates(Object.fromEntries(data.schedule.map((s) => [s.tpaId, s.rate != null ? String(s.rate) : ''])));
  }, [data]);

  if (!open) return null;

  async function save() {
    if (!data || !purchaseItemId) return;
    const entries = data.schedule
      .map((s) => ({ tpaId: s.tpaId, rate: rates[s.tpaId] }))
      .filter((e) => e.rate !== undefined && e.rate !== '')
      .map((e) => ({ tpaId: e.tpaId, rate: Number(e.rate) }));
    await updateSchedule.mutateAsync({ purchaseItemId, input: { entries } });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Medicine TPA Charges" className="relative z-10 w-full max-w-4xl rounded-md bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">Medicine TPA Charges</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-border/50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
          {isLoading || !data ? (
            <p className="py-12 text-center text-sm text-fg-muted">Loading…</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-3">
                <Row label="Pharmacy Purchase No" value={data.purchase.purchaseNo} />
                <Row label="Bill No" value={data.purchase.billNo ?? '—'} />
                <Row label="Purchase Date" value={new Date(data.purchase.purchaseDate).toLocaleString()} />
                <Row label="Supplier Name" value={data.purchase.supplierName ?? '—'} />
                <Row label="Supplier Contact" value={data.purchase.supplierContact ?? '—'} />
                <Row label="Contact Person" value={data.purchase.supplierContactPerson ?? '—'} />
                <Row label="Contact Person Phone" value={data.purchase.supplierContactPhone ?? '—'} />
                <Row label="Drug License Number" value={data.purchase.supplierDrugLicenseNumber ?? '—'} />
                <Row label="Address" value={data.purchase.supplierAddress ?? '—'} />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Medicine</h3>
                  <div className="rounded-md border border-border bg-bg/40 p-3 text-sm">
                    <p className="font-medium">{data.purchaseItem.medicineName}</p>
                    <p className="text-fg-muted">{data.purchaseItem.categoryName ?? '—'}</p>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Purchase Details</h3>
                  <div className="space-y-1 text-sm">
                    <Row label="Batch No" value={data.purchaseItem.batchNo} />
                    <Row label="Expiry Month" value={new Date(data.purchaseItem.expiryMonth).toLocaleDateString([], { month: 'short', year: 'numeric' })} />
                    <Row label="MRP" value={data.purchaseItem.mrp.toFixed(2)} />
                    <Row label="Batch Amount" value={data.purchaseItem.batchAmount.toFixed(2)} />
                    <Row label="Sale Price" value={data.purchaseItem.salePrice.toFixed(2)} />
                    <Row label="Packing Qty" value={data.purchaseItem.packingQty ?? '—'} />
                    <Row label="Quantity" value={data.purchaseItem.quantity} />
                    <Row label="Tax (%)" value={data.purchaseItem.taxPercent.toFixed(2)} />
                    <Row label="Purchase Price" value={data.purchaseItem.purchasePrice.toFixed(2)} />
                    <Row label="Amount" value={data.purchaseItem.amount.toFixed(2)} />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Scheduled Charges For TPA</h3>
                  </div>
                  {canEdit && data.schedule.length > 0 && (
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs text-fg-muted">Sale Price ({data.purchaseItem.salePrice.toFixed(2)})</span>
                      <TextInput type="number" value={applyAll} onChange={(e) => setApplyAll(e.target.value)} placeholder="Rate" className="h-8 w-24" />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (applyAll === '') return;
                          setRates(Object.fromEntries(data.schedule.map((s) => [s.tpaId, applyAll])));
                        }}
                      >
                        Apply To All
                      </Button>
                    </div>
                  )}
                  {data.schedule.length === 0 ? (
                    <p className="text-sm text-fg-muted">No TPAs configured yet.</p>
                  ) : (
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {data.schedule.map((s) => (
                        <div key={s.tpaId} className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate">{s.tpaName}</span>
                          <TextInput
                            type="number"
                            disabled={!canEdit}
                            value={rates[s.tpaId] ?? ''}
                            onChange={(e) => setRates((prev) => ({ ...prev, [s.tpaId]: e.target.value }))}
                            className="h-8 w-28 shrink-0"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          {canEdit && data && data.schedule.length > 0 && (
            <Button type="button" loading={updateSchedule.isPending} onClick={save}>
              Save
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-1">
      <span className="text-fg-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
