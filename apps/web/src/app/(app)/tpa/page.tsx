'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { List, Pencil, Plus, Trash2, UploadCloud } from 'lucide-react';
import type { TpaDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea } from '@/components/ui/field';
import { ExportMenu } from '@/components/ui/export-menu';
import { useAbility } from '@/lib/auth-store';
import { useTpaList, useCreateTpa, useUpdateTpa, useDeleteTpa } from '@/lib/hooks/use-tpa';
import { TpaImportModal } from '@/components/tpa/tpa-import-modal';

const EMPTY = { name: '', code: '', phone: '', address: '', contactPerson: '', contactPhone: '' };

export default function TpaListPage() {
  const router = useRouter();
  const ability = useAbility();
  const canAdd = ability.can('tpa', 'add');
  const canEdit = ability.can('tpa', 'edit');
  const canDelete = ability.can('tpa', 'delete');

  const list = useTpaList();
  const create = useCreateTpa();
  const update = useUpdateTpa();
  const del = useDeleteTpa();
  const toast = useToast();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TpaDto | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [importFor, setImportFor] = useState<TpaDto | null>(null);

  const rows = useMemo(() => {
    const all = list.data?.data ?? [];
    const q = search.trim().toLowerCase();
    return q ? all.filter((t) => `${t.name} ${t.code ?? ''} ${t.phone ?? ''} ${t.contactPerson ?? ''}`.toLowerCase().includes(q)) : all;
  }, [list.data, search]);

  function openAdd() { setEditing(null); setForm(EMPTY); setError(''); setOpen(true); }
  function openEdit(t: TpaDto) {
    setEditing(t);
    setForm({ name: t.name, code: t.code ?? '', phone: t.phone ?? '', address: t.address ?? '', contactPerson: t.contactPerson ?? '', contactPhone: t.contactPhone ?? '' });
    setError('');
    setOpen(true);
  }
  async function save() {
    if (!form.name.trim() || !form.code.trim() || !form.phone.trim()) { setError('Name, Code and Contact No are required.'); return; }
    if (editing) await update.mutateAsync({ id: editing.id, input: form });
    else await create.mutateAsync(form);
    setOpen(false);
  }
  async function remove(t: TpaDto) {
    const ok = await confirm({
      title: `Delete TPA ${t.name}?`,
      description: 'Its charge schedule will be removed. Patients linked to this TPA are not deleted.',
      confirmLabel: 'Delete TPA',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await del.mutateAsync(t.id);
      toast.success(`${t.name} deleted`);
    } catch (e) {
      toast.error('Could not delete TPA', { description: (e as Error).message });
    }
  }

  const cols: Column<TpaDto>[] = [
    { key: 'name', header: 'Name', className: 'font-medium' },
    { key: 'code', header: 'Code', render: (t) => t.code || '—' },
    { key: 'phone', header: 'Phone', render: (t) => t.phone || '—' },
    { key: 'address', header: 'Address', render: (t) => t.address || '—' },
    { key: 'contactPerson', header: 'Contact Person Name', render: (t) => t.contactPerson || '—' },
    { key: 'contactPhone', header: 'Contact Person Phone', render: (t) => t.contactPhone || '—' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="TPA Management"
        description="Third-party administrators and their negotiated charge schedules"
        actions={canAdd && <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add TPA</Button>}
      />

      <DataTable
        columns={cols}
        rows={rows}
        loading={list.isLoading}
        search={search}
        onSearch={setSearch}
        onPage={() => {}}
        onSize={() => {}}
        toolbar={<ExportMenu table={() => ({ title: 'TPA Management', filename: 'tpa', headers: cols.map((c) => c.header), rows: rows.map((t) => [t.name, t.code ?? '', t.phone ?? '', t.address ?? '', t.contactPerson ?? '', t.contactPhone ?? '']) })} />}
        rowActions={(t) => (
          <div className="flex gap-1">
            <button onClick={() => router.push(`/tpa/${t.id}`)} aria-label="TPA Details" title="TPA Details" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"><List className="h-4 w-4" /></button>
            {canEdit && <button onClick={() => openEdit(t)} aria-label="Edit" title="Edit" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"><Pencil className="h-4 w-4" /></button>}
            {canEdit && <button onClick={() => setImportFor(t)} aria-label="Import TPA Charges" title="Import TPA Charges" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"><UploadCloud className="h-4 w-4" /></button>}
            {canDelete && <button onClick={() => remove(t)} aria-label="Delete" title="Delete" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>}
          </div>
        )}
      />

      <FormDrawer open={open} title={editing ? 'Edit TPA' : 'Add TPA'} onClose={() => setOpen(false)} onSubmit={save} submitting={create.isPending || update.isPending}>
        <div className="space-y-4">
          {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Name" required><TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Code" required><TextInput value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} /></Field>
            <Field label="Contact No" required><TextInput value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
          </div>
          <Field label="Address"><TextArea rows={3} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Contact Person Name"><TextInput value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} /></Field>
            <Field label="Contact Person Phone"><TextInput value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} /></Field>
          </div>
        </div>
      </FormDrawer>

      {importFor && <TpaImportModal tpa={importFor} onClose={() => setImportFor(null)} />}
    </div>
  );
}
