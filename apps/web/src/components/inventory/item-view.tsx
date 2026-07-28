'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import type { InventoryItemDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { ExportMenu } from '@/components/ui/export-menu';
import { useAbility } from '@/lib/auth-store';
import { useCatalog } from '@/lib/hooks/use-masters';
import { useItems, useCreateItem, useUpdateItem, useDeleteItem } from '@/lib/hooks/use-inventory';

const EMPTY = { name: '', categoryId: '', unit: '', description: '' };

export function ItemView({ onBack }: { onBack: () => void }) {
  const ability = useAbility();
  const canAdd = ability.can('inventory', 'add');
  const canEdit = ability.can('inventory', 'edit');
  const canDelete = ability.can('inventory', 'delete');

  const list = useItems();
  const cats = useCatalog('item-category', { size: 100 });
  const create = useCreateItem();
  const update = useUpdateItem();
  const del = useDeleteItem();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItemDto | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const rows = useMemo(() => {
    const all = list.data?.data ?? [];
    const q = search.trim().toLowerCase();
    return q ? all.filter((i) => `${i.name} ${i.categoryName ?? ''}`.toLowerCase().includes(q)) : all;
  }, [list.data, search]);

  function openAdd() { setEditing(null); setForm(EMPTY); setError(''); setOpen(true); }
  function openEdit(i: InventoryItemDto) {
    setEditing(i);
    setForm({ name: i.name, categoryId: i.categoryId ?? '', unit: i.unit ?? '', description: i.description ?? '' });
    setError('');
    setOpen(true);
  }
  async function save() {
    if (!form.name.trim() || !form.categoryId || !form.unit.trim()) { setError('Item, Item Category and Unit are required.'); return; }
    const input = { name: form.name, categoryId: form.categoryId, unit: form.unit, description: form.description };
    if (editing) await update.mutateAsync({ id: editing.id, input });
    else await create.mutateAsync(input);
    setOpen(false);
  }
  async function remove(i: InventoryItemDto) {
    if (confirm(`Delete item "${i.name}"?`)) await del.mutateAsync(i.id);
  }

  const cols: Column<InventoryItemDto>[] = [
    { key: 'name', header: 'Item', className: 'font-medium text-primary' },
    { key: 'categoryName', header: 'Category', render: (i) => i.categoryName ?? '—' },
    { key: 'unit', header: 'Unit', render: (i) => i.unit ?? '—' },
    { key: 'availableQuantity', header: 'Available Quantity', className: 'tabular', render: (i) => i.availableQuantity },
    { key: 'description', header: 'Description', render: (i) => <span className="line-clamp-3 text-fg-muted">{i.description || '—'}</span> },
  ];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /> Item Stock</button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Item List</h1>
        {canAdd && <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Item</Button>}
      </div>

      <DataTable
        columns={cols}
        rows={rows}
        loading={list.isLoading}
        search={search}
        onSearch={setSearch}
        onPage={() => {}}
        onSize={() => {}}
        toolbar={<ExportMenu table={() => ({ title: 'Item List', filename: 'items', headers: ['Item', 'Category', 'Unit', 'Available Quantity', 'Description'], rows: rows.map((i) => [i.name, i.categoryName ?? '', i.unit ?? '', i.availableQuantity, i.description ?? '']) })} />}
        rowActions={(canEdit || canDelete) ? (i) => (
          <div className="flex gap-1">
            {canEdit && <button onClick={() => openEdit(i)} aria-label="Edit" title="Edit" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"><Pencil className="h-4 w-4" /></button>}
            {canDelete && <button onClick={() => remove(i)} aria-label="Delete" title="Delete" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>}
          </div>
        ) : undefined}
      />

      <FormDrawer open={open} title={editing ? 'Edit Item' : 'Add Item'} onClose={() => setOpen(false)} onSubmit={save} submitting={create.isPending || update.isPending}>
        <div className="space-y-4">
          {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <Field label="Item" required><TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Item Category" required>
              <Select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} placeholder="Select"
                options={(cats.data?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
            </Field>
            <Field label="Unit" required><TextInput value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} /></Field>
          </div>
          <Field label="Description"><TextArea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></Field>
        </div>
      </FormDrawer>
    </div>
  );
}
