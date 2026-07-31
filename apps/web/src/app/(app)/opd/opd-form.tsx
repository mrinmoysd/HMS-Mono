'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { useEffect, useState } from 'react';
import { computeInvoiceTotals, opdVisitSchema } from '@smart-hospital/shared';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Button } from '@/components/ui/button';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { PatientSelect } from '@/components/patient-select';
import { ChargeLineEditor, type ChargeLine } from '@/components/charge-line-editor';
import { useDoctors, useCreateOpdVisit } from '@/lib/hooks/use-clinical';
import { useCharges } from '@/lib/hooks/use-masters';
import { ApiRequestError } from '@/lib/api';
import { printOpdVisitSlip } from '@/lib/print';

export function OpdForm({
  open,
  onClose,
  initialPatientId = '',
  initialPatientLabel = '',
}: {
  open: boolean;
  onClose: () => void;
  initialPatientId?: string;
  initialPatientLabel?: string;
}) {
  const { data: doctors = [] } = useDoctors();
  const { data: chargeData } = useCharges({ size: 100 });
  const create = useCreateOpdVisit();

  const [patientId, setPatientId] = useState(initialPatientId);
  const [patientLabel, setPatientLabel] = useState(initialPatientLabel);

  // Preselect the patient when opened from the patient-list quick-create menu.
  useEffect(() => {
    if (open && initialPatientId) {
      setPatientId(initialPatientId);
      setPatientLabel(initialPatientLabel);
    }
  }, [open, initialPatientId, initialPatientLabel]);
  const [consultantId, setConsultantId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [symptomType, setSymptomType] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [symptomDescription, setSymptomDescription] = useState('');
  const [icd10Group, setIcd10Group] = useState('');
  const [icd10Diagnosis, setIcd10Diagnosis] = useState('');
  const [knownAllergies, setKnownAllergies] = useState('');
  const [previousMedicalIssue, setPreviousMedicalIssue] = useState('');
  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');
  const [casualty, setCasualty] = useState(false);
  const [oldPatient, setOldPatient] = useState(false);
  const [applyTpa, setApplyTpa] = useState(false);
  const [isAntenatal, setIsAntenatal] = useState(false);
  const [liveConsult, setLiveConsult] = useState(false);
  const [lines, setLines] = useState<ChargeLine[]>([
    { name: '', appliedCharge: 0, standardCharge: 0, qty: 1, discountPct: 0, taxPct: 0 },
  ]);
  const [payAmount, setPayAmount] = useState('0');
  const [payMode, setPayMode] = useState('cash');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const net = computeInvoiceTotals(lines.filter((l) => l.name)).netAmount;

  function reset() {
    setPatientId('');
    setPatientLabel('');
    setConsultantId('');
    setSymptomType('');
    setSymptoms('');
    setSymptomDescription('');
    setIcd10Group('');
    setIcd10Diagnosis('');
    setKnownAllergies('');
    setPreviousMedicalIssue('');
    setNote('');
    setReference('');
    setCasualty(false);
    setOldPatient(false);
    setApplyTpa(false);
    setIsAntenatal(false);
    setLiveConsult(false);
    setLines([{ name: '', appliedCharge: 0, standardCharge: 0, qty: 1, discountPct: 0, taxPct: 0 }]);
    setPayAmount('0');
    setErrors({});
    setApiError(null);
  }

  async function submit(print = false) {
    setApiError(null);
    const parsed = opdVisitSchema.safeParse({
      patientId,
      consultantId,
      appointmentDate: date,
      symptomType,
      symptoms,
      symptomDescription,
      icd10Group,
      icd10Diagnosis,
      knownAllergies,
      previousMedicalIssue,
      note,
      reference,
      casualty,
      oldPatient,
      applyTpa,
      isAntenatal,
      liveConsult,
      items: lines.filter((l) => l.name),
      payment: { amount: Number(payAmount) || 0, mode: payMode },
    });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const i of parsed.error.issues) {
        const key = String(i.path[0] ?? '');
        fe[key] = i.message;
      }
      setErrors(fe);
      return;
    }
    try {
      const visit = await create.mutateAsync(parsed.data);
      if (print) printOpdVisitSlip(visit);
      reset();
      onClose();
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  return (
    <FormDrawer
      open={open}
      title="Add OPD Patient"
      onClose={onClose}
      onSubmit={() => submit(false)}
      submitting={create.isPending}
      wide
      extraActions={
        <Button type="button" variant="secondary" onClick={() => submit(true)} loading={create.isPending}>
          Save &amp; Print
        </Button>
      }
    >
      {apiError && (
        <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
          {apiError}
        </p>
      )}
      <div className="space-y-4">
        <Field label="Patient" required error={errors.patientId}>
          <PatientSelect
            value={patientId}
            selectedLabel={patientLabel}
            onChange={(id, label) => {
              setPatientId(id);
              setPatientLabel(label);
            }}
          />
        </Field>

        <p className="border-t border-border pt-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">Symptoms</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Symptoms Type">
            <TextInput value={symptomType} onChange={(e) => setSymptomType(e.target.value)} placeholder="e.g. Fever" />
          </Field>
          <Field label="Symptoms Title">
            <TextInput value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
          </Field>
          <Field label="ICD-10 Group">
            <TextInput value={icd10Group} onChange={(e) => setIcd10Group(e.target.value)} />
          </Field>
          <Field label="ICD-10 Diagnosis">
            <TextInput value={icd10Diagnosis} onChange={(e) => setIcd10Diagnosis(e.target.value)} />
          </Field>
        </div>
        <Field label="Symptoms Description">
          <TextArea value={symptomDescription} onChange={(e) => setSymptomDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Any Known Allergies">
            <TextInput value={knownAllergies} onChange={(e) => setKnownAllergies(e.target.value)} />
          </Field>
          <Field label="Previous Medical Issue">
            <TextInput value={previousMedicalIssue} onChange={(e) => setPreviousMedicalIssue(e.target.value)} />
          </Field>
        </div>
        <Field label="Note">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        <p className="border-t border-border pt-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">Visit Details</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Consultant Doctor" required error={errors.consultantId}>
            <Select
              value={consultantId}
              onChange={(e) => setConsultantId(e.target.value)}
              placeholder="Select…"
              options={doctors.map((d) => ({ value: d.id, label: d.name }))}
            />
          </Field>
          <Field label="Appointment Date" required error={errors.appointmentDate}>
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Reference">
            <TextInput value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4">
          <Checkbox label="Casualty" checked={casualty} onChange={(e) => setCasualty(e.target.checked)} />
          <Checkbox label="Old Patient" checked={oldPatient} onChange={(e) => setOldPatient(e.target.checked)} />
          <Checkbox label="Apply TPA" checked={applyTpa} onChange={(e) => setApplyTpa(e.target.checked)} />
          <Checkbox label="Is Antenatal" checked={isAntenatal} onChange={(e) => setIsAntenatal(e.target.checked)} />
          <Checkbox label="Live Consultation" checked={liveConsult} onChange={(e) => setLiveConsult(e.target.checked)} />
        </div>

        <p className="border-t border-border pt-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">Consultant Doctor &amp; Charges</p>
        <div>
          {errors.items && <p className="mb-1 text-xs text-danger">{errors.items}</p>}
          <ChargeLineEditor lines={lines} onChange={setLines} charges={chargeData?.data} />
        </div>

        <p className="border-t border-border pt-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">Payment</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label={`Paid Amount (Net ${net.toFixed(2)})`}>
            <TextInput type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          </Field>
          <Field label="Payment Mode">
            <Select
              value={payMode}
              onChange={(e) => setPayMode(e.target.value)}
              options={['cash', 'card', 'upi', 'tpa', 'cheque'].map((m) => ({ value: m, label: m }))}
            />
          </Field>
        </div>
      </div>
    </FormDrawer>
  );
}
