'use client';

import { useState } from 'react';
import { Download, UploadCloud, X } from 'lucide-react';
import type { TpaDto } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Field, TextArea } from '@/components/ui/field';
import { useImportTpaCharges } from '@/lib/hooks/use-tpa';

/** Bulk-import negotiated TPA charges from CSV (charge name, amount).
 *  Rows are matched to existing charges by name; unmatched names are reported. */
export function TpaImportModal({ tpa, onClose }: { tpa: TpaDto; onClose: () => void }) {
  const importer = useImportTpaCharges(tpa.id);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ matched: number; skipped: number; skippedNames: string[] } | null>(null);

  function parse(raw: string): { chargeName: string; amount: number }[] {
    const rows: { chargeName: string; amount: number }[] = [];
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(',');
      if (parts.length < 2) continue;
      const chargeName = parts.slice(0, -1).join(',').trim().replace(/^"|"$/g, '');
      const amount = Number(parts[parts.length - 1].trim());
      if (!chargeName || Number.isNaN(amount)) continue;
      if (chargeName.toLowerCase() === 'charge name' || chargeName.toLowerCase() === 'name') continue; // header
      rows.push({ chargeName, amount });
    }
    return rows;
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
  }

  async function submit() {
    setError('');
    const rows = parse(text);
    if (rows.length === 0) { setError('No valid rows found. Use "Charge Name,Amount" per line.'); return; }
    const res = await importer.mutateAsync({ rows });
    setResult(res);
  }

  function downloadSample() {
    const csv = 'Charge Name,TPA Charge\nAppointment Fees,120\nOPD Consultation,200\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'tpa-charges-sample.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div role="dialog" aria-modal="true" aria-label="Import TPA Charges" className="relative w-full max-w-lg rounded-md bg-surface shadow-xl">
        <div className="flex items-center justify-between rounded-t-md bg-primary px-5 py-3 text-primary-fg">
          <h2 className="flex items-center gap-2 text-base font-semibold"><UploadCloud className="h-5 w-5" /> Import TPA Charges — {tpa.name}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 p-5">
          {result ? (
            <div className="space-y-3">
              <p className="rounded-sm bg-success/10 px-3 py-2 text-sm text-success">Imported {result.matched} charge{result.matched === 1 ? '' : 's'}.</p>
              {result.skipped > 0 && (
                <div className="rounded-sm bg-warning/10 px-3 py-2 text-sm text-warning">
                  {result.skipped} row{result.skipped === 1 ? '' : 's'} skipped (no matching charge): {result.skippedNames.slice(0, 8).join(', ')}{result.skippedNames.length > 8 ? '…' : ''}
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-fg-muted">Upload or paste a CSV with one charge per line: <code className="rounded-sm bg-bg px-1">Charge Name,Amount</code>. Rows are matched to hospital charges by name.</p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm hover:border-primary hover:text-primary">
                  <UploadCloud className="h-4 w-4" /> Choose CSV file
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
                </label>
                <button onClick={downloadSample} className="flex items-center gap-1.5 text-sm text-primary hover:underline"><Download className="h-4 w-4" /> Download sample</button>
              </div>
              <Field label="CSV Content">
                <TextArea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Charge Name,Amount\nAppointment Fees,120'} className="font-mono text-xs" />
              </Field>
              {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="secondary" onClick={onClose}>{result ? 'Close' : 'Cancel'}</Button>
          {!result && <Button onClick={submit} loading={importer.isPending}>Import</Button>}
        </div>
      </div>
    </div>
  );
}
