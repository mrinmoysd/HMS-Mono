'use client';

import type { BillingSummaryRow } from '@smart-hospital/shared';

const MODULE_LABEL: Record<string, string> = {
  opd: 'OPD',
  ipd: 'IPD',
  pharmacy: 'Pharmacy',
  pathology: 'Pathology',
  radiology: 'Radiology',
  blood: 'Blood Bank',
  ambulance: 'Ambulance',
  appointment: 'Appointment',
};

/** Per-department billed vs paid progress bars for a case (Phase C3). */
export function BillingSummaryBars({ rows }: { rows: BillingSummaryRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-fg-muted">No charges billed yet.</p>;
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = r.billed > 0 ? Math.min(100, (r.paid / r.billed) * 100) : 0;
        return (
          <div key={r.module}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium">{MODULE_LABEL[r.module] ?? r.module}</span>
              <span className="tabular text-fg-muted">
                <b className="text-success">{r.paid.toFixed(2)}</b> / {r.billed.toFixed(2)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border/60">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
