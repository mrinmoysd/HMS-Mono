'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { DiagnosticTestDto, Modality } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { Tabs } from '@/components/ui/tabs';
import {
  useDiagnosticCategories,
  useCreateDiagnosticCategory,
  useUpdateDiagnosticCategory,
  useDeleteDiagnosticCategory,
  useDiagnosticUnits,
  useCreateDiagnosticUnit,
  useUpdateDiagnosticUnit,
  useDeleteDiagnosticUnit,
  useDiagnosticTests,
  useCreateDiagnosticTest,
  useUpdateDiagnosticTest,
  useDeleteDiagnosticTest,
} from '@/lib/hooks/use-departments';
import { useAbility } from '@/lib/auth-store';

type Section = 'category' | 'parameter' | 'unit';

/** Shared Category/Parameter/Unit masters for Setup → Pathology & Setup → Radiology. */
export function DiagnosticMastersPanel({ modality }: { modality: Modality }) {
  const [section, setSection] = useState<Section>('category');

  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { value: 'category', label: 'Category' },
          { value: 'parameter', label: 'Parameter' },
          { value: 'unit', label: 'Unit' },
        ]}
        value={section}
        onChange={(s) => setSection(s as Section)}
      />

      {section === 'category' && (
        <ModalityCatalogTab
          modality={modality}
          label="Category"
          useList={useDiagnosticCategories}
          useCreate={useCreateDiagnosticCategory}
          useUpdate={useUpdateDiagnosticCategory}
          useDelete={useDeleteDiagnosticCategory}
        />
      )}
      {section === 'parameter' && <ParameterTab modality={modality} />}
      {section === 'unit' && (
        <ModalityCatalogTab
          modality={modality}
          label="Unit"
          useList={useDiagnosticUnits}
          useCreate={useCreateDiagnosticUnit}
          useUpdate={useUpdateDiagnosticUnit}
          useDelete={useDeleteDiagnosticUnit}
        />
      )}
    </div>
  );
}

// ── Category / Unit (identical shape, name-only, modality-scoped) ──────
interface ModalityDto {
  id: string;
  name: string;
}
function ModalityCatalogTab({
  modality,
  label,
  useList,
  useCreate,
  useUpdate,
  useDelete,
}: {
  modality: Modality;
  label: string;
  useList: (m: Modality, p: { search: string; page: number; size: number }) => { data?: { data: ModalityDto[]; meta: any }; isLoading: boolean };
  useCreate: (m: Modality) => { mutateAsync: (input: { modality: Modality; name: string }) => Promise<unknown>; isPending: boolean };
  useUpdate: (m: Modality) => { mutateAsync: (args: { id: string; input: { modality: Modality; name: string } }) => Promise<unknown>; isPending: boolean };
  useDelete: (m: Modality) => { mutateAsync: (id: string) => Promise<unknown>; isPending: boolean };
}) {
  const ability = useAbility();
  const canAdd = ability.can('setup', 'add');
  const canEdit = ability.can('setup', 'edit');
  const canDelete = ability.can('setup', 'delete');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const { data, isLoading } = useList(modality, { search, page, size });

  const create = useCreate(modality);
  const update = useUpdate(modality);
  const remove = useDelete(modality);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ModalityDto | null>(null);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ModalityDto | null>(null);

  function openAdd() {
    setEditing(null);
    setName('');
    setFormError(null);
    setOpen(true);
  }
  function openEdit(row: ModalityDto) {
    setEditing(row);
    setName(row.name);
    setFormError(null);
    setOpen(true);
  }
  async function submit() {
    if (!name.trim()) {
      setFormError(`${label} name is required`);
      return;
    }
    const input = { modality, name: name.trim() };
    if (editing) {
      await update.mutateAsync({ id: editing.id, input });
    } else {
      await create.mutateAsync(input);
    }
    setOpen(false);
  }

  const columns: Column<ModalityDto>[] = [{ key: 'name', header: label, className: 'font-medium' }];

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        meta={data?.meta}
        loading={isLoading}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        onPage={setPage}
        onSize={(s) => { setSize(s); setPage(1); }}
        toolbar={canAdd && <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add {label}</Button>}
        rowActions={
          canEdit || canDelete
            ? (row) => (
                <>
                  {canEdit && (
                    <button onClick={() => openEdit(row)} aria-label="Edit" title="Edit" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => setDeleting(row)} aria-label="Delete" title="Delete" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </>
              )
            : undefined
        }
      />

      <FormDrawer
        open={open}
        title={editing ? `Edit ${label}` : `Add ${label}`}
        onClose={() => setOpen(false)}
        onSubmit={submit}
        submitting={create.isPending || update.isPending}
      >
        {formError && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>}
        <Field label={label} required>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
      </FormDrawer>

      {deleting && (
        <ConfirmDeleteModal
          label={label.toLowerCase()}
          name={deleting.name}
          pending={remove.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await remove.mutateAsync(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

// ── Parameter (DiagnosticTest — clinical fields only; charge stays driven
//    by the operational page / Hospital Charges master) ──────────────────
const EMPTY_PARAM_FORM = { name: '', categoryId: '', unitId: '', refMin: '', refMax: '', description: '' };

function ParameterTab({ modality }: { modality: Modality }) {
  const ability = useAbility();
  const canAdd = ability.can(modality, 'add');
  const canEdit = ability.can(modality, 'edit');
  const canDelete = ability.can(modality, 'delete');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const { data, isLoading } = useDiagnosticTests(modality, { search, page, size });
  const { data: cats } = useDiagnosticCategories(modality, { size: 100 });
  const { data: units } = useDiagnosticUnits(modality, { size: 100 });

  const create = useCreateDiagnosticTest(modality);
  const update = useUpdateDiagnosticTest(modality);
  const remove = useDeleteDiagnosticTest(modality);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DiagnosticTestDto | null>(null);
  const [f, setF] = useState(EMPTY_PARAM_FORM);
  const set = (k: keyof typeof EMPTY_PARAM_FORM, v: string) => setF((p) => ({ ...p, [k]: v }));
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DiagnosticTestDto | null>(null);

  function openAdd() {
    setEditing(null);
    setF(EMPTY_PARAM_FORM);
    setFormError(null);
    setOpen(true);
  }
  function openEdit(row: DiagnosticTestDto) {
    setEditing(row);
    setF({
      name: row.name,
      categoryId: row.categoryId ?? '',
      unitId: row.unitId ?? '',
      refMin: row.refMin != null ? String(row.refMin) : '',
      refMax: row.refMax != null ? String(row.refMax) : '',
      description: row.description ?? '',
    });
    setFormError(null);
    setOpen(true);
  }
  async function submit() {
    if (!f.name.trim()) {
      setFormError('Name is required');
      return;
    }
    const input = {
      modality,
      name: f.name.trim(),
      categoryId: f.categoryId || null,
      unitId: f.unitId || null,
      refMin: f.refMin ? Number(f.refMin) : null,
      refMax: f.refMax ? Number(f.refMax) : null,
      description: f.description,
      // This form doesn't manage billing or the legacy free-text reference range —
      // carry both through unchanged so editing a Parameter can't silently wipe them.
      charge: editing?.charge ?? 0,
      referenceRange: editing?.referenceRange ?? '',
      reportDays: editing?.reportDays ?? 1,
      parameters: editing?.parameters.map((p) => ({ parameterName: p.parameterName, referenceRange: p.referenceRange ?? '', unit: p.unit ?? '' })) ?? [],
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, input });
    } else {
      await create.mutateAsync(input);
    }
    setOpen(false);
  }

  const columns: Column<DiagnosticTestDto>[] = [
    { key: 'name', header: 'Parameter', className: 'font-medium' },
    { key: 'categoryName', header: 'Category', render: (t) => t.categoryName ?? '—' },
    {
      key: 'refMin',
      header: 'Reference Range',
      className: 'tabular',
      render: (t) => (t.refMin != null || t.refMax != null ? `${t.refMin ?? ''} – ${t.refMax ?? ''}` : '—'),
    },
    { key: 'unitName', header: 'Unit', render: (t) => t.unitName ?? '—' },
  ];

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        meta={data?.meta}
        loading={isLoading}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        onPage={setPage}
        onSize={(s) => { setSize(s); setPage(1); }}
        toolbar={canAdd && <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Parameter</Button>}
        rowActions={
          canEdit || canDelete
            ? (row) => (
                <>
                  {canEdit && (
                    <button onClick={() => openEdit(row)} aria-label="Edit" title="Edit" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => setDeleting(row)} aria-label="Delete" title="Delete" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </>
              )
            : undefined
        }
      />

      <FormDrawer
        open={open}
        title={editing ? 'Edit Parameter' : 'Add Parameter'}
        onClose={() => setOpen(false)}
        onSubmit={submit}
        submitting={create.isPending || update.isPending}
      >
        {formError && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>}
        <div className="space-y-4">
          <Field label="Parameter Name" required>
            <TextInput value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus />
          </Field>
          <Field label="Category">
            <Select value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)} placeholder="None"
              options={(cats?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Reference Range From">
              <TextInput type="number" value={f.refMin} onChange={(e) => set('refMin', e.target.value)} />
            </Field>
            <Field label="Reference Range To">
              <TextInput type="number" value={f.refMax} onChange={(e) => set('refMax', e.target.value)} />
            </Field>
          </div>
          <Field label="Unit">
            <Select value={f.unitId} onChange={(e) => set('unitId', e.target.value)} placeholder="None"
              options={(units?.data ?? []).map((u) => ({ value: u.id, label: u.name }))} />
          </Field>
          <Field label="Description">
            <TextArea value={f.description} onChange={(e) => set('description', e.target.value)} rows={3} />
          </Field>
        </div>
      </FormDrawer>

      {deleting && (
        <ConfirmDeleteModal
          label="parameter"
          name={deleting.name}
          pending={remove.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await remove.mutateAsync(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

function ConfirmDeleteModal({
  label,
  name,
  pending,
  onCancel,
  onConfirm,
}: {
  label: string;
  name: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} aria-hidden />
      <div role="alertdialog" aria-modal="true" className="relative w-full max-w-sm rounded-md border border-border bg-surface p-5 shadow-lg">
        <p className="text-sm">
          Delete {label} <strong>{name}</strong>? This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" loading={pending} onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
