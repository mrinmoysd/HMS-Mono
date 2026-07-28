'use client';

import { Loader2 } from 'lucide-react';
import { useInvoices, usePay } from '@/lib/hooks';

export default function BillingPage() {
  const invoices = useInvoices();
  const pay = usePay();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">My Bills</h1>
      <div className="space-y-2">
        {(invoices.data ?? []).map((i) => (
          <div key={i.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{i.billNo}</p>
                <p className="text-xs uppercase text-fg-muted">{i.module}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${i.status === 'paid' ? 'bg-success/10 text-success' : i.status === 'partial' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>{i.status}</span>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-sm">
                <p className="text-fg-muted">Net <b className="text-fg tabular">{i.netAmount.toFixed(2)}</b> · Paid <b className="text-fg tabular">{i.paid.toFixed(2)}</b></p>
                {i.balance > 0 && <p className="text-warning">Balance {i.balance.toFixed(2)}</p>}
              </div>
              {i.balance > 0 && (
                <button onClick={() => pay.mutate({ id: i.id, amount: i.balance })} disabled={pay.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-fg disabled:opacity-60">
                  {pay.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Pay {i.balance.toFixed(2)}
                </button>
              )}
            </div>
          </div>
        ))}
        {invoices.data && invoices.data.length === 0 && <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-fg-muted">No bills yet.</p>}
      </div>
    </div>
  );
}
