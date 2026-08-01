'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { useEffect, useState } from 'react';
import { computeInvoiceTotals, opdVisitSchema } from '@smart-hospital/shared';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Button } from '@/components/ui/button';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { PatientSelect } from '@/components/patient-select';
import { PatientInfoCard } from '@/components/emr/patient-info-card';
import { ChargeLineEditor, type ChargeLine } from '@/components/charge-line-editor';
import { SymptomsBlock } from '@/components/emr/symptoms-block';
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
  const { data: chargeData } = useCharges({ size: 100, module: 'opd' });
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
  const [date, setDate] = useState(localNow());
  const [caseNo, setCaseNo] = useState('');
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
    setCaseNo('');
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
      caseNo,
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

        {patientId && <PatientInfoCard patientId={patientId} />}

        <p className="border-t border-border pt-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">Symptoms</p>
        <SymptomsBlock
          value={{ symptomType, symptoms, symptomDescription, icd10Group, icd10Diagnosis, knownAllergies, previousMedicalIssue, note }}
          onChange={(p) => {
            if (p.symptomType !== undefined) setSymptomType(p.symptomType);
            if (p.symptoms !== undefined) setSymptoms(p.symptoms);
            if (p.symptomDescription !== undefined) setSymptomDescription(p.symptomDescription);
            if (p.icd10Group !== undefined) setIcd10Group(p.icd10Group);
            if (p.icd10Diagnosis !== undefined) setIcd10Diagnosis(p.icd10Diagnosis);
            if (p.knownAllergies !== undefined) setKnownAllergies(p.knownAllergies);
            if (p.previousMedicalIssue !== undefined) setPreviousMedicalIssue(p.previousMedicalIssue);
            if (p.note !== undefined) setNote(p.note);
          }}
        />

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
            <TextInput type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          {/* Blank mints a new case; typing an existing number continues that
              episode. The API refuses a case belonging to another patient. */}
          <Field label="Case" error={errors.caseNo}>
            <TextInput
              value={caseNo}
              onChange={(e) => setCaseNo(e.target.value)}
              placeholder="Blank = new case"
            />
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

/**
 * `yyyy-mm-ddThh:mm` for now, in local time. Never toISOString — that is UTC
 * and lands the visit on the wrong day either side of midnight.
 */
function localNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
