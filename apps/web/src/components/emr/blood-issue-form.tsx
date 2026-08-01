'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { BLOOD_GROUPS, bloodIssueSchema, computeInvoiceTotals, type PatientDto } from '@smart-hospital/shared';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { PatientSelect } from '@/components/patient-select';
import { PatientForm } from '@/app/(app)/patient/patient-form';
import { useDoctors } from '@/lib/hooks/use-clinical';
import { useCharges } from '@/lib/hooks/use-masters';
import { useBloodBags, useIssueBlood, useNextBloodIssueNo } from '@/lib/hooks/use-departments';
import { ApiRequestError } from '@/lib/api';
import { toLocalDateInput } from '@/lib/datetime';

type IssueKind = 'blood' | 'component';

/** Generic Issue Blood / Issue Component form — the two flows in the demo are structurally identical, differing only in which bag pool (whole-blood vs component) is offered. */
export function BloodIssueForm({ open, kind, title, initialBloodGroup, onClose }: { open: boolean; kind: IssueKind; title: string; initialBloodGroup?: string; onClose: () => void }) {
  const { data: doctors = [] } = useDoctors();
  const { data: charges } = useCharges({ size: 300, module: 'blood-bank' });
  const issue = useIssueBlood();

  const [patientId, setPatientId] = useState('');
  const [patientLabel, setPatientLabel] = useState('');
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [applyTpa, setApplyTpa] = useState(false);
  const [consultantId, setConsultantId] = useState('');
  const [referenceDoctor, setReferenceDoctor] = useState('');
  const [technician, setTechnician] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [bagId, setBagId] = useState('');
  const [chargeId, setChargeId] = useState('');
  const [standardCharge, setStandardCharge] = useState('0');
  const [bloodQty, setBloodQty] = useState('');
  const [note, setNote] = useState('');
  const [discountPct, setDiscountPct] = useState('0');
  const [taxPct, setTaxPct] = useState('0');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [error, setError] = useState<string | null>(null);

  const { data: bags } = useBloodBags({ kind, status: 'available', bloodGroup: bloodGroup || undefined, size: 200 });

  // Header strip preview. Must sit above the early return — hooks cannot be
  // conditional — and is gated on `open` so a closed form issues no request.
  const { data: nextIssue } = useNextBloodIssueNo(open, patientId || undefined);

  useEffect(() => {
    if (open) setBloodGroup(initialBloodGroup ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialBloodGroup]);

  if (!open) return null;

  const totals = computeInvoiceTotals([
    { name: 'x', standardCharge: Number(standardCharge) || 0, appliedCharge: Number(standardCharge) || 0, qty: 1, discountPct: Number(discountPct) || 0, taxPct: Number(taxPct) || 0 },
  ]);

  function reset() {
    setPatientId(''); setPatientLabel(''); setApplyTpa(false); setConsultantId(''); setReferenceDoctor('');
    setTechnician(''); setBloodGroup(''); setBagId(''); setChargeId(''); setStandardCharge('0'); setBloodQty('');
    setNote(''); setDiscountPct('0'); setTaxPct('0'); setPaymentMode('cash'); setPaymentAmount('0'); setError(null);
  }

  async function submit(print: boolean) {
    setError(null);
    const parsed = bloodIssueSchema.safeParse({
      type: kind,
      patientId,
      bagId,
      consultantId: consultantId || null,
      referenceDoctor,
      technician,
      chargeId: chargeId || null,
      standardCharge,
      appliedCharge: standardCharge,
      bloodQty,
      note,
      discountPct,
      taxPct,
      applyTpa,
      payment: { amount: paymentAmount, mode: paymentMode },
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the highlighted fields');
      return;
    }
    try {
      await issue.mutateAsync(parsed.data);
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
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Issue ${title}`}
        size="xl"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" variant="secondary" onClick={() => submit(true)} loading={issue.isPending}>Save &amp; Print</Button>
            <Button type="button" onClick={() => submit(false)} loading={issue.isPending}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          <div className="grid grid-cols-3 gap-4 rounded-sm border border-border bg-surface-2 px-4 py-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-fg-muted">Bill No</p>
              <p className="font-medium tabular-nums">{nextIssue?.billNo ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-fg-muted">Case ID</p>
              <p className="font-medium tabular-nums">{patientId ? nextIssue?.caseNo ?? '—' : '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-fg-muted">Date</p>
              <p className="font-medium tabular-nums">{toLocalDateInput(new Date())}</p>
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

          <div className="flex items-center gap-2 pb-1">
            <Checkbox label="Apply TPA" checked={applyTpa} onChange={(e) => setApplyTpa(e.target.checked)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Hospital Doctor">
              <Select value={consultantId} onChange={(e) => setConsultantId(e.target.value)} placeholder="Select…" options={doctors.map((d) => ({ value: d.id, label: d.name }))} />
            </Field>
            <Field label="Reference Name">
              <TextInput value={referenceDoctor} onChange={(e) => setReferenceDoctor(e.target.value)} />
            </Field>
            <Field label="Technician">
              <TextInput value={technician} onChange={(e) => setTechnician(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Blood Group" required>
              <Select value={bloodGroup} onChange={(e) => { setBloodGroup(e.target.value); setBagId(''); }} placeholder="Select…" options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))} />
            </Field>
            <Field label={kind === 'blood' ? 'Bag No' : 'Components'} required>
              <Select
                value={bagId}
                onChange={(e) => setBagId(e.target.value)}
                placeholder="Select…"
                options={(bags?.data ?? []).map((b) => ({ value: b.id, label: kind === 'blood' ? `${b.bagNo} — ${b.donorName ?? ''}` : `${b.component} — ${b.bagNo}` }))}
              />
            </Field>
            <Field label="Blood Qty">
              <TextInput value={bloodQty} onChange={(e) => setBloodQty(e.target.value)} placeholder="1 Unit" />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Charge Category / Name">
              <Select
                value={chargeId}
                onChange={(e) => {
                  const c = charges?.data.find((x) => x.id === e.target.value);
                  setChargeId(e.target.value);
                  if (c) { setStandardCharge(String(c.standardCharge)); setTaxPct(String(c.taxPercent)); }
                }}
                placeholder="Select…"
                options={(charges?.data ?? []).map((c) => ({ value: c.id, label: c.categoryName ? `${c.categoryName} — ${c.name}` : c.name }))}
              />
            </Field>
            <Field label="Standard Charge ($)">
              <TextInput type="number" value={standardCharge} onChange={(e) => setStandardCharge(e.target.value)} />
            </Field>
          </div>

          <Field label="Note">
            <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>

          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2 rounded-md border border-border p-4 text-sm">
              <SummaryRow label="Total (#)" value={totals.subtotal.toFixed(2)} />
              <div className="flex items-center justify-between gap-2">
                <span className="text-fg-muted">Discount (%)</span>
                <input type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} className="h-8 w-28 rounded-sm border border-border bg-surface px-2 text-right text-sm tabular" />
              </div>
              <SummaryRow label="Discount (#)" value={totals.discount.toFixed(2)} />
              <SummaryRow label="Tax (#)" value={totals.tax.toFixed(2)} />
              <SummaryRow label="Net Amount (#)" value={totals.netAmount.toFixed(2)} bold />
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

      {/* Sibling, not a child — each Modal portals to <body> and the scroll lock
          is ref-counted, so the nested "New Patient" form stacks correctly. */}
      <PatientForm open={newPatientOpen} onClose={() => setNewPatientOpen(false)} onCreated={onPatientCreated} />
    </>
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
