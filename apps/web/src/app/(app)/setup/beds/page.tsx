'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { BedDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, Select } from '@/components/ui/field';
import { Tabs } from '@/components/ui/tabs';
import { BedGroupPanel } from '@/components/setup/bed-group-panel';
import { useCatalog, useCreateCatalogItem } from '@/lib/hooks/use-masters';
import {
  useBeds,
  useBedGroups,
  useCreateBed,
  useUpdateBed,
  useDeleteBed,
} from '@/lib/hooks/use-ipd';
import { useAbility } from '@/lib/auth-store';

type Section = 'beds' | 'bed-groups';

export default function BedsSetupPage() {
  const ability = useAbility();
  const canManage = ability.can('setup', 'add');
  const [section, setSection] = useState<Section>('beds');

  const { data: floors } = useCatalog('floor', { size: 100 });
  const { data: types } = useCatalog('bed-type', { size: 100 });
  const createFloor = useCreateCatalogItem('floor');
  const createType = useCreateCatalogItem('bed-type');
  const [newFloor, setNewFloor] = useState('');
  const [newType, setNewType] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Beds</h1>
        <p className="text-sm text-fg-muted">Floors, bed groups, bed types and the bed master</p>
      </div>

      {/* Quick-add masters */}
      {canManage && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-surface p-3">
            <p className="mb-2 text-sm font-medium">Floors ({floors?.data.length ?? 0})</p>
            <div className="flex gap-2">
              <TextInput value={newFloor} onChange={(e) => setNewFloor(e.target.value)} placeholder="e.g. Ground" />
              <Button size="sm" variant="secondary" loading={createFloor.isPending}
                onClick={async () => { if (newFloor.trim()) { await createFloor.mutateAsync(newFloor.trim()); setNewFloor(''); } }}>
                Add
              </Button>
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface p-3">
            <p className="mb-2 text-sm font-medium">Bed Types ({types?.data.length ?? 0})</p>
            <div className="flex gap-2">
              <TextInput value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="e.g. General" />
              <Button size="sm" variant="secondary" loading={createType.isPending}
                onClick={async () => { if (newType.trim()) { await createType.mutateAsync(newType.trim()); setNewType(''); } }}>
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      <Tabs
        tabs={[
          { value: 'beds', label: 'Bed' },
          { value: 'bed-groups', label: 'Bed Group' },
        ]}
        value={section}
        onChange={(s) => setSection(s as Section)}
      />

      {section === 'beds' && <BedsTab />}
      {section === 'bed-groups' && <BedGroupPanel />}
    </div>
  );
}

function BedsTab() {
  const ability = useAbility();
  const canAdd = ability.can('setup', 'add');
  const canEdit = ability.can('setup', 'edit');
  const canDelete = ability.can('setup', 'delete');

  const { data: beds, isLoading } = useBeds();
  const { data: groups } = useBedGroups();
  const { data: types } = useCatalog('bed-type', { size: 100 });
  const createBed = useCreateBed();
  const updateBed = useUpdateBed();
  const removeBed = useDeleteBed();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BedDto | null>(null);
  const [bedNo, setBedNo] = useState('');
  const [bedGroupId, setBedGroupId] = useState('');
  const [bedTypeId, setBedTypeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<BedDto | null>(null);

  const columns: Column<BedDto>[] = [
    { key: 'bedNo', header: 'Bed No', className: 'font-medium' },
    { key: 'bedGroupName', header: 'Bed Group' },
    { key: 'bedTypeName', header: 'Type', render: (b) => b.bedTypeName ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (b) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
            b.status === 'available' ? 'bg-success/10 text-success' : 'bg-occupied/10 text-occupied'
          }`}
        >
          {b.status}
        </span>
      ),
    },
  ];

  function openAdd() {
    setEditing(null);
    setBedNo('');
    setBedGroupId('');
    setBedTypeId('');
    setError(null);
    setOpen(true);
  }

  function openEdit(row: BedDto) {
    setEditing(row);
    setBedNo(row.bedNo);
    setBedGroupId(row.bedGroupId);
    setBedTypeId(row.bedTypeId ?? '');
    setError(null);
    setOpen(true);
  }

  async function submit() {
    setError(null);
    if (!bedNo.trim() || !bedGroupId) {
      setError('Bed number and bed group are required');
      return;
    }
    const input = { bedNo, bedGroupId, bedTypeId: bedTypeId || null };
    if (editing) {
      await updateBed.mutateAsync({ id: editing.id, input });
    } else {
      await createBed.mutateAsync(input);
    }
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={beds?.data ?? []}
        loading={isLoading}
        search=""
        onSearch={() => {}}
        onPage={() => {}}
        onSize={() => {}}
        toolbar={
          canAdd && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Bed
            </Button>
          )
        }
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
        title={editing ? 'Edit Bed' : 'Add Bed'}
        onClose={() => setOpen(false)}
        onSubmit={submit}
        submitting={createBed.isPending || updateBed.isPending}
      >
        {error && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="space-y-4">
          <Field label="Bed Number" required>
            <TextInput value={bedNo} onChange={(e) => setBedNo(e.target.value)} placeholder="G-01" />
          </Field>
          <Field label="Bed Group" required>
            <Select value={bedGroupId} onChange={(e) => setBedGroupId(e.target.value)} placeholder="Select…"
              options={(groups?.data ?? []).map((g) => ({ value: g.id, label: g.floorName ? `${g.floorName} · ${g.name}` : g.name }))} />
          </Field>
          <Field label="Bed Type">
            <Select value={bedTypeId} onChange={(e) => setBedTypeId(e.target.value)} placeholder="None"
              options={(types?.data ?? []).map((t) => ({ value: t.id, label: t.name }))} />
          </Field>
        </div>
      </FormDrawer>

      {deleting && (
        <ConfirmDeleteModal
          bedNo={deleting.bedNo}
          pending={removeBed.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await removeBed.mutateAsync(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

function ConfirmDeleteModal({
  bedNo,
  pending,
  onCancel,
  onConfirm,
}: {
  bedNo: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} aria-hidden />
      <div role="alertdialog" aria-modal="true" className="relative w-full max-w-sm rounded-md border border-border bg-surface p-5 shadow-lg">
        <p className="text-sm">
          Delete bed <strong>{bedNo}</strong>? This cannot be undone.
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
