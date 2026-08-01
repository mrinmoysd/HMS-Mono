'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { vitalTypeSchema, findingSchema, symptomTypeSchema, icdCodeSchema, type IcdCodeDto } from '@smart-hospital/shared';
import { Tabs } from '@/components/ui/tabs';
import { Button, IconButton } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useConfirmDelete } from '@/components/ui/confirm-dialog';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { useCatalog, useCreateCatalogItem } from '@/lib/hooks/use-masters';
import {
  useVitalTypes,
  useCreateVitalType,
  useFindingMasters,
  useCreateFindingMaster,
  useSymptomTypeMasters,
  useCreateSymptomTypeMaster,
  useIcdCodes,
  useCreateIcdCode,
  useUpdateIcdCode,
  useDeleteIcdCode,
} from '@/lib/hooks/use-emr';
import { useAbility } from '@/lib/auth-store';
import { SimpleCatalogPanel } from '@/components/setup/simple-catalog-panel';

type Section = 'vitals' | 'findings' | 'symptoms' | 'icd-group' | 'icd-code' | 'operation-category';

export default function ClinicalMastersPage() {
  const ability = useAbility();
  const canManage = ability.can('setup', 'add');
  const [section, setSection] = useState<Section>('vitals');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clinical Masters"
        description={<>Vital types, findings and symptoms used across the patient EMR</>}
        backHref="/setup"
        backLabel="Back to Setup"
      />

      <Tabs
        tabs={[
          { value: 'vitals', label: 'Vital Types' },
          { value: 'findings', label: 'Findings' },
          { value: 'symptoms', label: 'Symptoms' },
          { value: 'icd-group', label: 'ICD-10 Groups' },
          { value: 'icd-code', label: 'ICD Code' },
          { value: 'operation-category', label: 'Operation Category' },
        ]}
        value={section}
        onChange={(s) => setSection(s as Section)}
      />

      {section === 'vitals' && <VitalTypes canManage={canManage} />}
      {section === 'findings' && <Findings canManage={canManage} />}
      {section === 'symptoms' && <Symptoms canManage={canManage} />}
      {section === 'icd-group' && <SimpleCatalogPanel catalog="icd-group" label="ICD-10 Group" />}
      {section === 'icd-code' && <IcdCodes canManage={canManage} />}
      {section === 'operation-category' && <SimpleCatalogPanel catalog="operation-category" label="Operation Category" />}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-md border border-border bg-surface">{children}</div>;
}

function Toolbar({ title, canManage, onAdd }: { title: string; canManage: boolean; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      {canManage && (
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      )}
    </div>
  );
}

// ── Vital Types ───────────────────────────────────────────────
function VitalTypes({ canManage }: { canManage: boolean }) {
  const { data: types = [] } = useVitalTypes();
  const create = useCreateVitalType();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [refMin, setRefMin] = useState('');
  const [refMax, setRefMax] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const parsed = vitalTypeSchema.safeParse({
      name,
      unit,
      refMin: refMin || undefined,
      refMax: refMax || undefined,
      sortOrder: types.length,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid');
      return;
    }
    await create.mutateAsync(parsed.data);
    setOpen(false);
    setName(''); setUnit(''); setRefMin(''); setRefMax('');
  }

  return (
    <div className="space-y-3">
      <Toolbar title="Vital Types" canManage={canManage} onAdd={() => setOpen(true)} />
      <Panel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-3 py-2.5 font-semibold">Name</th>
              <th className="px-3 py-2.5 font-semibold">Unit</th>
              <th className="px-3 py-2.5 font-semibold">Reference Range</th>
            </tr>
          </thead>
          <tbody>
            {types.length === 0 && <tr><td colSpan={3} className="px-3 py-10 text-center text-fg-muted">No vital types</td></tr>}
            {types.map((t) => (
              <tr key={t.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-medium">{t.name}</td>
                <td className="px-3 py-2.5">{t.unit ?? '—'}</td>
                <td className="px-3 py-2.5 tabular">
                  {t.refMin != null || t.refMax != null ? `${t.refMin ?? ''} – ${t.refMax ?? ''}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <FormDrawer open={open} title="Add Vital Type" onClose={() => setOpen(false)} onSubmit={save} submitting={create.isPending}>
        {error && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="space-y-4">
          <Field label="Name" required><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Temperature" /></Field>
          <Field label="Unit"><TextInput value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. Fahrenheit" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Reference Min"><TextInput type="number" value={refMin} onChange={(e) => setRefMin(e.target.value)} /></Field>
            <Field label="Reference Max"><TextInput type="number" value={refMax} onChange={(e) => setRefMax(e.target.value)} /></Field>
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}

// ── Findings ──────────────────────────────────────────────────
function Findings({ canManage }: { canManage: boolean }) {
  const { data: findings = [] } = useFindingMasters();
  const { data: cats } = useCatalog('finding-category', { size: 100 });
  const create = useCreateFindingMaster();
  const createCat = useCreateCatalogItem('finding-category');
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [newCat, setNewCat] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const parsed = findingSchema.safeParse({ description, categoryId: categoryId || undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid');
      return;
    }
    await create.mutateAsync(parsed.data);
    setOpen(false);
    setDescription(''); setCategoryId('');
  }

  return (
    <div className="space-y-3">
      <Toolbar title="Findings" canManage={canManage} onAdd={() => setOpen(true)} />
      <Panel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-3 py-2.5 font-semibold">Finding</th>
              <th className="px-3 py-2.5 font-semibold">Category</th>
            </tr>
          </thead>
          <tbody>
            {findings.length === 0 && <tr><td colSpan={2} className="px-3 py-10 text-center text-fg-muted">No findings</td></tr>}
            {findings.map((f) => (
              <tr key={f.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-medium">{f.description}</td>
                <td className="px-3 py-2.5">{f.categoryName ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <FormDrawer open={open} title="Add Finding" onClose={() => setOpen(false)} onSubmit={save} submitting={create.isPending}>
        {error && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="space-y-4">
          <Field label="Finding" required><TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></Field>
          <Field label="Category">
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              placeholder="Select…"
              options={(cats?.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
            />
            <div className="mt-2 flex gap-2">
              <TextInput value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="…or add a new category" />
              <Button type="button" variant="secondary" size="sm" loading={createCat.isPending} onClick={async () => {
                if (!newCat.trim()) return;
                const c = await createCat.mutateAsync(newCat.trim());
                setCategoryId(c.id);
                setNewCat('');
              }}>Add</Button>
            </div>
          </Field>
        </div>
      </FormDrawer>
    </div>
  );
}

// ── Symptoms ──────────────────────────────────────────────────
function Symptoms({ canManage }: { canManage: boolean }) {
  const { data: symptoms = [] } = useSymptomTypeMasters();
  const { data: heads } = useCatalog('symptom-head', { size: 100 });
  const create = useCreateSymptomTypeMaster();
  const createHead = useCreateCatalogItem('symptom-head');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [headId, setHeadId] = useState('');
  const [newHead, setNewHead] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const parsed = symptomTypeSchema.safeParse({ title, description, headId: headId || undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid');
      return;
    }
    await create.mutateAsync(parsed.data);
    setOpen(false);
    setTitle(''); setDescription(''); setHeadId('');
  }

  return (
    <div className="space-y-3">
      <Toolbar title="Symptoms" canManage={canManage} onAdd={() => setOpen(true)} />
      <Panel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-3 py-2.5 font-semibold">Symptom</th>
              <th className="px-3 py-2.5 font-semibold">Head</th>
              <th className="px-3 py-2.5 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {symptoms.length === 0 && <tr><td colSpan={3} className="px-3 py-10 text-center text-fg-muted">No symptoms</td></tr>}
            {symptoms.map((s) => (
              <tr key={s.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-medium">{s.title}</td>
                <td className="px-3 py-2.5">{s.headName ?? '—'}</td>
                <td className="px-3 py-2.5 text-fg-muted">{s.description ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <FormDrawer open={open} title="Add Symptom" onClose={() => setOpen(false)} onSubmit={save} submitting={create.isPending}>
        {error && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="space-y-4">
          <Field label="Symptom Title" required><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Description"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></Field>
          <Field label="Symptom Head">
            <Select
              value={headId}
              onChange={(e) => setHeadId(e.target.value)}
              placeholder="Select…"
              options={(heads?.data ?? []).map((h) => ({ value: h.id, label: h.name }))}
            />
            <div className="mt-2 flex gap-2">
              <TextInput value={newHead} onChange={(e) => setNewHead(e.target.value)} placeholder="…or add a new head" />
              <Button type="button" variant="secondary" size="sm" loading={createHead.isPending} onClick={async () => {
                if (!newHead.trim()) return;
                const h = await createHead.mutateAsync(newHead.trim());
                setHeadId(h.id);
                setNewHead('');
              }}>Add</Button>
            </div>
          </Field>
        </div>
      </FormDrawer>
    </div>
  );
}

// ── ICD-10 codes ──────────────────────────────────────────────
/**
 * Setup ▸ ICD-10 ▸ ICD Code. Groups live on their own tab as a plain name
 * catalog; this panel owns the codes that hang off them and feeds the
 * Diagnosis cascade in the OPD and IPD forms.
 */
function IcdCodes({ canManage }: { canManage: boolean }) {
  const { data: codes = [] } = useIcdCodes();
  const { data: groups } = useCatalog('icd-group', { size: 200 });
  const create = useCreateIcdCode();
  const update = useUpdateIcdCode();
  const del = useDeleteIcdCode();
  const confirmDelete = useConfirmDelete();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IcdCodeDto | null>(null);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState('');
  const [error, setError] = useState<string | null>(null);

  function startAdd() {
    setEditing(null);
    setCode(''); setDescription(''); setGroupId('');
    setError(null);
    setOpen(true);
  }
  function startEdit(c: IcdCodeDto) {
    setEditing(c);
    setCode(c.code);
    setDescription(c.description ?? '');
    setGroupId(c.groupId ?? '');
    setError(null);
    setOpen(true);
  }

  async function save() {
    setError(null);
    const parsed = icdCodeSchema.safeParse({ code, description, groupId: groupId || undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid');
      return;
    }
    try {
      if (editing) await update.mutateAsync({ id: editing.id, input: parsed.data });
      else await create.mutateAsync(parsed.data);
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onDelete(c: IcdCodeDto) {
    if (!(await confirmDelete(`ICD code ${c.code}`))) return;
    try {
      await del.mutateAsync(c.id);
      toast.success(`${c.code} removed`);
    } catch (e) {
      toast.error('Could not remove code', { description: (e as Error).message });
    }
  }

  return (
    <div className="space-y-3">
      <Toolbar title="ICD Code" canManage={canManage} onAdd={startAdd} />
      <Panel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-3 py-2.5 font-semibold">ICD Code</th>
              <th className="px-3 py-2.5 font-semibold">Description</th>
              <th className="px-3 py-2.5 font-semibold">Group</th>
              <th className="w-24 px-3 py-2.5 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 && <tr><td colSpan={4} className="px-3 py-10 text-center text-fg-muted">No ICD codes</td></tr>}
            {codes.map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-medium">{c.code}</td>
                <td className="px-3 py-2.5 text-fg-muted">{c.description ?? '—'}</td>
                <td className="px-3 py-2.5">{c.groupName ?? '—'}</td>
                <td className="px-3 py-2.5">
                  {canManage && (
                    <div className="flex gap-1">
                      <IconButton label="Edit code" size="sm" onClick={() => startEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton label="Delete code" tone="danger" size="sm" onClick={() => onDelete(c)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <FormDrawer
        open={open}
        title={editing ? `Edit ${editing.code}` : 'Add ICD Code'}
        onClose={() => setOpen(false)}
        onSubmit={save}
        submitting={create.isPending || update.isPending}
      >
        {error && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="space-y-4">
          <Field label="ICD Code" required><TextInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. I10" /></Field>
          <Field label="Description"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></Field>
          <Field label="Group">
            <Select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              placeholder="Select…"
              options={(groups?.data ?? []).map((g) => ({ value: g.id, label: g.name }))}
            />
          </Field>
        </div>
      </FormDrawer>
    </div>
  );
}
