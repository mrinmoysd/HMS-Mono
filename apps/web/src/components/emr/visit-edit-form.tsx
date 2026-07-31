'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import type { OpdVisitDetailDto } from '@smart-hospital/shared';
import { opdVisitUpdateSchema } from '@smart-hospital/shared';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { useDoctors, useUpdateOpdVisit } from '@/lib/hooks/use-clinical';
import { ApiRequestError } from '@/lib/api';

/**
 * Edit "Patient Details" (Visits-tab pencil, V1). Charges/payment stay out of scope here —
 * they're edited on the encounter page's dedicated Charges/Payments tabs.
 */
export function VisitEditForm({ visit, onDone, onCancel }: { visit: OpdVisitDetailDto; onDone: () => void; onCancel: () => void }) {
  const { data: doctors = [] } = useDoctors();
  const update = useUpdateOpdVisit();

  const [consultantId, setConsultantId] = useState(visit.consultantId);
  const [date, setDate] = useState(visit.appointmentDate.slice(0, 10));
  const [symptomType, setSymptomType] = useState(visit.symptomType ?? '');
  const [symptoms, setSymptoms] = useState(visit.symptoms ?? '');
  const [symptomDescription, setSymptomDescription] = useState(visit.symptomDescription ?? '');
  const [icd10Group, setIcd10Group] = useState(visit.icd10Group ?? '');
  const [icd10Diagnosis, setIcd10Diagnosis] = useState(visit.icd10Diagnosis ?? '');
  const [knownAllergies, setKnownAllergies] = useState(visit.knownAllergies ?? '');
  const [previousMedicalIssue, setPreviousMedicalIssue] = useState(visit.previousMedicalIssue ?? '');
  const [note, setNote] = useState(visit.note ?? '');
  const [reference, setReference] = useState(visit.reference ?? '');
  const [casualty, setCasualty] = useState(visit.casualty);
  const [oldPatient, setOldPatient] = useState(visit.oldPatient);
  const [applyTpa, setApplyTpa] = useState(visit.applyTpa);
  const [isAntenatal, setIsAntenatal] = useState(visit.isAntenatal);
  const [liveConsult, setLiveConsult] = useState(visit.liveConsult);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  async function submit() {
    setApiError(null);
    const parsed = opdVisitUpdateSchema.safeParse({
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
    });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const i of parsed.error.issues) fe[String(i.path[0] ?? '')] = i.message;
      setErrors(fe);
      return;
    }
    try {
      await update.mutateAsync({ id: visit.id, input: parsed.data });
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
