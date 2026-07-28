'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useMemo, useState } from 'react';
import { ChevronLeft, FileText, Search } from 'lucide-react';
import type { TpaReportRow } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { ExportMenu } from '@/components/ui/export-menu';
import { useTpaList, useTpaReport, type TpaReportQuery } from '@/lib/hooks/use-tpa';
import { useCharges, useCatalog } from '@/lib/hooks/use-masters';
import { useDoctors } from '@/lib/hooks/use-clinical';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB');
}

export default function TpaReportPage() {
  const tpas = useTpaList();
  const doctors = useDoctors();
  const charges = useCharges({ size: 200 });
  const categories = useCatalog('charge-category', { size: 100 });

  const [f, setF] = useState<{ from: string; to: string; doctorId: string; tpaId: string; caseId: string; chargeCategoryId: string; chargeId: string }>({
    from: '', to: '', doctorId: '', tpaId: '', caseId: '', chargeCategoryId: '', chargeId: '',
  });
  const [query, setQuery] = useState<TpaReportQuery | null>(null);
  const report = useTpaReport(query);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const all = report.data?.rows ?? [];
    const q = search.trim().toLowerCase();
    return q ? all.filter((r) => `${r.patientName} ${r.tpaName} ${r.chargeName} ${r.caseId} ${r.doctor}`.toLowerCase().includes(q)) : all;
  }, [report.data, search]);

  function runSearch() {
    setQuery({
      from: f.from || undefined,
      to: f.to || undefined,
      doctorId: f.doctorId || undefined,
      tpaId: f.tpaId || undefined,
      caseId: f.caseId || undefined,
      chargeCategoryId: f.chargeCategoryId || undefined,
      chargeId: f.chargeId || undefined,
    });
  }

  const cols: { header: string; render: (r: TpaReportRow) => React.ReactNode; num?: boolean }[] = [
    { header: 'Checkup/Ipd No', render: (r) => r.checkupIpdNo || '—' },
    { header: 'Case ID', render: (r) => r.caseId || '—' },
    { header: 'Head', render: (r) => r.head || '—' },
    { header: 'TPA ID', render: (r) => r.tpaIdNo || '—' },
    { header: 'TPA Name', render: (r) => r.tpaName || '—' },
    { header: 'Patient Name', render: (r) => r.patientName || '—' },
    { header: 'Appointment Date', render: (r) => fmtDate(r.appointmentDate) },
    { header: 'Doctor', render: (r) => r.doctor || '—' },
    { header: 'Charge Name', render: (r) => r.chargeName || '—' },
    { header: 'Charge Category', render: (r) => r.chargeCategory || '—' },
    { header: 'Charge Type', render: (r) => r.chargeType || '—' },
    { header: 'Standard Charge ($)', render: (r) => r.standardCharge.toFixed(2), num: true },
    { header: 'Applied Charge ($)', render: (r) => r.appliedCharge.toFixed(2), num: true },
    { header: 'TPA Charge ($)', render: (r) => r.tpaCharge.toFixed(2), num: true },
    { header: 'Tax', render: (r) => r.tax.toFixed(2), num: true },
    { header: 'Amount ($)', render: (r) => r.amount.toFixed(2), num: true },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={<span className="flex items-center gap-2"><FileText className="h-5 w-5 shrink-0 text-primary" /> TPA Report</span>}
        backHref="/reports"
        backLabel="All reports"
      />

      <div className="grid grid-cols-1 gap-4 rounded-md border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Time Duration">
          <div className="flex items-center gap-2">
            <TextInput type="date" value={f.from} onChange={(e) => setF((s) => ({ ...s, from: e.target.value }))} />
            <span className="text-fg-muted">–</span>
            <TextInput type="date" value={f.to} onChange={(e) => setF((s) => ({ ...s, to: e.target.value }))} />
          </div>
        </Field>
        <Field label="Doctor"><Select value={f.doctorId} onChange={(e) => setF((s) => ({ ...s, doctorId: e.target.value }))} placeholder="Select" options={(doctors.data ?? []).map((d) => ({ value: d.id, label: d.name }))} /></Field>
        <Field label="TPA"><Select value={f.tpaId} onChange={(e) => setF((s) => ({ ...s, tpaId: e.target.value }))} placeholder="Select" options={(tpas.data?.data ?? []).map((t) => ({ value: t.id, label: t.name }))} /></Field>
        <Field label="Case ID"><TextInput value={f.caseId} onChange={(e) => setF((s) => ({ ...s, caseId: e.target.value }))} /></Field>
        <Field label="Charge Category"><Select value={f.chargeCategoryId} onChange={(e) => setF((s) => ({ ...s, chargeCategoryId: e.target.value }))} placeholder="Select" options={(categories.data?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} /></Field>
        <Field label="Charge"><Select value={f.chargeId} onChange={(e) => setF((s) => ({ ...s, chargeId: e.target.value }))} placeholder="Select" options={(charges.data?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} /></Field>
        <div className="flex items-end"><Button onClick={runSearch}><Search className="h-4 w-4" /> Search</Button></div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-64" />
        <ExportMenu table={() => ({ title: 'TPA Report', filename: 'tpa-report', headers: cols.map((c) => c.header), rows: rows.map((r) => cols.map((c) => { const v = c.render(r); return typeof v === 'string' ? v : ''; })) })} />
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-fg-muted">
              {cols.map((c) => <th key={c.header} className={`px-3 py-2.5 font-semibold ${c.num ? 'text-right' : ''}`}>{c.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/60 last:border-0">
                {cols.map((c) => <td key={c.header} className={`px-3 py-2 ${c.num ? 'text-right tabular' : ''}`}>{c.render(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {!query && <p className="py-12 text-center text-sm text-fg-muted">Select criteria and search to run the report.</p>}
        {query && report.isLoading && <p className="py-10 text-center text-sm text-fg-muted">Loading…</p>}
        {query && !report.isLoading && rows.length === 0 && <p className="py-12 text-center text-sm text-fg-muted">No data available in table</p>}
      </div>
    </div>
  );
}
