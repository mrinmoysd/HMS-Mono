'use client';

import { useState } from 'react';
import { BarChart3, Download, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { useReportCategories, useReport } from '@/lib/hooks/use-admin';

export default function ReportsPage() {
  const categories = useReportCategories();
  const [selected, setSelected] = useState<{ key: string; label: string } | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const report = useReport(selected?.key ?? null, from, to);

  function exportCsv() {
    if (!report.data) return;
    const header = report.data.columns.join(',');
    const body = report.data.rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`${header}\n${body}`], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `${selected?.key}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!selected) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><BarChart3 className="h-6 w-6 text-primary" /> Reports</h1>
          <p className="text-sm text-fg-muted">
            {categories.data ? `${categories.data.length} report categories` : 'Loading…'}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="mb-2 font-medium">TPA</p>
            <div className="flex flex-col gap-1">
              <a href="/reports/tpa" className="rounded-sm px-2 py-1.5 text-left text-sm text-primary hover:bg-primary/5">TPA Report</a>
            </div>
          </div>
          {(categories.data ?? []).map((c) => (
            <div key={c.category} className="rounded-md border border-border bg-surface p-4">
              <p className="mb-2 font-medium">{c.category}</p>
              <div className="flex flex-col gap-1">
                {c.reports.map((r) => (
                  <button key={r.key} onClick={() => setSelected(r)} className="rounded-sm px-2 py-1.5 text-left text-sm text-primary hover:bg-primary/5">
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const d = report.data;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => setSelected(null)} className="mb-1 flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /> All reports</button>
          <h1 className="text-2xl font-semibold">{d?.title ?? selected.label}</h1>
        </div>
        <Button variant="secondary" onClick={exportCsv} disabled={!d || d.rows.length === 0}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface p-4">
        <div className="w-44"><Field label="From"><TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field></div>
        <div className="w-44"><Field label="To"><TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>
        {(from || to) && <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); }}>Clear</Button>}
      </div>

      {d && d.summary && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(d.summary).map(([k, v]) => (
            <div key={k} className="rounded-md border border-border bg-surface px-4 py-2">
              <p className="text-xs text-fg-muted">{k}</p>
              <p className="text-lg font-semibold tabular">{typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              {(d?.columns ?? []).map((c) => <th key={c} className="px-3 py-2.5 font-semibold">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {report.isLoading && <tr><td colSpan={d?.columns.length ?? 1} className="px-3 py-10 text-center text-fg-muted">Loading…</td></tr>}
            {d && d.rows.length === 0 && <tr><td colSpan={d.columns.length} className="px-3 py-12 text-center text-fg-muted">No data for this period</td></tr>}
            {d?.rows.map((row, i) => (
              <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-bg/60">
                {row.map((cell, j) => <td key={j} className={`px-3 py-2 ${typeof cell === 'number' ? 'tabular' : ''}`}>{typeof cell === 'number' && !Number.isInteger(cell) ? cell.toFixed(2) : cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
