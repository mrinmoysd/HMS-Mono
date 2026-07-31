'use client';

import { useState } from 'react';
import { computeInvoiceTotals, type ChargeDto } from '@smart-hospital/shared';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, Select } from '@/components/ui/field';
import { PatientSelect } from '@/components/patient-select';
import { ChargeLineEditor, type ChargeLine } from '@/components/charge-line-editor';
import { ApiRequestError } from '@/lib/api';
import { toLocalDateInput } from '@/lib/datetime';
import { usePharmacyNextBillNo } from '@/lib/hooks/use-departments';

export interface CatalogItem {
  id: string;
  name: string;
  price: number;
  taxPct?: number;
}

interface Props {
  open: boolean;
  title: string;
  catalog: CatalogItem[];
  onClose: () => void;
  /** Receives the assembled bill; returns a promise (mutation). idKey names the
   *  per-line id field the API expects (medicineId | testId). */
  onSubmit: (payload: {
    patientId: string;
    lines: ChargeLine[];
    payment: { amount: number; mode: string };
    extra: Record<string, string>;
  }) => Promise<unknown>;
  submitting?: boolean;
  /** Optional extra header fields (e.g. Reference Doctor for diagnostics). */
  extraFields?: { key: string; label: string }[];
}

/** Shared "generate bill" drawer for pharmacy & diagnostics — patient + charge
 *  lines (picked from the department catalog) + payment, on the invoice engine. */
export function DeptBillForm({ open, title, catalog, onClose, onSubmit, submitting, extraFields }: Props) {
  const [patientId, setPatientId] = useState('');
  const [patientLabel, setPatientLabel] = useState('');
  const [lines, setLines] = useState<ChargeLine[]>([]);
  const [payAmount, setPayAmount] = useState('0');
  const [payMode, setPayMode] = useState('cash');
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Header strip preview. Gated on `open` so a closed drawer issues no request.
  const { data: nextBill } = usePharmacyNextBillNo(open, patientId || undefined);

  // Present catalog items to ChargeLineEditor as ChargeDto-shaped options.
  const charges: ChargeDto[] = catalog.map((c) => ({
    id: c.id,
    name: c.name,
    categoryId: null,
    categoryName: null,
    typeId: null,
    typeName: null,
    unitId: null,
    unitName: null,
    taxCategoryId: null,
    taxPercent: c.taxPct ?? 0,
    standardCharge: c.price,
    createdAt: '',
  }));

  const net = computeInvoiceTotals(lines.filter((l) => l.name)).netAmount;

  function reset() {
    setPatientId(''); setPatientLabel(''); setLines([]); setPayAmount('0'); setExtra({}); setError(null);
  }

  async function submit() {
    setError(null);
    if (!patientId) return setError('Select a patient');
    const valid = lines.filter((l) => l.name);
    if (valid.length === 0) return setError('Add at least one item');
    try {
      await onSubmit({
        patientId,
        lines: valid,
        payment: { amount: Number(payAmount) || 0, mode: payMode },
        extra,
      });
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : 'Failed to generate bill');
    }
  }

  return (
    <FormDrawer open={open} title={title} onClose={onClose} onSubmit={submit} submitting={submitting} submitLabel="Generate Bill">
      {error && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="mb-4 grid grid-cols-3 gap-4 rounded-sm border border-border bg-surface-2 px-4 py-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-muted">Bill No</p>
          <p className="font-medium tabular-nums">{nextBill?.billNo ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-muted">Case ID</p>
          <p className="font-medium tabular-nums">{patientId ? nextBill?.caseNo ?? '—' : '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-muted">Date</p>
          <p className="font-medium tabular-nums">{toLocalDateInput(new Date())}</p>
        </div>
      </div>
      <div className="space-y-4">
        <Field label="Patient" required>
          <PatientSelect value={patientId} selectedLabel={patientLabel}
            onChange={(id, label) => { setPatientId(id); setPatientLabel(label); }} />
        </Field>
        {extraFields?.map((f) => (
          <Field key={f.key} label={f.label}>
            <TextInput value={extra[f.key] ?? ''} onChange={(e) => setExtra((x) => ({ ...x, [f.key]: e.target.value }))} />
          </Field>
        ))}
        <div>
          <p className="mb-1 text-sm font-medium">Items<span className="ml-0.5 text-danger">*</span></p>
          <ChargeLineEditor lines={lines} onChange={setLines} charges={charges} />
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
          <Field label={`Paid Amount (Net ${net.toFixed(2)})`}>
            <TextInput type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          </Field>
          <Field label="Payment Mode">
            <Select value={payMode} onChange={(e) => setPayMode(e.target.value)}
              options={['cash', 'card', 'upi', 'tpa', 'cheque'].map((m) => ({ value: m, label: m }))} />
          </Field>
        </div>
      </div>
    </FormDrawer>
  );
}
