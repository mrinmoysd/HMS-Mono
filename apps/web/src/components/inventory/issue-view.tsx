'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useMemo, useState } from 'react';
import { ChevronLeft, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import type { ItemIssueDto } from '@smart-hospital/shared';
import { DataTable, type Column, type SortState } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { ExportMenu } from '@/components/ui/export-menu';
import { useAbility, useAuthStore } from '@/lib/auth-store';
import { useCatalog } from '@/lib/hooks/use-masters';
import { useStaff, useStaffRoles } from '@/lib/hooks/use-hr';
import { useIssueList, useItems, useIssueItem, useUpdateIssue, useReturnItem, useDeleteIssue } from '@/lib/hooks/use-inventory';
import { toLocalDateInput } from '@/lib/datetime';
import { fmtDate } from './stock-view';

export function IssueView({ onBack }: { onBack: () => void }) {
  const ability = useAbility();
  const canAdd = ability.can('inventory', 'add');
  const canEdit = ability.can('inventory', 'edit');
  const canDelete = ability.can('inventory', 'delete');

  // Was `useIssueList()` with `onPage`/`onSize` as no-ops: the table rendered
  // pagination and a rows-per-page control that changed nothing, and the hook
  // silently capped the list at its own default. All three are real now.
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [sort, setSort] = useState<SortState | undefined>();
  const list = useIssueList({ page, size, sort: sort ? `${sort.key}:${sort.dir}` : undefined });
  const ret = useReturnItem();
  const del = useDeleteIssue();
  const toast = useToast();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [returning, setReturning] = useState<ItemIssueDto | null>(null);
  const [editing, setEditing] = useState<ItemIssueDto | null>(null);

  const rows = list.data?.data ?? [];

  async function remove(r: ItemIssueDto) {
    const ok = await confirm({
      title: `Delete issue of ${r.itemName}?`,
      description: 'The issue record is removed and the quantity returns to available stock.',
      confirmLabel: 'Delete issue',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await del.mutateAsync(r.id);
      toast.success(`Issue of ${r.itemName} deleted`);
    } catch (e) {
      toast.error('Could not delete issue', { description: (e as Error).message });
    }
  }

  const cols: Column<ItemIssueDto>[] = [
    { key: 'itemName', header: 'Item', className: 'font-medium text-primary' },
    { key: 'categoryName', header: 'Item Category', render: (r) => r.categoryName ?? '—' },
    { key: 'date', sortable: true, header: 'Issue - Return', render: (r) => `${fmtDate(r.issueDate)}${r.returnDate ? ` - ${fmtDate(r.returnDate)}` : ''}` },
    { key: 'issuedTo', sortable: true, header: 'Issue To', render: (r) => r.issuedTo ?? '—' },
    { key: 'issuedByName', header: 'Issued By', render: (r) => r.issuedByName ?? '—' },
    { key: 'qty', sortable: true, header: 'Quantity', className: 'tabular' },
    { key: 'note', header: 'Note', render: (r) => r.note ?? '' },
    {
      key: 'status', header: 'Status', render: (r) => r.status === 'returned'
        ? <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">Returned</span>
        : (canEdit ? <button onClick={() => setReturning(r)} className="flex items-center gap-1 rounded-sm bg-primary px-2.5 py-1 text-xs font-medium text-primary-fg hover:bg-primary/90"><RotateCcw className="h-3.5 w-3.5" /> Click To Return</button> : <span className="text-xs text-fg-muted">Issued</span>),
    },
  ];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /> Item Stock</button>
      <PageHeader
        title="Issue Item List"
        actions={canAdd && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Issue Item</Button>}
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
        toolbar={<ExportMenu table={() => ({ title: 'Issue Item List', filename: 'issue-items', headers: ['Item', 'Item Category', 'Issue - Return', 'Issue To', 'Issued By', 'Quantity', 'Note', 'Status'], rows: rows.map((r) => [r.itemName, r.categoryName ?? '', `${fmtDate(r.issueDate)}${r.returnDate ? ` - ${fmtDate(r.returnDate)}` : ''}`, r.issuedTo ?? '', r.issuedByName ?? '', r.qty, r.note ?? '', r.status === 'returned' ? 'Returned' : 'Issued']) })} />}
        rowActions={(r) => (
          <>
            {/* Returned issues are not editable: the DTO reports their quantity
                as 0 once returned, and re-issuing is a new issue, not an edit. */}
            {canEdit && r.status !== 'returned' && (
              <button onClick={() => setEditing(r)} aria-label="Edit" title="Edit" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"><Pencil className="h-4 w-4" /></button>
            )}
            {canDelete && (
              <button onClick={() => remove(r)} aria-label="Delete" title="Delete" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
            )}
          </>
        )}
      />

      {open && <IssueModal onClose={() => setOpen(false)} />}
      {editing && <IssueModal issue={editing} onClose={() => setEditing(null)} />}
      {returning && (
        <ConfirmReturn row={returning} saving={ret.isPending} onClose={() => setReturning(null)}
          onConfirm={async () => { await ret.mutateAsync(returning.id); setReturning(null); }} />
      )}
    </div>
  );
}

/** Add or edit an issue. One form for both so the two cannot drift apart. */
function IssueModal({ issue: editing, onClose }: { issue?: ItemIssueDto; onClose: () => void }) {
  const roles = useStaffRoles();
  const cats = useCatalog('item-category', { size: 100 });
  const items = useItems();
  const issue = useIssueItem();
  const update = useUpdateIssue();
  const me = useAuthStore((s) => s.user);

  const [userType, setUserType] = useState(editing?.userType ?? '');
  const staff = useStaff(userType || undefined, { size: 200 });
  const [issuedTo, setIssuedTo] = useState(editing?.issuedTo ?? '');
  // Local calendar date: toISOString().slice(0,10) reads the UTC day and rolls
  // a date early anywhere east of UTC.
  const [issueDate, setIssueDate] = useState(
    editing ? toLocalDateInput(new Date(editing.issueDate)) : toLocalDateInput(new Date()),
  );
  const [returnDate, setReturnDate] = useState(
    editing?.returnDate ? toLocalDateInput(new Date(editing.returnDate)) : '',
  );
  const [note, setNote] = useState(editing?.note ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [itemId, setItemId] = useState(editing?.itemId ?? '');
  const [qty, setQty] = useState(editing ? String(editing.qty) : '');
  const [error, setError] = useState('');

  const itemOptions = useMemo(() => {
    const all = items.data?.data ?? [];
    return (categoryId ? all.filter((i) => i.categoryId === categoryId) : all).map((i) => ({ value: i.id, label: i.name }));
  }, [items.data, categoryId]);
  const availableNow = items.data?.data.find((i) => i.id === itemId)?.availableQuantity ?? 0;
  // When editing, this issue's own quantity is already deducted from the
  // available figure, so it has to be added back before comparing — otherwise
  // re-saving an unchanged issue would fail its own validation.
  const available = editing && editing.itemId === itemId ? availableNow + editing.qty : availableNow;

  async function save() {
    setError('');
    if (!userType || !issuedTo || !issueDate || !itemId || !qty) { setError('User Type, Issue To, Issue Date, Item and Quantity are required.'); return; }
    if (Number(qty) > available) { setError(`Insufficient stock — available ${available}.`); return; }
    const payload = {
      itemId, userType, issuedTo, qty: Number(qty) || 0,
      date: new Date(issueDate),
      returnDate: returnDate ? new Date(returnDate) : null,
      note,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, input: payload });
      else await issue.mutateAsync(payload);
      onClose();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Insufficient stock for this item.');
    }
  }

  return (
    <FormDrawer
      open
      title={editing ? `Edit Issue — ${editing.itemName}` : 'Add Issue Item'}
      onClose={onClose}
      onSubmit={save}
      submitting={issue.isPending || update.isPending}
      wide
    >
      <div className="space-y-5">
        {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div>
          <p className="mb-2 text-sm font-semibold">Details</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="User Type" required>
              <Select value={userType} onChange={(e) => { setUserType(e.target.value); setIssuedTo(''); }} placeholder="Select"
                options={(roles.data ?? []).map((r) => ({ value: r.slug, label: r.label }))} />
            </Field>
            <Field label="Issue To" required>
              <Select value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} placeholder="Select" disabled={!userType}
                options={(staff.data?.data ?? []).map((s) => ({ value: `${s.roleLabel} ${s.name}${s.staffNo ? ` (${s.staffNo})` : ''}`, label: `${s.roleLabel} ${s.name}${s.staffNo ? ` (${s.staffNo})` : ''}` }))} />
            </Field>
            <Field label="Issued By" required><TextInput value={me?.name ?? 'Super Admin'} readOnly className="bg-bg" /></Field>
            <Field label="Issue Date" required><TextInput type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></Field>
            <Field label="Return Date"><TextInput type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} /></Field>
            <Field label="Note"><TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Item</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Item Category" required>
              <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setItemId(''); }} placeholder="Select"
                options={(cats.data?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
            </Field>
            <Field label="Item" required>
              <Select value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder="Select" options={itemOptions} />
            </Field>
            <Field label="Quantity" required>
              <TextInput type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
              <p className="mt-1 text-xs text-fg-muted">Available Quantity: {available}</p>
            </Field>
          </div>
        </div>
      </div>
    </FormDrawer>
  );
}

function ConfirmReturn({ row, saving, onConfirm, onClose }: { row: ItemIssueDto; saving: boolean; onConfirm: () => void; onClose: () => void }) {
  const line = (label: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 text-sm last:border-0">
      <span className="text-fg-muted">{label}</span><span className="font-semibold">{value}</span>
    </div>
  );
  return (
    <Modal
      open
      onClose={onClose}
      title="Confirm Return"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={onConfirm}>Return</Button>
        </>
      }
    >
      <div>
          <p className="mb-3 text-sm text-fg-muted">⚠️ Are You Sure To Return This Item !</p>
          <div className="rounded-md border border-border">
            {line('Item', row.itemName)}
            {line('Item Category', row.categoryName ?? '—')}
            {line('Quantity', row.qty)}
          </div>
        </div>
    </Modal>
  );
}
