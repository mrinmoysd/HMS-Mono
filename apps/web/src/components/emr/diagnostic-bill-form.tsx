'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, UserPlus, X } from 'lucide-react';
import { diagnosticBillSchema, type DiagnosticTestDto, type Modality, type PatientDto } from '@smart-hospital/shared';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { PatientSelect } from '@/components/patient-select';
import { PatientForm } from '@/app/(app)/patient/patient-form';
import { useDoctors } from '@/lib/hooks/use-clinical';
import { useDiagnosticTests, useGenerateDiagnosticBill, useNextBillNo, usePreviousReports } from '@/lib/hooks/use-departments';
import { useCharge } from '@/lib/hooks/use-masters';
import { ApiRequestError } from '@/lib/api';
import { toLocalDateInput } from '@/lib/datetime';

interface Line {
  testId: string;
  name: string;
  reportDays: number;
  reportDate: string;
  taxPct: number;
  appliedCharge: number;
}

const EMPTY_LINE: Line = { testId: '', name: '', reportDays: 1, reportDate: today(), taxPct: 0, appliedCharge: 0 };

// Local calendar date, not the UTC one: toISOString().slice(0,10) rolls a day
// early anywhere east of UTC, which put report dates on the wrong day.
function today(): string {
  return toLocalDateInput(new Date());
}

/** Pathology/Radiology "Generate Bill" — patient (+ inline New Patient), test line editor, referral doctor, Apply TPA, previous reports. */
export function DiagnosticBillForm({ open, modality, title, onClose }: { open: boolean; modality: Modality; title: string; onClose: () => void }) {
  const { data: doctors = [] } = useDoctors();
  const { data: tests } = useDiagnosticTests(modality, { size: 300 });
  const generate = useGenerateDiagnosticBill(modality);

  const [patientId, setPatientId] = useState('');
  const [patientLabel, setPatientLabel] = useState('');
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [prescriptionNo, setPrescriptionNo] = useState('');
  const [applyTpa, setApplyTpa] = useState(false);
  const [patientTpaId, setPatientTpaId] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);
  const [consultantId, setConsultantId] = useState('');
  const [referenceDoctor, setReferenceDoctor] = useState('');
  const [note, setNote] = useState('');
  const [previousReportValue, setPreviousReportValue] = useState('');
  const [discountPct, setDiscountPct] = useState('0');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [error, setError] = useState<string | null>(null);

  const { data: previousReports } = usePreviousReports(modality, patientId || null);
  // Header strip preview. Called before the early return below — hooks cannot
  // be conditional — and gated by `open` so a closed form issues no request.
  const { data: nextBill } = useNextBillNo(modality, open, patientId || undefined);

  if (!open) return null;

  function update(i: number, patch: Partial<Line>) {
    setLines((rs) => rs.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function onTestSelect(i: number, testId: string) {
    const test = (tests?.data ?? []).find((t) => t.id === testId);
    if (!test) {
      update(i, { testId: '', name: '' });
      return;
    }
    const reportDate = new Date();
    reportDate.setDate(reportDate.getDate() + (test.reportDays || 1));
    update(i, {
      testId: test.id,
      name: test.name,
      reportDays: test.reportDays,
      reportDate: reportDate.toISOString().slice(0, 10),
      taxPct: test.taxPercent,
      appliedCharge: test.standardCharge || test.charge,
    });
  }

  const validLines = lines.filter((l) => l.testId);
  const subtotal = validLines.reduce((s, l) => s + l.appliedCharge, 0);
  const tax = validLines.reduce((s, l) => s + l.appliedCharge * (l.taxPct / 100), 0);
  const discount = subtotal * (Number(discountPct) / 100);
  const netAmount = subtotal - discount + tax;

  function reset() {
    setPatientId(''); setPatientLabel(''); setPrescriptionNo(''); setApplyTpa(false); setPatientTpaId(null);
    setLines([{ ...EMPTY_LINE }]); setConsultantId(''); setReferenceDoctor(''); setNote(''); setPreviousReportValue('');
    setDiscountPct('0'); setPaymentMode('cash'); setPaymentAmount('0'); setError(null);
  }

  async function submit(print: boolean) {
    setError(null);
    const parsed = diagnosticBillSchema.safeParse({
      modality,
      patientId,
      consultantId: consultantId || null,
      referenceDoctor,
      prescriptionNo,
      applyTpa,
      note,
      previousReportValue,
      items: validLines.map((l) => ({
        testId: l.testId,
        name: l.name,
        reportDays: l.reportDays,
        reportDate: l.reportDate,
        appliedCharge: l.appliedCharge,
        qty: 1,
        discountPct: Number(discountPct) || 0,
        taxPct: l.taxPct,
      })),
      payment: { amount: Number(paymentAmount) || 0, mode: paymentMode },
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the highlighted fields');
      return;
    }
    try {
      await generate.mutateAsync(parsed.data);
      if (print) window.print();
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  function onPatientCreated(p: PatientDto) {
    setPatientId(p.id);
    setPatientLabel(`${p.name} · ${p.patientNo}`);
    setPatientTpaId(p.tpaId);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={<>Generate {title} Bill</>}
      size="xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="secondary" onClick={() => submit(true)} loading={generate.isPending}>Save &amp; Print</Button>
          <Button type="button" onClick={() => submit(false)} loading={generate.isPending}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="grid grid-cols-3 gap-4 rounded-sm border border-border bg-surface-2 px-4 py-3 text-sm">
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
            <p className="font-medium tabular-nums">{today()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field label="Patient" required>
              {patientId && patientLabel ? (
                <div className="flex items-center justify-between rounded-sm border border-border bg-surface px-3 py-2 text-sm">
                  <span>{patientLabel}</span>
                  <button type="button" className="text-xs text-primary" onClick={() => { setPatientId(''); setPatientLabel(''); }}>Change</button>
                </div>
              ) : (
                <PatientSelect value={patientId} onChange={(id, label) => { setPatientId(id); setPatientLabel(label); }} selectedLabel={patientLabel} />
              )}
            </Field>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="secondary" onClick={() => setNewPatientOpen(true)}>
              <UserPlus className="h-4 w-4" /> New Patient
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Prescription No">
            <TextInput value={prescriptionNo} onChange={(e) => setPrescriptionNo(e.target.value)} placeholder="Search / enter…" />
          </Field>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={applyTpa} onChange={(e) => setApplyTpa(e.target.checked)} disabled={!patientTpaId} />
              Apply TPA{!patientTpaId && patientId ? ' (patient has no TPA)' : ''}
            </label>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                <th className="px-2 py-2 font-semibold">Test Name</th>
                <th className="px-2 py-2 font-semibold">Report Days</th>
                <th className="px-2 py-2 font-semibold">Report Date</th>
                <th className="px-2 py-2 font-semibold">Tax</th>
                <th className="px-2 py-2 font-semibold">Amount (#)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <TestLineRow key={i} line={l} tests={tests?.data ?? []} applyTpa={applyTpa} tpaId={patientTpaId} onSelect={(id) => onTestSelect(i, id)} onChange={(patch) => update(i, patch)} onRemove={() => setLines((rs) => rs.filter((_, idx) => idx !== i))} />
              ))}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setLines((rs) => [...rs, { ...EMPTY_LINE }])}>
          <Plus className="h-4 w-4" /> Add
        </Button>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Referral Doctor">
            <Select value={consultantId} onChange={(e) => setConsultantId(e.target.value)} placeholder="Select…" options={doctors.map((d) => ({ value: d.id, label: d.name }))} />
          </Field>
          <Field label="Doctor Name">
            <TextInput value={referenceDoctor} onChange={(e) => setReferenceDoctor(e.target.value)} placeholder="External / referring doctor" />
          </Field>
        </div>
        <Field label="Note">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Field label="Previous Report Value">
          <TextInput value={previousReportValue} onChange={(e) => setPreviousReportValue(e.target.value)} />
        </Field>

        {patientId && previousReports && previousReports.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Previous Report Value</h3>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                    <th className="px-3 py-2 font-semibold">Test Name</th>
                    <th className="px-3 py-2 font-semibold">Sample Collected</th>
                    <th className="px-3 py-2 font-semibold">Report Date</th>
                    <th className="px-3 py-2 font-semibold">Approved By / Approve Date</th>
                    <th className="px-3 py-2 font-semibold">Tax</th>
                    <th className="px-3 py-2 text-right font-semibold">Net Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {previousReports.map((r) => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 font-medium">{r.testName}</td>
                      <td className="px-3 py-2">{r.sampleCollected ? new Date(r.sampleCollected).toLocaleDateString() : '—'}</td>
                      <td className="px-3 py-2">{r.reportDate ? new Date(r.reportDate).toLocaleDateString() : '—'}</td>
                      <td className="px-3 py-2">{r.approvedByName ? `${r.approvedByName}${r.approvedAt ? ' / ' + new Date(r.approvedAt).toLocaleDateString() : ''}` : '—'}</td>
                      <td className="px-3 py-2 tabular">{r.tax != null ? r.tax.toFixed(2) : '—'}</td>
                      <td className="px-3 py-2 text-right tabular">{r.netAmount != null ? r.netAmount.toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <div className="w-full max-w-sm space-y-2 rounded-md border border-border p-4 text-sm">
            <SummaryRow label="Total (#)" value={subtotal.toFixed(2)} />
            <div className="flex items-center justify-between gap-2">
              <span className="text-fg-muted">Discount (%)</span>
              <input type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} className="h-8 w-28 rounded-sm border border-border bg-surface px-2 text-right text-sm tabular" />
            </div>
            <SummaryRow label="Discount (#)" value={discount.toFixed(2)} />
            <SummaryRow label="Tax (#)" value={tax.toFixed(2)} />
            <SummaryRow label="Net Amount (#)" value={netAmount.toFixed(2)} bold />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Field label="Payment Mode">
                <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} options={['cash', 'card', 'upi', 'tpa', 'cheque'].map((m) => ({ value: m, label: m.toUpperCase() }))} />
              </Field>
              <Field label="Amount (#)">
                <TextInput type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
              </Field>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function TestLineRow({
  line, tests, applyTpa, tpaId, onSelect, onChange, onRemove,
}: {
  line: Line;
  tests: DiagnosticTestDto[];
  applyTpa: boolean;
  tpaId: string | null;
  onSelect: (testId: string) => void;
  onChange: (patch: Partial<Line>) => void;
  onRemove: () => void;
}) {
  const test = tests.find((t) => t.id === line.testId);
  const { data: chargeDetail } = useCharge(applyTpa && test?.chargeId ? test.chargeId : null);
  const tpaOverride = useMemo(() => {
    if (!applyTpa || !tpaId || !chargeDetail) return null;
    return chargeDetail.schedule.find((s) => s.tpaId === tpaId)?.amount ?? null;
  }, [applyTpa, tpaId, chargeDetail]);

  useEffect(() => {
    if (tpaOverride != null && tpaOverride !== line.appliedCharge) {
      onChange({ appliedCharge: tpaOverride });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tpaOverride]);
  const effectiveAmount = tpaOverride != null ? tpaOverride : line.appliedCharge;

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-1 py-1">
        <Select value={line.testId} onChange={(e) => onSelect(e.target.value)} placeholder="Select" options={tests.map((t) => ({ value: t.id, label: t.name }))} className="h-8 w-56" />
      </td>
      <td className="px-1 py-1"><input type="number" value={line.reportDays} onChange={(e) => onChange({ reportDays: Number(e.target.value) })} className="h-8 w-20 rounded-sm border border-border bg-surface px-2 text-sm tabular" /></td>
      <td className="px-1 py-1"><input type="date" value={line.reportDate} onChange={(e) => onChange({ reportDate: e.target.value })} className="h-8 w-36 rounded-sm border border-border bg-surface px-2 text-sm" /></td>
      <td className="px-1 py-1"><input type="number" value={line.taxPct} onChange={(e) => onChange({ taxPct: Number(e.target.value) })} className="h-8 w-16 rounded-sm border border-border bg-surface px-2 text-sm tabular" /></td>
      <td className="px-1 py-1">
        <input type="number" value={effectiveAmount} onChange={(e) => onChange({ appliedCharge: Number(e.target.value) })} className="h-8 w-24 rounded-sm border border-border bg-surface px-2 text-sm tabular" />
        {tpaOverride != null && <span className="ml-1 text-xs text-primary">TPA</span>}
      </td>
      <td className="px-1 py-1">
        <button type="button" onClick={onRemove} className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger">
          <X className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-fg-muted">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
