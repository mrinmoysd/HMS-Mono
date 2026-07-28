'use client';

import { useEffect, useState } from 'react';
import { Upload, UserPlus, X } from 'lucide-react';
import { BLOOD_GROUPS, GENDERS, birthRecordSchema, type BirthRecordDto, type PatientDto } from '@smart-hospital/shared';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { PatientSelect } from '@/components/patient-select';
import { PatientForm } from '@/app/(app)/patient/patient-form';
import { useCreateBirth, useUpdateBirth } from '@/lib/hooks/use-office';
import { ApiRequestError } from '@/lib/api';

const PHOTO_FIELDS = [
  { key: 'childPhotoUrl', label: 'Child Photo' },
  { key: 'motherPhotoUrl', label: 'Mother Photo' },
  { key: 'fatherPhotoUrl', label: 'Father Photo' },
  { key: 'documentUrl', label: 'Attach Document Photo' },
] as const;

/** Add/Edit Birth Record — mother is a linked Patient (auto-resolves Case ID). */
export function BirthRecordForm({ open, record, onClose }: { open: boolean; record?: BirthRecordDto | null; onClose: () => void }) {
  const create = useCreateBirth();
  const update = useUpdateBirth();
  const isEdit = !!record;

  const [patientId, setPatientId] = useState('');
  const [patientLabel, setPatientLabel] = useState('');
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) return;
    if (record) {
      setPatientId(record.patientId ?? '');
      setPatientLabel(record.motherName ? `${record.motherName}${record.patientNo ? ` · ${record.patientNo}` : ''}` : '');
      setF({
        childName: record.childName,
        gender: record.gender ?? '',
        weight: record.weight ?? '',
        birthDate: record.birthDate.slice(0, 10),
        phone: record.phone ?? '',
        caseNo: record.caseNo ?? '',
        fatherName: record.fatherName ?? '',
        address: record.address ?? '',
        report: record.report ?? '',
        bloodGroup: record.bloodGroup ?? '',
        childPhotoUrl: record.childPhotoUrl ?? '',
        motherPhotoUrl: record.motherPhotoUrl ?? '',
        fatherPhotoUrl: record.fatherPhotoUrl ?? '',
        documentUrl: record.documentUrl ?? '',
      });
    } else {
      setPatientId(''); setPatientLabel('');
      setF({ birthDate: new Date().toISOString().slice(0, 10) });
    }
    setError(null);
  }, [open, record]);

  if (!open) return null;

  function onPatientCreated(p: PatientDto) {
    setPatientId(p.id);
    setPatientLabel(`${p.name} · ${p.patientNo}`);
  }

  function readPhoto(key: string, file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => set(key, String(reader.result));
    reader.readAsDataURL(file);
  }

  async function submit() {
    setError(null);
    const payload = Object.fromEntries(Object.entries({ ...f, patientId }).filter(([, v]) => v !== ''));
    const parsed = birthRecordSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the highlighted fields');
      return;
    }
    try {
      if (isEdit && record) await update.mutateAsync({ id: record.id, input: parsed.data });
      else await create.mutateAsync(parsed.data);
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  const saving = create.isPending || update.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit Birth Record' : 'Add Birth Record'} className="relative w-full max-w-4xl rounded-md bg-surface shadow-xl">
        <div className="flex items-center justify-between rounded-t-md bg-primary px-5 py-3 text-primary-fg">
          <h2 className="text-base font-semibold">{isEdit ? 'Edit Birth Record' : 'Add Birth Record'}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
          {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          <div>
            <h3 className="mb-3 text-sm font-semibold">Birth Record Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Field label="Child Name" required><TextInput value={f.childName ?? ''} onChange={(e) => set('childName', e.target.value)} /></Field>
              <Field label="Gender" required><Select value={f.gender ?? ''} onChange={(e) => set('gender', e.target.value)} placeholder="Select" options={GENDERS.map((g) => ({ value: g, label: g.charAt(0).toUpperCase() + g.slice(1) }))} /></Field>
              <Field label="Weight" required><TextInput value={f.weight ?? ''} onChange={(e) => set('weight', e.target.value)} /></Field>
              <Field label="Birth Date" required><TextInput type="date" value={f.birthDate ?? ''} onChange={(e) => set('birthDate', e.target.value)} /></Field>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Field label="Phone"><TextInput value={f.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
              <Field label="Case ID"><TextInput value={f.caseNo ?? ''} disabled placeholder="Auto-filled from mother's case" /></Field>
              <div className="sm:col-span-2">
                <Field label="Mother Name" required>
                  {patientId && patientLabel ? (
                    <div className="flex items-center justify-between rounded-sm border border-border bg-surface px-3 py-2 text-sm">
                      <span>{patientLabel}</span>
                      <div className="flex items-center gap-3">
                        <button type="button" className="text-xs text-primary" onClick={() => { setPatientId(''); setPatientLabel(''); }}>Change</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><PatientSelect value={patientId} onChange={(id, label) => { setPatientId(id); setPatientLabel(label); }} selectedLabel={patientLabel} /></div>
                      <Button type="button" variant="secondary" size="sm" onClick={() => setNewPatientOpen(true)}><UserPlus className="h-4 w-4" /> New</Button>
                    </div>
                  )}
                </Field>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Father Name"><TextInput value={f.fatherName ?? ''} onChange={(e) => set('fatherName', e.target.value)} /></Field>
              <Field label="Blood Group" required><Select value={f.bloodGroup ?? ''} onChange={(e) => set('bloodGroup', e.target.value)} placeholder="Select" options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))} /></Field>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Address"><TextInput value={f.address ?? ''} onChange={(e) => set('address', e.target.value)} /></Field>
              <Field label="Report"><TextArea value={f.report ?? ''} onChange={(e) => set('report', e.target.value)} /></Field>
            </div>
          </div>

          <div className="rounded-md border border-border p-4">
            <h3 className="mb-3 text-sm font-semibold">Attachments</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              {PHOTO_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <FieldLabelOnly label={label} />
                  {f[key] ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f[key]} alt={label} className="h-20 w-full rounded-md object-cover" />
                      <button type="button" onClick={() => set(key, '')} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white" aria-label={`Remove ${label}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-fg-muted hover:border-primary">
                      <Upload className="h-4 w-4" />
                      <span>Drop a file here or click</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => readPhoto(key, e.target.files?.[0])} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={submit} loading={saving}>Save</Button>
        </div>
      </div>

      <PatientForm open={newPatientOpen} onClose={() => setNewPatientOpen(false)} onCreated={onPatientCreated} />
    </div>
  );
}

function FieldLabelOnly({ label }: { label: string }) {
  return <label className="mb-1 block text-sm font-medium">{label}</label>;
}
