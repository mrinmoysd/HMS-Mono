'use client';

import type { BillingSummaryRow } from '@smart-hospital/shared';
import { Barcode } from '@/components/ui/barcode';
import { QrCode } from '@/components/ui/qr-code';
import { BillingSummaryBars } from './billing-summary-bars';

/**
 * The Overview tab's identity grid plus the Payment/Billing bars
 * (blueprint §7.3 tab 1 and §8.3 tab 1 — the same block, one extra row for
 * IPD's admission date and bed).
 *
 * The bars are the reason this tab exists: they answer "what does this patient
 * still owe, and to which department" at a glance, which is the question the
 * front desk asks before anything else.
 */
export interface OverviewField {
  label: string;
  value: string | null | undefined;
}

/**
 * The reference always shows six bars, zero or not: an empty Pathology bar
 * says "nothing billed", where a missing one just looks like the row was lost.
 * `encounterModule` is 'opd' or 'ipd' — the encounter's own bar comes first.
 */
function sixBars(encounterModule: string, rows: BillingSummaryRow[]): BillingSummaryRow[] {
  const order = [encounterModule, 'pharmacy', 'pathology', 'radiology', 'blood', 'ambulance'];
  const byModule = new Map(rows.map((r) => [r.module, r]));
  return order.map((m) => byModule.get(m) ?? { module: m, billed: 0, paid: 0 });
}

export function EncounterOverview({
  fields,
  barcodeValue,
  encounterModule,
  billingSummary,
  aside,
}: {
  fields: OverviewField[];
  /** Patient or encounter number — what the wristband and the file carry. */
  barcodeValue: string;
  encounterModule: 'opd' | 'ipd';
  billingSummary: BillingSummaryRow[];
  /** Extra panel beside the bars — IPD passes its credit donut. */
  aside?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-6">
          {/* min-w keeps the grid from being squeezed to ellipses by the
              barcode; below that width the codes wrap underneath instead. */}
          <dl className="grid min-w-[22rem] flex-1 grid-cols-2 gap-x-8 gap-y-2.5 text-sm md:grid-cols-3">
            {fields.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="text-xs text-fg-muted">{f.label}</dt>
                <dd className="break-words font-medium">{f.value || '—'}</dd>
              </div>
            ))}
          </dl>
          <div className="flex shrink-0 items-end gap-4">
            <div className="text-center">
              <Barcode value={barcodeValue} height={40} />
              <p className="mt-1 text-2xs text-fg-muted">Barcode</p>
            </div>
            <div className="text-center">
              <QrCode value={barcodeValue} size={72} />
              <p className="mt-1 text-2xs text-fg-muted">QR Code</p>
            </div>
          </div>
        </div>
      </div>

      <div className={aside ? 'grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto]' : ''}>
        <div className="rounded-md border border-border bg-surface p-5">
          <p className="mb-3 text-sm font-semibold">Payment / Billing</p>
          <BillingSummaryBars rows={sixBars(encounterModule, billingSummary)} />
        </div>
        {aside}
      </div>
    </div>
  );
}
