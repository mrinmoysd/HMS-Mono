'use client';

import { useState } from 'react';
import type { IpdAdmissionDetailDto } from '@smart-hospital/shared';
import { ipdAdmissionUpdateSchema } from '@smart-hospital/shared';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { useDoctors } from '@/lib/hooks/use-clinical';
import { useUpdateIpdAdmission } from '@/lib/hooks/use-ipd';
import { ApiRequestError } from '@/lib/api';

/** Edit an IPD admission's clinical/admin fields. Bed changes stay on the dedicated Bed History tab. */
export function IpdAdmissionEditForm({ admission, onDone, onCancel }: { admission: IpdAdmissionDetailDto; onDone: () => void; onCancel: () => void }) {
  const { data: doctors = [] } = useDoctors();
  const update = useUpdateIpdAdmission();

  const [consultantId, setConsultantId] = useState(admission.consultantId);
  const [date, setDate] = useState(admission.admissionDate.slice(0, 10));
  const [creditLimit, setCreditLimit] = useState(String(admission.creditLimit));
  const [symptomType, setSymptomType] = useState(admission.symptomType ?? '');
  const [symptoms, setSymptoms] = useState(admission.symptoms ?? '');
  const [symptomDescription, setSymptomDescription] = useState(admission.symptomDescription ?? '');
  const [icd10Group, setIcd10Group] = useState(admission.icd10Group ?? '');
  const [icd10Diagnosis, setIcd10Diagnosis] = useState(admission.icd10Diagnosis ?? '');
  const [knownAllergies, setKnownAllergies] = useState(admission.knownAllergies ?? '');
  const [previousMedicalIssue, setPreviousMedicalIssue] = useState(admission.previousMedicalIssue ?? '');
  const [note, setNote] = useState(admission.note ?? '');
  const [reference, setReference] = useState(admission.reference ?? '');
  const [casualty, setCasualty] = useState(admission.casualty);
  const [oldPatient, setOldPatient] = useState(admission.oldPatient);
  const [applyTpa, setApplyTpa] = useState(admission.applyTpa);
  const [isAntenatal, setIsAntenatal] = useState(admission.isAntenatal);
  const [liveConsult, setLiveConsult] = useState(admission.liveConsult);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  async function submit() {
    setApiError(null);
    const parsed = ipdAdmissionUpdateSchema.safeParse({
      consultantId,
      admissionDate: date,
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
      await update.mutateAsync({ id: admission.id, input: parsed.data });
      onDone();
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  return (
    <div className="space-y-4">
      {apiError && (
        <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
          {apiError}
        </p>
      )}

      <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Symptoms</p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Symptoms Type">
          <TextInput value={symptomType} onChange={(e) => setSymptomType(e.target.value)} />
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
        <Field label="Credit Limit">
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
          <input type="checkbox" checked={isAntenatal} onChange={(e) => setIsAntenatal(e.target.checked)} /> Is Antenatal
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={liveConsult} onChange={(e) => setLiveConsult(e.target.checked)} /> Live Consultation
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={submit} loading={update.isPending}>
          Save
        </Button>
      </div>
    </div>
  );
}
