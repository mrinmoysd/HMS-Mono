'use client';

import { useEffect, useState } from 'react';
import { Upload, X } from 'lucide-react';
import {
  BLOOD_GROUPS,
  GENDERS,
  MARITAL_STATUS,
  patientSchema,
  type PatientDto,
} from '@smart-hospital/shared';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { CustomFieldRenderer } from '@/components/custom-field-renderer';
import { useCreatePatient, useUpdatePatient, usePatientPhoneLookup } from '@/lib/hooks/use-patients';
import { useCustomFields } from '@/lib/hooks/use-custom-fields';
import { useTpas } from '@/lib/hooks/use-masters';
import { ApiRequestError } from '@/lib/api';
import { ageFromDob, composeAge, parseAge, formatAge } from '@/lib/utils';

interface Props {
  open: boolean;
  patient?: PatientDto | null;
  onClose: () => void;
  onCreated?: (patient: PatientDto) => void;
}

type FormState = Record<string, string>;

const EMPTY: FormState = {
  name: '',
  guardianName: '',
  gender: '',
  dob: '',
  age: '',
  photoUrl: '',
  bloodGroup: '',
  maritalStatus: '',
  phone: '',
  email: '',
  address: '',
  allergies: '',
  prevMedicalIssue: '',
  remarks: '',
  tpaId: '',
  tpaIdNo: '',
  tpaValidity: '',
  nationalId: '',
  alternateNo: '',
};

export function PatientForm({ open, patient, onClose, onCreated }: Props) {
  const create = useCreatePatient();
  const update = useUpdatePatient();
  const { data: customFields = [] } = useCustomFields('patient');
  const { data: tpas } = useTpas();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [ageParts, setAgePartsState] = useState({ years: 0, months: 0, days: 0 });
  const [custom, setCustom] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dupDismissed, setDupDismissed] = useState(false);

  // Shared-number checkpoint: warn (never block) when this phone is already on file.
  // Only relevant when adding a new patient — skipped in edit mode.
  const { data: phoneMatches } = usePatientPhoneLookup(patient ? '' : form.phone);
  const phoneDuplicates = phoneMatches ?? [];
  const showDupWarning = !patient && !dupDismissed && phoneDuplicates.length > 0;

  useEffect(() => {
    if (open) {
      setErrors({});
      setApiError(null);
      setCustom({});
      setDragging(false);
      setDupDismissed(false);
      setAgePartsState(parseAge(patient?.age));
      setForm(
        patient
          ? {
              ...EMPTY,
              name: patient.name ?? '',
              guardianName: patient.guardianName ?? '',
              gender: patient.gender ?? '',
              dob: patient.dob ? patient.dob.slice(0, 10) : '',
              age: patient.age ?? '',
              photoUrl: patient.photoUrl ?? '',
              bloodGroup: patient.bloodGroup ?? '',
              maritalStatus: patient.maritalStatus ?? '',
              phone: patient.phone ?? '',
              email: patient.email ?? '',
              address: patient.address ?? '',
              remarks: patient.remarks ?? '',
              tpaId: patient.tpaId ?? '',
              tpaIdNo: patient.tpaIdNo ?? '',
              tpaValidity: patient.tpaValidity ? patient.tpaValidity.slice(0, 10) : '',
            }
          : EMPTY,
      );
    }
  }, [open, patient]);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /** Edit one Y/M/D part; keep the canonical `age` string ("Y-M-D") in sync. */
  function setAgePart(part: 'years' | 'months' | 'days', value: string) {
    const next = { ...ageParts, [part]: Math.max(0, Number.parseInt(value || '0', 10) || 0) };
    setAgePartsState(next);
    set('age', composeAge(next));
  }

  /** Picking a DOB auto-computes the age (like the demo). */
  function setDob(value: string) {
    set('dob', value);
    if (value) {
      const parts = ageFromDob(value);
      setAgePartsState(parts);
      set('age', composeAge(parts));
    }
  }

  function readPhoto(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => set('photoUrl', String(reader.result));
    reader.readAsDataURL(file);
  }

  async function submit() {
    setApiError(null);
    // strip empty strings before validating optional fields
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
    const parsed = patientSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string') fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    // required custom fields
    const cfErrors: Record<string, string> = {};
    for (const f of customFields) {
      if (f.required && !custom[f.key]) cfErrors[f.key] = `${f.label} is required`;
    }
    if (Object.keys(cfErrors).length) {
      setErrors(cfErrors);
      return;
    }
    const withCustom = { ...parsed.data, customFields: custom };
    setErrors({});
    try {
      if (patient) {
        await update.mutateAsync({ id: patient.id, input: withCustom });
      } else {
        const created = await create.mutateAsync(withCustom);
        onCreated?.(created);
      }
      onClose();
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  return (
    <FormDrawer
      open={open}
      title={patient ? 'Edit Patient' : 'Add Patient'}
      onClose={onClose}
      onSubmit={submit}
      submitting={create.isPending || update.isPending}
    >
      {apiError && (
        <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
          {apiError}
        </p>
      )}
      {showDupWarning && (
        <div role="status" className="mb-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <p className="font-medium">
            {phoneDuplicates.length} patient{phoneDuplicates.length > 1 ? 's' : ''} already registered on this number
          </p>
          <ul className="mt-2 space-y-1">
            {phoneDuplicates.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3">
                <span>
                  <span className="font-medium">{m.name}</span>
                  <span className="ml-2 text-xs text-fg-muted">
                    {m.patientNo} · {formatAge(m.age)}{m.gender ? ` · ${m.gender}` : ''}
                  </span>
                </span>
                {onCreated && (
                  <button
                    type="button"
                    onClick={() => { onCreated(m); onClose(); }}
                    className="shrink-0 rounded-sm border border-border px-2 py-1 text-xs text-primary hover:bg-primary/10"
                  >
                    Use existing
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setDupDismissed(true)}
            className="mt-2 text-xs text-fg-muted underline hover:text-fg"
          >
            Add new patient anyway
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" required error={errors.name} className="col-span-2">
          <TextInput value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>

        <Field label="Photo" className="col-span-2">
          <div className="flex items-center gap-4">
            {form.photoUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.photoUrl} alt="Patient" className="h-20 w-20 rounded-md object-cover" />
                <button
                  type="button"
                  onClick={() => set('photoUrl', '')}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white"
                  aria-label="Remove photo"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); readPhoto(e.dataTransfer.files?.[0]); }}
                className={`flex h-20 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-fg-muted ${dragging ? 'border-primary bg-primary/5' : 'border-border'}`}
              >
                <Upload className="h-4 w-4" />
                <span>Drag &amp; drop or click to upload</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => readPhoto(e.target.files?.[0])} />
              </label>
            )}
          </div>
        </Field>

        <Field label="Guardian Name" error={errors.guardianName}>
          <TextInput value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)} />
        </Field>
        <Field label="Date of Birth">
          <TextInput type="date" value={form.dob} onChange={(e) => setDob(e.target.value)} />
        </Field>
        <Field label="Age" required error={errors.age} className="col-span-2">
          <div className="grid grid-cols-3 gap-2">
            <TextInput type="number" min={0} value={String(ageParts.years)} onChange={(e) => setAgePart('years', e.target.value)} placeholder="Years" />
            <TextInput type="number" min={0} value={String(ageParts.months)} onChange={(e) => setAgePart('months', e.target.value)} placeholder="Months" />
            <TextInput type="number" min={0} value={String(ageParts.days)} onChange={(e) => setAgePart('days', e.target.value)} placeholder="Days" />
          </div>
        </Field>
        <Field label="Gender" error={errors.gender}>
          <Select
            value={form.gender}
            onChange={(e) => set('gender', e.target.value)}
            placeholder="Select…"
            options={GENDERS.map((g) => ({ value: g, label: g }))}
          />
        </Field>
        <Field label="Blood Group" error={errors.bloodGroup}>
          <Select
            value={form.bloodGroup}
            onChange={(e) => set('bloodGroup', e.target.value)}
            placeholder="Select…"
            options={BLOOD_GROUPS.map((b) => ({ value: b, label: b }))}
          />
        </Field>
        <Field label="Marital Status" error={errors.maritalStatus}>
          <Select
            value={form.maritalStatus}
            onChange={(e) => set('maritalStatus', e.target.value)}
            placeholder="Select…"
            options={MARITAL_STATUS.map((m) => ({ value: m, label: m }))}
          />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <TextInput
            value={form.phone}
            onChange={(e) => { set('phone', e.target.value); setDupDismissed(false); }}
          />
        </Field>
        <Field label="Email" error={errors.email}>
          <TextInput value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Alternate Number" error={errors.alternateNo}>
          <TextInput value={form.alternateNo} onChange={(e) => set('alternateNo', e.target.value)} />
        </Field>
        <Field label="National Identification Number" error={errors.nationalId} className="col-span-2">
          <TextInput value={form.nationalId} onChange={(e) => set('nationalId', e.target.value)} />
        </Field>

        <Field label="TPA" error={errors.tpaId}>
          <Select
            value={form.tpaId}
            onChange={(e) => set('tpaId', e.target.value)}
            placeholder="Select…"
            options={(tpas?.data ?? []).map((t) => ({ value: t.id, label: t.name }))}
          />
        </Field>
        <Field label="TPA ID" error={errors.tpaIdNo}>
          <TextInput value={form.tpaIdNo} onChange={(e) => set('tpaIdNo', e.target.value)} />
        </Field>
        <Field label="TPA Validity" error={errors.tpaValidity} className="col-span-2">
          <TextInput type="date" value={form.tpaValidity} onChange={(e) => set('tpaValidity', e.target.value)} />
        </Field>
        <Field label="Address" error={errors.address} className="col-span-2">
          <TextArea value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="Known Allergies" error={errors.allergies} className="col-span-2">
          <TextArea value={form.allergies} onChange={(e) => set('allergies', e.target.value)} />
        </Field>
        <Field label="Previous Medical Issue" error={errors.prevMedicalIssue} className="col-span-2">
          <TextArea value={form.prevMedicalIssue} onChange={(e) => set('prevMedicalIssue', e.target.value)} />
        </Field>
        <Field label="Remarks" error={errors.remarks} className="col-span-2">
          <TextArea value={form.remarks} onChange={(e) => set('remarks', e.target.value)} />
        </Field>

        {customFields.length > 0 && (
          <div className="col-span-2 mt-2 border-t border-border pt-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">
            Additional Information
          </div>
        )}
        <CustomFieldRenderer
          fields={customFields}
          values={custom}
          onChange={(k, v) => setCustom((c) => ({ ...c, [k]: v }))}
          errors={errors}
        />
      </div>
    </FormDrawer>
  );
}
