'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useMemo, useState } from 'react';
import { Boxes, ListChecks, Paperclip, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import type { ItemStockDto } from '@smart-hospital/shared';
import { DataTable, type Column, type SortState } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { ExportMenu } from '@/components/ui/export-menu';
import { useAbility } from '@/lib/auth-store';
import { toLocalDateInput } from '@/lib/datetime';
import { useCatalog } from '@/lib/hooks/use-masters';
import { useStockList, useItems, useSuppliers, useAddStock, useUpdateStock, useDeleteStock } from '@/lib/hooks/use-inventory';

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getUTCFullYear()}`;
}

const EMPTY = { categoryId: '', itemId: '', supplierId: '', storeId: '', qty: '', purchasePrice: '', date: toLocalDateInput(new Date()), description: '', documentUrl: '' };

export function StockView({ onShowItems, onShowIssues }: { onShowItems: () => void; onShowIssues: () => void }) {
  const ability = useAbility();
  const canAdd = ability.can('inventory', 'add');
  const canEdit = ability.can('inventory', 'edit');
  const canDelete = ability.can('inventory', 'delete');

  // Was `useStockList()` with `onPage`/`onSize` as no-ops — both controls rendered
  // and changed nothing. Real paging, page size and sort now reach the API.
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [sort, setSort] = useState<SortState | undefined>();
  const list = useStockList({ page, size, sort: sort ? `${sort.key}:${sort.dir}` : undefined });
  const items = useItems();
  const cats = useCatalog('item-category', { size: 100 });
  const stores = useCatalog('item-store', { size: 100 });
  const suppliers = useSuppliers();
  const add = useAddStock();
  const update = useUpdateStock();
  const del = useDeleteStock();
  const toast = useToast();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ItemStockDto | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const rows = list.data?.data ?? [];
  const itemOptions = useMemo(() => {
    const all = items.data?.data ?? [];
    return (form.categoryId ? all.filter((i) => i.categoryId === form.categoryId) : all).map((i) => ({ value: i.id, label: i.name }));
  }, [items.data, form.categoryId]);

  function openAdd() { setEditing(null); setForm(EMPTY); setError(''); setOpen(true); }
  function openEdit(s: ItemStockDto) {
    setEditing(s);
    const item = items.data?.data.find((i) => i.id === s.itemId);
    setForm({ categoryId: item?.categoryId ?? '', itemId: s.itemId, supplierId: s.supplierId ?? '', storeId: s.storeId ?? '', qty: String(s.totalQuantity), purchasePrice: String(s.purchasePrice), date: s.date.slice(0, 10), description: s.description ?? '', documentUrl: s.documentUrl ?? '' });
    setError('');
    setOpen(true);
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, documentUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  }
  async function save() {
    if (!form.itemId || !form.supplierId || !form.qty || !form.purchasePrice) { setError('Item Category, Item, Supplier, Quantity and Purchase Price are required.'); return; }
    const input = { itemId: form.itemId, supplierId: form.supplierId, storeId: form.storeId || null, qty: Number(form.qty) || 0, purchasePrice: Number(form.purchasePrice) || 0, date: new Date(form.date), description: form.description, documentUrl: form.documentUrl };
    if (editing) await update.mutateAsync({ id: editing.id, input });
    else await add.mutateAsync(input);
    setOpen(false);
  }
  async function remove(s: ItemStockDto) {
    const ok = await confirm({
      title: `Delete stock entry for ${s.itemName}?`,
      description: 'The purchased quantity is removed from available stock. This cannot be undone.',
      confirmLabel: 'Delete entry',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await del.mutateAsync(s.id);
      toast.success(`Stock entry for ${s.itemName} deleted`);
    } catch (e) {
      toast.error('Could not delete stock entry', { description: (e as Error).message });
    }
  }

  const cols: Column<ItemStockDto>[] = [
    { key: 'itemName', header: 'Name', className: 'font-medium text-primary' },
    { key: 'categoryName', header: 'Category', render: (s) => s.categoryName ?? '—' },
    { key: 'supplierName', header: 'Supplier', render: (s) => s.supplierName ?? '—' },
    { key: 'storeName', header: 'Store', render: (s) => s.storeName ?? '—' },
    { key: 'date', sortable: true, header: 'Date', render: (s) => fmtDate(s.date) },
    { key: 'description', header: 'Description', render: (s) => <span className="line-clamp-3 text-fg-muted">{s.description || '—'}</span> },
    { key: 'totalQuantity', header: 'Total Quantity', className: 'tabular' },
    { key: 'generatedByName', header: 'Generated By', render: (s) => (s.generatedByName ? `${s.generatedByName}${s.generatedByNo ? ` (${s.generatedByNo})` : ''}` : '—') },
    { key: 'purchasePrice', sortable: true, header: 'Purchase Price ($)', className: 'tabular text-right', render: (s) => s.purchasePrice.toFixed(2) },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Item Stock List"
        actions={
          <>
          {canAdd && <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Item Stock</Button>}
          <Button variant="secondary" onClick={onShowIssues}><Send className="h-4 w-4" /> Issue Item</Button>
          <Button variant="secondary" onClick={onShowItems}><ListChecks className="h-4 w-4" /> Item</Button>
          </>
        }
      />

      <DataTable
        columns={cols}
        rows={rows}
        loading={list.isLoading}
        search={search}
        onSearch={setSearch}
        meta={list.data?.meta}
        onPage={setPage}
        onSize={(v) => { setSize(v); setPage(1); }}
        sort={sort}
        onSort={(k) => {
          setSort((c) => (c?.key !== k ? { key: k, dir: 'asc' } : c.dir === 'asc' ? { key: k, dir: 'desc' } : undefined));
          setPage(1);
        }}
        toolbar={<ExportMenu table={() => ({ title: 'Item Stock List', filename: 'item-stock', headers: cols.map((c) => c.header), rows: rows.map((s) => [s.itemName, s.categoryName ?? '', s.supplierName ?? '', s.storeName ?? '', fmtDate(s.date), s.description ?? '', s.totalQuantity, s.generatedByName ?? '', s.purchasePrice.toFixed(2)]) })} />}
        rowActions={(canEdit || canDelete) ? (s) => (
          <div className="flex gap-1">
            {canEdit && <button onClick={() => openEdit(s)} aria-label="Edit" title="Edit" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"><Pencil className="h-4 w-4" /></button>}
            {canDelete && <button onClick={() => remove(s)} aria-label="Delete" title="Delete" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>}
          </div>
        ) : undefined}
      />

      <FormDrawer open={open} title={editing ? 'Edit Item Stock' : 'Add Item Stock'} onClose={() => setOpen(false)} onSubmit={save} submitting={add.isPending || update.isPending} wide>
        <div className="space-y-5">
          {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Boxes className="h-4 w-4" /> Item</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Item Category" required>
                <Select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value, itemId: '' }))} placeholder="Select"
                  options={(cats.data?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
              </Field>
              <Field label="Item" required>
                <Select value={form.itemId} onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value }))} placeholder="Select" options={itemOptions} />
              </Field>
              <Field label="Supplier" required>
                <Select value={form.supplierId} onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))} placeholder="Select"
                  options={(suppliers.data?.data ?? []).map((s) => ({ value: s.id, label: s.name }))} />
              </Field>
              <Field label="Store">
                <Select value={form.storeId} onChange={(e) => setForm((f) => ({ ...f, storeId: e.target.value }))} placeholder="Select"
                  options={(stores.data?.data ?? []).map((s) => ({ value: s.id, label: s.name }))} />
              </Field>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Purchase Details</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Quantity" required><TextInput type="number" min="1" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} /></Field>
              <Field label="Purchase Price ($)" required><TextInput type="number" step="0.01" value={form.purchasePrice} onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))} /></Field>
              <Field label="Date"><TextInput type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></Field>
            </div>
            <div className="mt-4"><Field label="Description"><TextArea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></Field></div>
            <div className="mt-4"><Field label="Attach Document">
              <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-border px-3 py-2 text-sm text-fg-muted hover:border-primary hover:text-primary">
                <Paperclip className="h-4 w-4" /> {form.documentUrl ? 'Document attached — replace' : 'Drop a file here or click'}
                <input type="file" className="hidden" onChange={onFile} />
              </label>
            </Field></div>
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
