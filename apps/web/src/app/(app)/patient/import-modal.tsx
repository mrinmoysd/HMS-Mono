'use client';

import { useState } from 'react';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextArea } from '@/components/ui/field';
import { useImportPatients } from '@/lib/hooks/use-patients';
import type { PatientImportInput, PatientImportResult } from '@smart-hospital/shared';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** CSV bulk import (FRD §2.1). Expected columns: name,age,gender,phone,guardianName */
export function ImportModal({ open, onClose }: Props) {
  const importPatients = useImportPatients();
  const [text, setText] = useState('name,age,gender,phone\nJohn Doe,40-0-0,male,9000000001');
  const [result, setResult] = useState<PatientImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function parseCsv(csv: string): Record<string, string>[] {
    const lines = csv.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0]!.split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cells = line.split(',');
      const row: Record<string, string> = {};
      headers.forEach((h, i) => (row[h] = (cells[i] ?? '').trim()));
      return row;
    });
  }

  async function submit() {
    setError(null);
    setResult(null);
    const rows = parseCsv(text).filter((r) => r.name);
    if (rows.length === 0) {
      setError('No valid rows (each row needs a name).');
      return;
    }
    try {
      const res = await importPatients.mutateAsync({
        rows: rows.map((r) => ({ ...r, age: r.age || '0-0-0' })),
      } as PatientImportInput);
      setResult(res);
    } catch {
      setError('Import failed. Check the CSV format and required fields.');
    }
  }

  return (
    <FormDrawer
      open={open}
      title="Import Patients"
      onClose={onClose}
      onSubmit={submit}
      submitting={importPatients.isPending}
      submitLabel="Import"
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          Paste CSV with a header row. Supported columns: <code>name</code>, <code>age</code>,{' '}
          <code>gender</code>, <code>phone</code>, <code>guardianName</code>, <code>email</code>,{' '}
          <code>address</code>. <b>name</b> is required.
        </p>
        <Field label="CSV data">
          <TextArea rows={10} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs" />
        </Field>
        {error && (
          <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {result && (
          <div className="rounded-sm bg-success/10 px-3 py-2 text-sm text-success">
            Imported {result.inserted} patient(s).
            {result.failed.length > 0 && ` ${result.failed.length} failed.`}
          </div>
        )}
      </div>
    </FormDrawer>
  );
}
