'use client';

import { useState } from 'react';
import { X, Download, UploadCloud } from 'lucide-react';
import { medicineImportSchema } from '@smart-hospital/shared';
import { Field, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { useCatalog } from '@/lib/hooks/use-masters';
import { useImportMedicines } from '@/lib/hooks/use-departments';
import { ApiRequestError } from '@/lib/api';

const SAMPLE_HEADERS = ['Medicine', 'Company', 'Composition', 'Group', 'Unit', 'Min Level', 'Re-Order Level', 'VAT', 'Box/Packing', 'Note'];
const SAMPLE_ROW = ['Paracetamol 500mg', 'Sample Pharma', 'Paracetamol 500mg', 'Analgesic', 'Tablet', '20', '50', 'VAT100', '10 tablets', 'Sample Data'];

function downloadSample() {
  const csv = [SAMPLE_HEADERS.join(','), SAMPLE_ROW.join(',')].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'medicines-sample.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** Bulk CSV import for medicines (Medicines Stock "Import Medicines" action). */
export function MedicineImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: categories } = useCatalog('medicine-category', { size: 100 });
  const importMed = useImportMedicines();
  const [categoryId, setCategoryId] = useState('');
  const [fileName, setFileName] = useState('');
  const [csv, setCsv] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  if (!open) return null;

  function readFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ''));
    reader.readAsText(file);
  }

  async function submit() {
    setError(null);
    setResult(null);
    const parsed = medicineImportSchema.safeParse({ categoryId, csv });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    try {
      const res = await importMed.mutateAsync(parsed.data);
      setResult(`Imported ${res.imported} medicine(s) successfully.`);
      setCsv('');
      setFileName('');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : 'Import failed');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Import Medicines" className="relative z-10 w-full max-w-3xl rounded-md bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">Medicines Import</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={downloadSample}>
              <Download className="h-4 w-4" /> Download Sample Data
            </Button>
            <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-border/50">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm text-fg-muted">
            Your CSV data should include a header row exactly as in the sample file: <b>{SAMPLE_HEADERS.join(', ')}</b>. Save as UTF-8 to avoid encoding
            problems. Every row is created under the Medicine Category selected below.
          </p>

          {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          {result && <p role="status" className="rounded-sm bg-success/10 px-3 py-2 text-sm text-success">{result}</p>}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Medicine Category" required>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder="Select…" options={(categories?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
            </Field>
            <Field label="Select CSV File" required>
              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-border bg-surface px-3 text-sm text-fg-muted hover:border-primary">
                <UploadCloud className="h-4 w-4" />
                {fileName || 'Drop a file here or click'}
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => readFile(e.target.files?.[0])} />
              </label>
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} loading={importMed.isPending}>
            Import Medicines
          </Button>
        </div>
      </div>
    </div>
  );
}
