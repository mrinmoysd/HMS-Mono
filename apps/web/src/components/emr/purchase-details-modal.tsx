'use client';

import { useState } from 'react';
import { CreditCard, Printer } from 'lucide-react';
import { useMedicinePurchase } from '@/lib/hooks/use-departments';
import { Modal } from '@/components/ui/modal';
import { PurchaseTpaChargesModal } from './purchase-tpa-charges-modal';

/** Read-only "Purchase Details" view (Medicine Purchase List row action). Each line item can open its own "TPA Charges" schedule. */
export function PurchaseDetailsModal({ id, open, onClose }: { id: string | null; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useMedicinePurchase(open ? id : null);
  const [tpaItemId, setTpaItemId] = useState<string | null>(null);

  if (!open) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title="Purchase Details"
      size="xl"
      headerActions={
        <>
          <button onClick={() => window.print()} aria-label="Print" className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
              <Printer className="h-4 w-4" />
            </button>
        </>
      }
    >
      {isLoading || !data ? (
        <p className="py-12 text-center text-sm text-fg-muted">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-3">
            <Row label="Pharmacy Purchase No" value={data.purchaseNo} />
            <Row label="Bill No" value={data.billNo ?? '—'} />
            <Row label="Purchase Date" value={new Date(data.purchaseDate).toLocaleString()} />
            <Row label="Supplier Name" value={data.supplierName ?? '—'} />
            <Row label="Supplier Contact" value={data.supplierContact ?? '—'} />
            <Row label="Contact Person" value={data.supplierContactPerson ?? '—'} />
            <Row label="Contact Person Phone" value={data.supplierContactPhone ?? '—'} />
            <Row label="Drug License Number" value={data.supplierDrugLicenseNumber ?? '—'} />
            <Row label="Address" value={data.supplierAddress ?? '—'} />
          </div>

          <div className="mt-4 overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                  <th className="px-3 py-2 font-semibold">Category</th>
                  <th className="px-3 py-2 font-semibold">Medicine</th>
                  <th className="px-3 py-2 font-semibold">Batch No</th>
                  <th className="px-3 py-2 font-semibold">Expiry</th>
                  <th className="px-3 py-2 font-semibold">MRP</th>
                  <th className="px-3 py-2 font-semibold">Batch Amt</th>
                  <th className="px-3 py-2 font-semibold">Sale Price</th>
                  <th className="px-3 py-2 font-semibold">Pack Qty</th>
                  <th className="px-3 py-2 font-semibold">Qty</th>
                  <th className="px-3 py-2 font-semibold">Tax %</th>
                  <th className="px-3 py-2 font-semibold">Purchase Price</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((it) => (
                  <tr key={it.id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">{it.categoryName ?? '—'}</td>
                    <td className="px-3 py-2 font-medium">{it.medicineName}</td>
                    <td className="px-3 py-2">{it.batchNo}</td>
                    <td className="px-3 py-2">{new Date(it.expiryMonth).toLocaleDateString([], { month: 'short', year: 'numeric' })}</td>
                    <td className="px-3 py-2 tabular">{it.mrp.toFixed(2)}</td>
                    <td className="px-3 py-2 tabular">{it.batchAmount.toFixed(2)}</td>
                    <td className="px-3 py-2 tabular">{it.salePrice.toFixed(2)}</td>
                    <td className="px-3 py-2 tabular">{it.packingQty ?? '—'}</td>
                    <td className="px-3 py-2 tabular">{it.quantity}</td>
                    <td className="px-3 py-2 tabular">{it.taxPercent.toFixed(2)}</td>
                    <td className="px-3 py-2 tabular">{it.purchasePrice.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right tabular font-medium">{it.amount.toFixed(2)}</td>
                    <td className="px-2 py-2">
                      <button onClick={() => setTpaItemId(it.id)} aria-label="TPA Charges" title="TPA Charges" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                        <CreditCard className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-xs space-y-1 text-sm">
              <SummaryRow label="Total ($)" value={data.total.toFixed(2)} />
              <SummaryRow label="Discount" value={`${data.discount.toFixed(2)}`} />
              <SummaryRow label="Tax ($)" value={data.tax.toFixed(2)} />
              <SummaryRow label="Net Amount ($)" value={data.netAmount.toFixed(2)} bold />
              <p className="pt-2 text-fg-muted">Payment Mode: <span className="font-medium text-fg">{data.paymentMode ?? '—'}</span></p>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-1.5">
      <span className="text-fg-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
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
