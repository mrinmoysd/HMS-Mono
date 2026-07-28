'use client';

import { useEffect, useState } from 'react';
import { Upload, UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { BLOOD_GROUPS, deathRecordSchema, type DeathRecordDto, type PatientDto } from '@smart-hospital/shared';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { PatientSelect } from '@/components/patient-select';
import { PatientForm } from '@/app/(app)/patient/patient-form';
import { useCreateDeath, useUpdateDeath } from '@/lib/hooks/use-office';
import { ApiRequestError } from '@/lib/api';

/** Add/Edit Death Record — patient is a linked Patient (auto-resolves Case ID + Age/Address). */
export function DeathRecordForm({ open, record, onClose }: { open: boolean; record?: DeathRecordDto | null; onClose: () => void }) {
  const create = useCreateDeath();
  const update = useUpdateDeath();
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
      setPatientLabel(record.patientName ? `${record.patientName}${record.patientNo ? ` · ${record.patientNo}` : ''}` : '');
      setF({
        caseNo: record.caseNo ?? '',
        deathDate: record.deathDate.slice(0, 10),
        guardianName: record.guardianName ?? '',
        cause: record.cause ?? '',
        bloodGroup: record.bloodGroup ?? '',
        attachmentUrl: record.attachmentUrl ?? '',
      });
    } else {
      setPatientId(''); setPatientLabel('');
      setF({ deathDate: new Date().toISOString().slice(0, 10) });
    }
    setError(null);
  }, [open, record]);

  if (!open) return null;

  function onPatientCreated(p: PatientDto) {
    setPatientId(p.id);
    setPatientLabel(`${p.name} · ${p.patientNo}`);
  }

  function readAttachment(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('attachmentUrl', String(reader.result));
    reader.readAsDataURL(file);
  }

  async function submit() {
    setError(null);
    const payload = Object.fromEntries(Object.entries({ ...f, patientId }).filter(([, v]) => v !== ''));
    const parsed = deathRecordSchema.safeParse(payload);
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
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={isEdit ? 'Edit Death Record' : 'Add Death Record'}
        size="lg"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={submit} loading={saving}>Save</Button>
          </>
        }
      >
        <div className="space-y-5">
          {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          <div>
            <h3 className="mb-3 text-sm font-semibold">Death Record Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Case ID"><TextInput value={f.caseNo ?? ''} disabled placeholder="Auto-filled from patient's case" /></Field>
              <Field label="Patient Name" required>
                {patientId && patientLabel ? (
                  <div className="flex items-center justify-between rounded-sm border border-border bg-surface px-3 py-2 text-sm">
                    <span>{patientLabel}</span>
                    <button type="button" className="text-xs text-primary" onClick={() => { setPatientId(''); setPatientLabel(''); }}>Change</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1"><PatientSelect value={patientId} onChange={(id, label) => { setPatientId(id); setPatientLabel(label); }} selectedLabel={patientLabel} /></div>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setNewPatientOpen(true)}><UserPlus className="h-4 w-4" /> New</Button>
                  </div>
                )}
              </Field>
              <Field label="Death Date" required><TextInput type="date" value={f.deathDate ?? ''} onChange={(e) => set('deathDate', e.target.value)} /></Field>
              <Field label="Guardian Name" required><TextInput value={f.guardianName ?? ''} onChange={(e) => set('guardianName', e.target.value)} /></Field>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Attachment">
                {f.attachmentUrl ? (
                  <div className="flex items-center justify-between rounded-sm border border-border bg-surface px-3 py-2 text-sm">
                    <span>File attached</span>
                    <button type="button" className="text-xs text-danger" onClick={() => set('attachmentUrl', '')}>Remove</button>
                  </div>
                ) : (
                  <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-border text-xs text-fg-muted hover:border-primary">
                    <Upload className="h-4 w-4" />
                    <span>Drop a file here or click</span>
                    <input type="file" className="hidden" onChange={(e) => readAttachment(e.target.files?.[0])} />
                  </label>
                )}
              </Field>
              <Field label="Report"><TextArea value={f.cause ?? ''} onChange={(e) => set('cause', e.target.value)} /></Field>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Blood Group" required><Select value={f.bloodGroup ?? ''} onChange={(e) => set('bloodGroup', e.target.value)} placeholder="Select" options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))} /></Field>
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
