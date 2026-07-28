'use client';

import { useEffect } from 'react';
import { X, Printer, Loader2 } from 'lucide-react';
import type { PatientReportDto, PatientReportVisit } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Barcode } from '@/components/ui/barcode';
import { usePatientReport } from '@/lib/hooks/use-emr';
import { printDocument, type PrintSection } from '@/lib/print';
import { formatAge } from '@/lib/utils';

const MODULE_LABEL: Record<string, string> = {
  pharmacy: 'Pharmacy Details',
  pathology: 'Pathology Details',
  radiology: 'Radiology Details',
  blood: 'Blood Bank Details',
  ambulance: 'Ambulance Details',
};

/** Consolidated Patient Details report modal (the demo's ☰ "show" action). */
export function PatientReportModal({ patientId, open, onClose }: { patientId: string; open: boolean; onClose: () => void }) {
  const { data, isLoading } = usePatientReport(patientId, open);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function printReport() {
    if (!data) return;
    const h = data.header;
    const visitSection = (title: string, rows: PatientReportVisit[]): PrintSection => ({
      heading: title,
      table: {
        headers: ['No', 'Case ID', 'Date', 'Doctor', 'Symptoms', 'Findings'],
        rows: rows.length
          ? rows.map((v) => [v.no, v.caseNo ?? '', new Date(v.date).toLocaleDateString(), v.doctorName, v.symptoms ?? '', v.findings ?? ''])
          : [['No records', '', '', '', '', '']],
      },
    });
    const sections: PrintSection[] = [
      visitSection('OPD Details', data.opd),
      visitSection('IPD Details', data.ipd),
      ...data.bills.map((g): PrintSection => ({
        heading: MODULE_LABEL[g.module] ?? g.module,
        table: {
          headers: ['Bill No', 'Case ID', 'Date', 'Amount', 'Discount', 'Tax', 'Paid', 'Refund', 'Balance'],
          rows: [
            ...g.rows.map((r) => [r.billNo, r.caseNo ?? '', new Date(r.date).toLocaleDateString(), r.amount.toFixed(2), r.discount.toFixed(2), r.tax.toFixed(2), r.paid.toFixed(2), r.refund.toFixed(2), r.balance.toFixed(2)]),
            ['Total', '', '', g.totals.amount.toFixed(2), g.totals.discount.toFixed(2), g.totals.tax.toFixed(2), g.totals.paid.toFixed(2), g.totals.refund.toFixed(2), g.totals.balance.toFixed(2)],
          ],
        },
      })),
    ];
    printDocument({
      documentTitle: 'Patient Details',
      heading: `Patient Visit Report — ${h.name} (${h.patientNo})`,
      meta: [
        ['Gender', h.gender ?? '—'], ['Age', formatAge(h.age)], ['Marital', h.maritalStatus ?? '—'],
        ['Blood Group', h.bloodGroup ?? '—'], ['Phone', h.phone ?? '—'], ['Address', h.address ?? '—'],
        ...(h.tpaName ? [['TPA', `${h.tpaName}${h.tpaIdNo ? ` · ${h.tpaIdNo}` : ''}`] as [string, string]] : []),
        ...(h.allergies ? [['Allergies', h.allergies] as [string, string]] : []),
      ],
      sections,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Patient Details" className="relative z-10 w-full max-w-5xl rounded-md bg-surface shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-5 py-3">
          <h2 className="text-base font-semibold">Patient Details</h2>
          <div className="flex items-center gap-2">
            {data && <Button size="sm" variant="secondary" onClick={printReport}><Printer className="h-4 w-4" /> Print</Button>}
            <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-border/50"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-5">
          {isLoading || !data ? (
            <div className="flex items-center justify-center py-16 text-fg-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-border p-4">
                <div className="text-sm">
                  <p className="text-lg font-semibold">{data.header.name} <span className="text-fg-muted">({data.header.patientNo})</span></p>
                  <table className="mt-1">
                    <tbody className="[&_td]:py-0.5 [&_td:first-child]:pr-4 [&_td:first-child]:text-fg-muted">
                      <tr><td>Gender</td><td>{data.header.gender ?? '—'}</td><td className="pl-6 pr-4 text-fg-muted">Age</td><td>{formatAge(data.header.age)}</td></tr>
                      <tr><td>Marital</td><td>{data.header.maritalStatus ?? '—'}</td><td className="pl-6 pr-4 text-fg-muted">Blood</td><td>{data.header.bloodGroup ?? '—'}</td></tr>
                      <tr><td>Phone</td><td>{data.header.phone ?? '—'}</td><td className="pl-6 pr-4 text-fg-muted">Guardian</td><td>{data.header.guardianName ?? '—'}</td></tr>
                      <tr><td>Address</td><td colSpan={3}>{data.header.address ?? '—'}</td></tr>
                      {data.header.tpaName && <tr><td>TPA</td><td colSpan={3}>{data.header.tpaName}{data.header.tpaIdNo ? ` · ${data.header.tpaIdNo}` : ''}</td></tr>}
                      {data.header.allergies && <tr><td>Allergies</td><td colSpan={3}>{data.header.allergies}</td></tr>}
                    </tbody>
                  </table>
                </div>
                <Barcode value={data.header.patientNo} height={40} />
              </div>

              <VisitTable title="OPD Details" rows={data.opd} noLabel="OPD No" />
              <VisitTable title="IPD Details" rows={data.ipd} noLabel="IPD No" />

              {data.bills.map((g) => (
                <div key={g.module}>
                  <h3 className="mb-2 text-sm font-semibold">{MODULE_LABEL[g.module] ?? g.module}</h3>
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-bg text-left text-xs uppercase text-fg-muted">
                          <th className="px-3 py-2 font-semibold">Bill No</th><th className="px-3 py-2 font-semibold">Case ID</th><th className="px-3 py-2 font-semibold">Date</th>
                          <th className="px-3 py-2 text-right font-semibold">Amount</th><th className="px-3 py-2 text-right font-semibold">Disc</th><th className="px-3 py-2 text-right font-semibold">Tax</th>
                          <th className="px-3 py-2 text-right font-semibold">Paid</th><th className="px-3 py-2 text-right font-semibold">Refund</th><th className="px-3 py-2 text-right font-semibold">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.rows.map((r) => (
                          <tr key={r.billNo} className="border-b border-border/60 last:border-0">
                            <td className="px-3 py-2 font-medium">{r.billNo}</td><td className="px-3 py-2">{r.caseNo ?? '—'}</td><td className="px-3 py-2">{new Date(r.date).toLocaleDateString()}</td>
                            <td className="px-3 py-2 text-right tabular">{r.amount.toFixed(2)}</td><td className="px-3 py-2 text-right tabular">{r.discount.toFixed(2)}</td><td className="px-3 py-2 text-right tabular">{r.tax.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right tabular">{r.paid.toFixed(2)}</td><td className="px-3 py-2 text-right tabular">{r.refund.toFixed(2)}</td><td className="px-3 py-2 text-right tabular">{r.balance.toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-border bg-bg/50 font-semibold">
                          <td className="px-3 py-2" colSpan={3}>Total</td>
                          <td className="px-3 py-2 text-right tabular">{g.totals.amount.toFixed(2)}</td><td className="px-3 py-2 text-right tabular">{g.totals.discount.toFixed(2)}</td><td className="px-3 py-2 text-right tabular">{g.totals.tax.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right tabular">{g.totals.paid.toFixed(2)}</td><td className="px-3 py-2 text-right tabular">{g.totals.refund.toFixed(2)}</td><td className="px-3 py-2 text-right tabular">{g.totals.balance.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {data.bills.length === 0 && data.opd.length === 0 && data.ipd.length === 0 && (
                <p className="py-8 text-center text-sm text-fg-muted">No visits or bills recorded for this patient.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VisitTable({ title, rows, noLabel }: { title: string; rows: PatientReportVisit[]; noLabel: string }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg text-left text-xs uppercase text-fg-muted">
              <th className="px-3 py-2 font-semibold">{noLabel}</th><th className="px-3 py-2 font-semibold">Case ID</th><th className="px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Doctor</th><th className="px-3 py-2 font-semibold">Symptoms</th><th className="px-3 py-2 font-semibold">Findings</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-fg-muted">No records</td></tr>}
            {rows.map((v) => (
              <tr key={v.no} className="border-b border-border/60 last:border-0 align-top">
                <td className="px-3 py-2 font-medium text-primary">{v.no}</td><td className="px-3 py-2">{v.caseNo ?? '—'}</td><td className="px-3 py-2 whitespace-nowrap">{new Date(v.date).toLocaleDateString()}</td>
                <td className="px-3 py-2 whitespace-nowrap">{v.doctorName}</td><td className="px-3 py-2 text-fg-muted">{v.symptoms ?? '—'}</td><td className="px-3 py-2 text-fg-muted">{v.findings ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
