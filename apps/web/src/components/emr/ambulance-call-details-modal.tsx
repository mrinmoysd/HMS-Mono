'use client';

import { Printer, X } from 'lucide-react';
import { useAmbulanceCall } from '@/lib/hooks/use-finance';
import { printAmbulanceBill } from '@/lib/print';

/** "Bill Details" for an Ambulance Call — full field grid matching the demo. */
export function AmbulanceCallDetailsModal({ id, open, onClose }: { id: string | null; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useAmbulanceCall(open ? id : null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div role="dialog" aria-modal="true" aria-label="Bill Details" className="relative z-10 w-full max-w-4xl rounded-md bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">Bill Details</h2>
          <div className="flex items-center gap-2">
            {data && (
              <button onClick={() => printAmbulanceBill(data)} aria-label="Print" className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                <Printer className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-border/50">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
          {isLoading || !data ? (
            <p className="py-12 text-center text-sm text-fg-muted">Loading…</p>
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-3">
              <Row label="Bill No" value={data.billNo} />
              <Row label="Date" value={new Date(data.date).toLocaleString()} />
              <Row label="Total" value={`#${data.subtotal.toFixed(2)}`} />

              <Row label="Patient Name" value={data.patientName} />
              <Row label="Driver Name" value={data.driverName ?? '—'} />
              <Row label="Total Discount" value={`#${data.discount.toFixed(2)}`} />

              <Row label="Vehicle Number" value={data.vehicleNo} />
              <Row label="Vehicle Model" value={data.vehicleModel ?? '—'} />
              <Row label="Total Tax" value={`#${data.tax.toFixed(2)}`} />

              <Row label="Case ID" value={data.caseNo ?? '—'} />
              <Row label="Charge Category" value={data.chargeCategoryName ?? '—'} />
              <Row label="Net Amount" value={`#${data.netAmount.toFixed(2)}`} />

              <Row label="Charge Name" value={data.chargeName ?? '—'} />
              <Row label="Collected By" value={data.createdByName ?? '—'} />
              <Row label="Total Deposit" value={`#${data.paid.toFixed(2)}`} />

              <Row label="Patient Address" value={data.patientAddress ?? '—'} />
              <div />
              <Row label="Due Amount" value={`#${data.balance.toFixed(2)}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-1.5">
      <span className="text-fg-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
