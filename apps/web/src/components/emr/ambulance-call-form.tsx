'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { ambulanceCallSchema, computeInvoiceTotals, type PatientDto } from '@smart-hospital/shared';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { PatientSelect } from '@/components/patient-select';
import { PatientForm } from '@/app/(app)/patient/patient-form';
import { useCatalog, useCharges } from '@/lib/hooks/use-masters';
import { useAmbulanceVehicles, useCreateCall } from '@/lib/hooks/use-finance';
import { ApiRequestError } from '@/lib/api';

/** "Add Ambulance Call" — patient (+ inline New Patient), vehicle w/ driver auto-fill, two-step Charge Category/Name, payment. */
export function AmbulanceCallForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: vehicles } = useAmbulanceVehicles();
  const { data: categories } = useCatalog('charge-category', { size: 100 });
  const { data: charges } = useCharges({ size: 300, module: 'ambulance' });
  const create = useCreateCall();

  const [patientId, setPatientId] = useState('');
  const [patientLabel, setPatientLabel] = useState('');
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('');
  const [chargeId, setChargeId] = useState('');
  const [standardCharge, setStandardCharge] = useState('0');
  const [note, setNote] = useState('');
  const [discountPct, setDiscountPct] = useState('0');
  const [taxPct, setTaxPct] = useState('0');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const vehicle = (vehicles?.data ?? []).find((v) => v.id === vehicleId);
  const chargeOptions = (charges?.data ?? []).filter((c) => !categoryId || c.categoryId === categoryId);

  const totals = computeInvoiceTotals([
    { name: 'x', standardCharge: Number(standardCharge) || 0, appliedCharge: Number(standardCharge) || 0, qty: 1, discountPct: Number(discountPct) || 0, taxPct: Number(taxPct) || 0 },
  ]);

  function reset() {
    setPatientId(''); setPatientLabel(''); setVehicleId(''); setAddress(''); setCategoryId(''); setChargeId('');
    setStandardCharge('0'); setNote(''); setDiscountPct('0'); setTaxPct('0'); setPaymentMode('cash'); setPaymentAmount('0'); setError(null);
  }

  async function submit(print: boolean) {
    setError(null);
    const parsed = ambulanceCallSchema.safeParse({
      vehicleId,
      patientId,
      patientAddress: address,
      date,
      chargeId,
      standardCharge,
      discountPct,
      taxPct,
      note,
      payment: { amount: paymentAmount, mode: paymentMode },
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the highlighted fields');
      return;
    }
    try {
      await create.mutateAsync(parsed.data);
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
        title="Add Ambulance Call"
        size="xl"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" variant="secondary" onClick={() => submit(true)} loading={create.isPending}>Save &amp; Print</Button>
            <Button type="button" onClick={() => submit(false)} loading={create.isPending}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

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

          <Field label="Patient Address"><TextInput value={address} onChange={(e) => setAddress(e.target.value)} /></Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Vehicle Model" required>
              <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} placeholder="Select"
                options={(vehicles?.data ?? []).map((v) => ({ value: v.id, label: `${v.vehicleNo} — ${v.model ?? ''}` }))} />
            </Field>
            <Field label="Driver Name">
              <TextInput value={vehicle?.driverName ?? ''} disabled />
            </Field>
            <Field label="Date" required>
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Charge Category" required>
              <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setChargeId(''); }} placeholder="Select"
                options={(categories?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
            </Field>
            <Field label="Charge Name" required>
              <Select
                value={chargeId}
                onChange={(e) => {
                  const c = chargeOptions.find((x) => x.id === e.target.value);
                  setChargeId(e.target.value);
                  if (c) { setStandardCharge(String(c.standardCharge)); setTaxPct(String(c.taxPercent)); }
                }}
                placeholder="Select"
                options={chargeOptions.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Field>
            <Field label="Standard Charge ($)" required>
              <TextInput type="number" value={standardCharge} onChange={(e) => setStandardCharge(e.target.value)} />
            </Field>
          </div>

          <Field label="Note"><TextArea value={note} onChange={(e) => setNote(e.target.value)} /></Field>

          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2 rounded-md border border-border p-4 text-sm">
              <SummaryRow label="Total ($)" value={totals.subtotal.toFixed(2)} />
              <div className="flex items-center justify-between gap-2">
                <span className="text-fg-muted">Discount (%)</span>
                <input type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} className="h-8 w-28 rounded-sm border border-border bg-surface px-2 text-right text-sm tabular" />
              </div>
              <SummaryRow label="Discount ($)" value={totals.discount.toFixed(2)} />
              <div className="flex items-center justify-between gap-2">
                <span className="text-fg-muted">Tax (%)</span>
                <input type="number" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} className="h-8 w-28 rounded-sm border border-border bg-surface px-2 text-right text-sm tabular" />
              </div>
              <SummaryRow label="Tax ($)" value={totals.tax.toFixed(2)} />
              <SummaryRow label="Net Amount ($)" value={totals.netAmount.toFixed(2)} bold />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Field label="Payment Mode">
                  <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} options={['cash', 'card', 'upi', 'tpa', 'cheque'].map((m) => ({ value: m, label: m.toUpperCase() }))} />
                </Field>
                <Field label="Amount ($)">
                  <TextInput type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
        </div>

      </Modal>

      {/* Sibling, not a child: each Modal portals to <body> and the scroll lock
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
