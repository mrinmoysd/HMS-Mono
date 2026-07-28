'use client';

import { useEffect, useState } from 'react';
import { ipdAdmissionSchema } from '@smart-hospital/shared';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { PatientSelect } from '@/components/patient-select';
import { ChargeLineEditor, type ChargeLine } from '@/components/charge-line-editor';
import { useDoctors } from '@/lib/hooks/use-clinical';
import { useCharges } from '@/lib/hooks/use-masters';
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
  const { data: charges } = useCharges({ size: 100 });
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
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
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
  const [lines, setLines] = useState<ChargeLine[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: beds = [] } = useAvailableBeds(bedGroupId || undefined);

  function reset() {
    setPatientId('');
    setPatientLabel('');
    setConsultantId('');
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
    setLines([]);
    setErrors({});
    setApiError(null);
  }

  async function submit() {
    setApiError(null);
    const parsed = ipdAdmissionSchema.safeParse({
      patientId,
      consultantId,
      admissionDate: date,
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
      items: lines.filter((l) => l.name),
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
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={casualty} onChange={(e) => setCasualty(e.target.checked)} /> Casualty
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={oldPatient} onChange={(e) => setOldPatient(e.target.checked)} /> Old Patient
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={applyTpa} onChange={(e) => setApplyTpa(e.target.checked)} /> Apply TPA
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isAntenatal} onChange={(e) => setIsAntenatal(e.target.checked)} /> Is For Antenatal
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={liveConsult} onChange={(e) => setLiveConsult(e.target.checked)} /> Live Consultation
          </label>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">Initial Charges (optional)</p>
          <ChargeLineEditor lines={lines} onChange={setLines} charges={charges?.data} />
        </div>
      </div>
    </FormDrawer>
  );
}
