'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { useEffect, useState } from 'react';
import { ipdAdmissionSchema } from '@smart-hospital/shared';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { PatientSelect } from '@/components/patient-select';
import { PatientInfoCard } from '@/components/emr/patient-info-card';
import { SymptomsBlock } from '@/components/emr/symptoms-block';
import { useDoctors } from '@/lib/hooks/use-clinical';
import { useBedGroups, useAvailableBeds, useCreateAdmission } from '@/lib/hooks/use-ipd';
import { ApiRequestError } from '@/lib/api';

export function AdmissionForm({
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
  const { data: groups } = useBedGroups();
  const create = useCreateAdmission();

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
  const [bedGroupId, setBedGroupId] = useState('');
  const [bedId, setBedId] = useState('');
  const [creditLimit, setCreditLimit] = useState('20000');
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: beds = [] } = useAvailableBeds(bedGroupId || undefined);

  function reset() {
    setPatientId('');
    setPatientLabel('');
    setConsultantId('');
    setCaseNo('');
    setBedGroupId('');
    setBedId('');
    setCreditLimit('20000');
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
    setErrors({});
    setApiError(null);
  }

  async function submit() {
    setApiError(null);
    const parsed = ipdAdmissionSchema.safeParse({
      patientId,
      consultantId,
      admissionDate: date,
      caseNo,
      bedId,
      creditLimit,
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
    });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const i of parsed.error.issues) fe[String(i.path[0] ?? '')] = i.message;
      setErrors(fe);
      return;
    }
    try {
      await create.mutateAsync(parsed.data);
      reset();
      onClose();
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  return (
    <FormDrawer
      open={open}
      title="Add IPD Patient / Admission"
      onClose={onClose}
      onSubmit={submit}
      submitting={create.isPending}
      wide
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
        {/* The reference's IPD Symptoms block has no allergies field and calls
            the group "ICD-10 Groups" where OPD says "ICD Group" (§8.2). */}
        <SymptomsBlock
          showAllergies={false}
          groupLabel="ICD-10 Groups"
          value={{ symptomType, symptoms, symptomDescription, icd10Group, icd10Diagnosis, knownAllergies, previousMedicalIssue, note }}
          onChange={(p) => {
            if (p.symptomType !== undefined) setSymptomType(p.symptomType);
            if (p.symptoms !== undefined) setSymptoms(p.symptoms);
            if (p.symptomDescription !== undefined) setSymptomDescription(p.symptomDescription);
            if (p.icd10Group !== undefined) setIcd10Group(p.icd10Group);
            if (p.icd10Diagnosis !== undefined) setIcd10Diagnosis(p.icd10Diagnosis);
            if (p.previousMedicalIssue !== undefined) setPreviousMedicalIssue(p.previousMedicalIssue);
            if (p.note !== undefined) setNote(p.note);
          }}
        />

        <p className="border-t border-border pt-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">Admission Details</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Consultant Doctor" required error={errors.consultantId}>
            <Select
              value={consultantId}
              onChange={(e) => setConsultantId(e.target.value)}
              placeholder="Select…"
              options={doctors.map((d) => ({ value: d.id, label: d.name }))}
            />
          </Field>
          <Field label="Admission Date" required error={errors.admissionDate}>
            <TextInput type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          {/* Blank mints a new case; a number continues that episode. */}
          <Field label="Case" error={errors.caseNo}>
            <TextInput
              value={caseNo}
              onChange={(e) => setCaseNo(e.target.value)}
              placeholder="Blank = new case"
            />
          </Field>
          <Field label="Bed Group">
            <Select
              value={bedGroupId}
              onChange={(e) => {
                setBedGroupId(e.target.value);
                setBedId('');
              }}
              placeholder="All groups"
              options={(groups?.data ?? []).map((g) => ({
                value: g.id,
                label: g.floorName ? `${g.floorName} · ${g.name}` : g.name,
              }))}
            />
          </Field>
          <Field label="Bed Number" required error={errors.bedId}>
            <Select
              value={bedId}
              onChange={(e) => setBedId(e.target.value)}
              placeholder={beds.length ? 'Select bed…' : 'No available beds'}
              options={beds.map((b) => ({ value: b.id, label: `${b.bedGroupName} · ${b.bedNo}` }))}
            />
          </Field>
          <Field label="Credit Limit" error={errors.creditLimit}>
            <TextInput type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
          </Field>
          <Field label="Reference">
            <TextInput value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4">
          <Checkbox label="Casualty" checked={casualty} onChange={(e) => setCasualty(e.target.checked)} />
          <Checkbox label="Old Patient" checked={oldPatient} onChange={(e) => setOldPatient(e.target.checked)} />
          <Checkbox label="Apply TPA" checked={applyTpa} onChange={(e) => setApplyTpa(e.target.checked)} />
          <Checkbox label="Is For Antenatal" checked={isAntenatal} onChange={(e) => setIsAntenatal(e.target.checked)} />
          <Checkbox label="Live Consultation" checked={liveConsult} onChange={(e) => setLiveConsult(e.target.checked)} />
        </div>

        {/* No charges block here on purpose (blueprint rule #5): an admission
            writes an ipd_admission and a bed_history row, not a bill. IPD
            charges accrue afterwards on the profile's Charges tab, where they
            can be added over a stay that runs for days. */}
      </div>
    </FormDrawer>
  );
}

/**
 * `yyyy-mm-ddThh:mm` for now, in local time. Never toISOString — that is UTC
 * and lands the admission on the wrong day either side of midnight.
 */
function localNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
