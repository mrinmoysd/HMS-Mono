'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ROLES, ROLE_META, type CreatePrescriptionInput, type PrescriptionItemInput } from '@smart-hospital/shared';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { RichText } from '@/components/ui/rich-text';
import { useMedicines, useMedicineDosages, useDiagnosticTests } from '@/lib/hooks/use-departments';
import { useCatalog } from '@/lib/hooks/use-masters';
import { useFindingMasters } from '@/lib/hooks/use-emr';
import { useCreatePrescription, type EncounterScope } from '@/lib/hooks/use-diagnostics-clinical';
import { printPrescriptionRx } from '@/lib/print';
import { ApiRequestError } from '@/lib/api';

const EMPTY_ITEM: PrescriptionItemInput = { medicineName: '', dosage: '', interval: '', duration: '', instruction: '' };
const NOTIFY_ROLES = ROLES.filter((r) => r !== 'patient');

/** Rich "Add Prescription" builder — full field parity with the demo (Patient Visit V2). */
export function PrescriptionBuilder({
  scope,
  patientName,
  open,
  onClose,
}: {
  scope: EncounterScope;
  patientName?: string;
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreatePrescription(scope);
  const { data: medicines } = useMedicines({ size: 200 });
  const { data: dosages } = useMedicineDosages();
  const { data: intervals } = useCatalog('dosage-interval', { size: 100 });
  const { data: durations } = useCatalog('dosage-duration', { size: 100 });
  const { data: findingCategories } = useCatalog('finding-category', { size: 100 });
  const { data: findings = [] } = useFindingMasters();
  const { data: pathologyTests } = useDiagnosticTests('pathology', { size: 200 });
  const { data: radiologyTests } = useDiagnosticTests('radiology', { size: 200 });

  const [headerNote, setHeaderNote] = useState('');
  const [footerNote, setFooterNote] = useState('');
  const [findingCategoryId, setFindingCategoryId] = useState('');
  const [findingList, setFindingList] = useState<string[]>([]);
  const [findingDescription, setFindingDescription] = useState('');
  const [findingPrint, setFindingPrint] = useState(true);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [pathologyTestIds, setPathologyTestIds] = useState<string[]>([]);
  const [radiologyTestIds, setRadiologyTestIds] = useState<string[]>([]);
  const [notifyRoles, setNotifyRoles] = useState<string[]>([]);
  const [items, setItems] = useState<PrescriptionItemInput[]>([{ ...EMPTY_ITEM }]);
  const [error, setError] = useState<string | null>(null);

  const findingsForCategory = useMemo(
    () => (findingCategoryId ? findings.filter((f) => f.categoryId === findingCategoryId) : findings),
    [findings, findingCategoryId],
  );

  function reset() {
    setHeaderNote('');
    setFooterNote('');
    setFindingCategoryId('');
    setFindingList([]);
    setFindingDescription('');
    setFindingPrint(true);
    setAttachmentUrl('');
    setPathologyTestIds([]);
    setRadiologyTestIds([]);
    setNotifyRoles([]);
    setItems([{ ...EMPTY_ITEM }]);
    setError(null);
  }

  function updItem(i: number, patch: Partial<PrescriptionItemInput>) {
    setItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function readAttachment(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttachmentUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function submit(print: boolean) {
    setError(null);
    const valid = items.filter((it) => it.medicineName.trim());
    if (valid.length === 0) {
      setError('Add at least one medicine');
      return;
    }
    const input: CreatePrescriptionInput = {
      patientId: scope.patientId,
      encounterType: scope.encounterType,
      encounterId: scope.encounterId,
      headerNote,
      footerNote,
      findingCategoryId: findingCategoryId || null,
      findingList,
      findingDescription,
      findingPrint,
      attachmentUrl,
      pathologyTestIds,
      radiologyTestIds,
      notifyRoles,
      items: valid,
    };
    try {
      const rx = await create.mutateAsync(input);
      if (print) printPrescriptionRx(rx, patientName);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  return (
    <FormDrawer
      open={open}
      title="Add Prescription"
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
      {error && (
        <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* LEFT */}
        <div className="min-w-0 space-y-4">
          <Field label="Header Note">
            <RichText value={headerNote} onChange={setHeaderNote} />
          </Field>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Findings</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Finding Category">
                <Select
                  value={findingCategoryId}
                  onChange={(e) => setFindingCategoryId(e.target.value)}
                  placeholder="Select…"
                  options={(findingCategories?.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
                />
              </Field>
              <Field label="Finding Print">
                <label className="flex h-9 items-center gap-2 text-sm">
                  <input type="checkbox" checked={findingPrint} onChange={(e) => setFindingPrint(e.target.checked)} /> Include on print
                </label>
              </Field>
            </div>
            <div className="mt-2">
              <p className="mb-1 text-sm font-medium">Finding List</p>
              <div className="flex flex-wrap gap-3 rounded-sm border border-border bg-surface px-3 py-2">
                {findingsForCategory.length === 0 && <span className="text-sm text-fg-muted">No findings for this category</span>}
                {findingsForCategory.map((f) => (
                  <label key={f.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={findingList.includes(f.description)}
                      onChange={() => toggle(findingList, setFindingList, f.description)}
                    />
                    {f.description}
                  </label>
                ))}
              </div>
            </div>
            <Field label="Finding Description" className="mt-2">
              <TextArea value={findingDescription} onChange={(e) => setFindingDescription(e.target.value)} />
            </Field>
          </div>

          <div className="min-w-0">
            <p className="mb-1 text-sm font-medium">Medicine</p>
            <div className="space-y-2 overflow-x-auto">
              {items.map((it, i) => (
                <div key={i} className="grid min-w-[640px] grid-cols-[1.3fr_0.9fr_0.9fr_0.9fr_1.1fr_auto] items-center gap-2">
                  <input
                    list={`rx-med-${i}`}
                    value={it.medicineName}
                    onChange={(e) => updItem(i, { medicineName: e.target.value })}
                    placeholder="Medicine"
                    className="rounded-sm border border-border bg-surface px-2 py-1.5 text-sm"
                  />
                  <datalist id={`rx-med-${i}`}>{(medicines?.data ?? []).map((m) => <option key={m.id} value={m.name} />)}</datalist>
                  <select value={it.dosage} onChange={(e) => updItem(i, { dosage: e.target.value })} className="rounded-sm border border-border bg-surface px-2 py-1.5 text-sm">
                    <option value="">Dose…</option>
                    {(dosages?.data ?? []).map((d) => <option key={d.id} value={d.dosage}>{d.dosage}</option>)}
                  </select>
                  <select value={it.interval} onChange={(e) => updItem(i, { interval: e.target.value })} className="rounded-sm border border-border bg-surface px-2 py-1.5 text-sm">
                    <option value="">Interval…</option>
                    {(intervals?.data ?? []).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                  <select value={it.duration} onChange={(e) => updItem(i, { duration: e.target.value })} className="rounded-sm border border-border bg-surface px-2 py-1.5 text-sm">
                    <option value="">Duration…</option>
                    {(durations?.data ?? []).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                  <input
                    value={it.instruction}
                    onChange={(e) => updItem(i, { instruction: e.target.value })}
                    placeholder="Instruction"
                    className="rounded-sm border border-border bg-surface px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setItems((r) => r.filter((_, idx) => idx !== i))}
                    className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => setItems((r) => [...r, { ...EMPTY_ITEM }])}>
              <Plus className="h-4 w-4" /> Add Medicine
            </Button>
          </div>

          <Field label="Footer Note">
            <RichText value={footerNote} onChange={setFooterNote} />
          </Field>
        </div>

        {/* RIGHT */}
        <div className="min-w-0 space-y-4">
          <Field label="Attachment">
            <div className="flex items-center gap-3">
              <input type="file" onChange={(e) => readAttachment(e.target.files?.[0])} className="text-sm" />
              {attachmentUrl && (
                <button type="button" onClick={() => setAttachmentUrl('')} className="text-xs text-danger">
                  Remove
                </button>
              )}
            </div>
          </Field>

          <div>
            <p className="mb-1 text-sm font-medium">Pathology</p>
            <div className="flex max-h-32 flex-col gap-1.5 overflow-y-auto rounded-sm border border-border bg-surface px-3 py-2">
              {(pathologyTests?.data ?? []).length === 0 && <span className="text-sm text-fg-muted">No tests</span>}
              {(pathologyTests?.data ?? []).map((t) => (
                <label key={t.id} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={pathologyTestIds.includes(t.id)} onChange={() => toggle(pathologyTestIds, setPathologyTestIds, t.id)} />
                  {t.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">Radiology</p>
            <div className="flex max-h-32 flex-col gap-1.5 overflow-y-auto rounded-sm border border-border bg-surface px-3 py-2">
              {(radiologyTests?.data ?? []).length === 0 && <span className="text-sm text-fg-muted">No tests</span>}
              {(radiologyTests?.data ?? []).map((t) => (
                <label key={t.id} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={radiologyTestIds.includes(t.id)} onChange={() => toggle(radiologyTestIds, setRadiologyTestIds, t.id)} />
                  {t.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">Notification To</p>
            <div className="flex flex-wrap gap-3 rounded-sm border border-border bg-surface px-3 py-2">
              {NOTIFY_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={notifyRoles.includes(role)} onChange={() => toggle(notifyRoles, setNotifyRoles, role)} />
                  {ROLE_META[role].label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </FormDrawer>
  );
}
