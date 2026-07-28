'use client';

import { Printer, X } from 'lucide-react';
import { useInvoice } from '@/lib/hooks/use-clinical';
import { printPharmacyBill } from '@/lib/print';

/** Branded "Bill Details" preview for a Pharmacy sale invoice. */
export function PharmacyBillDetailsModal({ id, open, onClose }: { id: string | null; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useInvoice(open ? id : null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Bill Details" className="relative z-10 w-full max-w-3xl rounded-md bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">Bill Details</h2>
          <div className="flex items-center gap-2">
            {data && (
              <button onClick={() => printPharmacyBill(data)} aria-label="Print" className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                <Printer className="h-4 w-4" />
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
            <div className="rounded-md border border-border p-5">
              <div className="border-b-2 border-primary pb-3">
                <p className="text-lg font-semibold text-primary">Smart Hospital &amp; Research Center</p>
                <p className="text-xs text-fg-muted">Pharmacy Bill</p>
              </div>
              <div className="mt-3 flex justify-between text-sm">
                <span>Bill No <b>{data.billNo}</b></span>
                <span>Date: {new Date(data.billDate).toLocaleString()}</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                <Row label="Name" value={data.patientName} />
                <Row label="Phone" value={data.patientPhone ?? '—'} />
                <Row label="Doctor" value={data.consultantName ?? '—'} />
                <Row label="Case ID" value={data.caseNo ?? '—'} />
              </div>

              <div className="mt-4 overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                      <th className="px-3 py-2 font-semibold">Medicine Name</th>
                      <th className="px-3 py-2 font-semibold">Qty</th>
                      <th className="px-3 py-2 font-semibold">Discount %</th>
                      <th className="px-3 py-2 font-semibold">Tax %</th>
                      <th className="px-3 py-2 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.items ?? []).map((it) => (
                      <tr key={it.id} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2 font-medium">{it.name}</td>
                        <td className="px-3 py-2 tabular">{it.qty}</td>
                        <td className="px-3 py-2 tabular">{it.discountPct}</td>
                        <td className="px-3 py-2 tabular">{it.taxPct}</td>
                        <td className="px-3 py-2 text-right tabular font-medium">{it.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end">
                <div className="w-full max-w-xs space-y-1 text-sm">
                  <SummaryRow label="Total" value={data.subtotal.toFixed(2)} />
                  <SummaryRow label="Total Discount" value={data.discount.toFixed(2)} />
                  <SummaryRow label="Total Tax" value={data.tax.toFixed(2)} />
                  <SummaryRow label="Net Amount" value={data.netAmount.toFixed(2)} bold />
                  <SummaryRow label="Total Paid" value={data.paid.toFixed(2)} />
                  <SummaryRow label="Due" value={data.balance.toFixed(2)} />
                  <p className="pt-2 text-fg-muted">Collected By: <span className="font-medium text-fg">{data.createdByName ?? '—'}</span></p>
                </div>
              </div>

              <p className="mt-6 text-center text-xs text-fg-muted">This invoice is printed electronically, so no signature is required</p>
            </div>
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

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-fg-muted">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
