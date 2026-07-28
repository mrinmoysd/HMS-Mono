'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, Pencil, Plus, Trash2, X } from 'lucide-react';
import { REFERRAL_MODULES, type ReferralCommissions, type ReferralPersonDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { ExportMenu } from '@/components/ui/export-menu';
import { useAbility } from '@/lib/auth-store';
import { useCatalog } from '@/lib/hooks/use-masters';
import { useReferralPersons, useCreateReferralPerson, useUpdateReferralPerson, useDeleteReferralPerson } from '@/lib/hooks/use-finance';

const ZERO: ReferralCommissions = { opd: 0, ipd: 0, pharmacy: 0, pathology: 0, radiology: 0, bloodBank: 0, ambulance: 0 };

function commissionLines(c: ReferralCommissions) {
  return REFERRAL_MODULES.map((m) => `${m.label} - ${Number(c[m.key] ?? 0).toFixed(2)}%`);
}

export function PersonView({ onBack }: { onBack: () => void }) {
  const ability = useAbility();
  const canAdd = ability.can('referral', 'add');
  const canEdit = ability.can('referral', 'edit');
  const canDelete = ability.can('referral', 'delete');

  const list = useReferralPersons();
  const categories = useCatalog('referral-category', { size: 100 });
  const create = useCreateReferralPerson();
  const update = useUpdateReferralPerson();
  const del = useDeleteReferralPerson();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReferralPersonDto | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', contactPerson: '', contactPhone: '', category: '', commissionPct: '', address: '' });
  const [mods, setMods] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    const all = list.data?.data ?? [];
    const q = search.trim().toLowerCase();
    return q ? all.filter((p) => `${p.name} ${p.category ?? ''} ${p.phone ?? ''} ${p.contactPerson ?? ''}`.toLowerCase().includes(q)) : all;
  }, [list.data, search]);

  function openAdd() {
    setEditing(null);
    setForm({ name: '', phone: '', contactPerson: '', contactPhone: '', category: '', commissionPct: '', address: '' });
    setMods({});
    setError('');
    setOpen(true);
  }
  function openEdit(p: ReferralPersonDto) {
    setEditing(p);
    setForm({ name: p.name, phone: p.phone ?? '', contactPerson: p.contactPerson ?? '', contactPhone: p.contactPhone ?? '', category: p.category ?? '', commissionPct: p.commissionPct ? String(p.commissionPct) : '', address: p.address ?? '' });
    setMods(Object.fromEntries(REFERRAL_MODULES.map((m) => [m.key, p.commissions[m.key] ? String(p.commissions[m.key]) : ''])));
    setError('');
    setOpen(true);
  }
  function applyToAll() {
    const v = form.commissionPct || '0';
    setMods(Object.fromEntries(REFERRAL_MODULES.map((m) => [m.key, v])));
  }
  async function save() {
    if (!form.name.trim() || !form.category) { setError('Referrer Name and Category are required.'); return; }
    const commissions = { ...ZERO, ...Object.fromEntries(REFERRAL_MODULES.map((m) => [m.key, Number(mods[m.key]) || 0])) } as ReferralCommissions;
    const input = {
      name: form.name, category: form.category, phone: form.phone, contactPerson: form.contactPerson, contactPhone: form.contactPhone,
      address: form.address, commissionPct: Number(form.commissionPct) || 0, commissions,
    };
    if (editing) await update.mutateAsync({ id: editing.id, input });
    else await create.mutateAsync(input);
    setOpen(false);
  }
  async function remove(p: ReferralPersonDto) {
    if (confirm(`Delete referral person "${p.name}"?`)) await del.mutateAsync(p.id);
  }

  const cols: Column<ReferralPersonDto>[] = [
    { key: 'name', header: 'Referrer Name', className: 'font-medium text-primary' },
    { key: 'category', header: 'Category', render: (p) => p.category ?? '—' },
    { key: 'commission', header: 'Commission', render: (p) => <div className="text-xs leading-relaxed">{commissionLines(p.commissions).map((l) => <div key={l}>{l}</div>)}</div> },
    { key: 'phone', header: 'Referrer Contact', render: (p) => p.phone ?? '—' },
    { key: 'contactPerson', header: 'Contact Person Name', render: (p) => p.contactPerson ?? '—' },
    { key: 'contactPhone', header: 'Contact Person Phone', render: (p) => p.contactPhone ?? '—' },
    { key: 'address', header: 'Address', render: (p) => p.address ?? '—' },
  ];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /> Referral Payment</button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Referral Person List</h1>
        {canAdd && <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Referral Person</Button>}
      </div>

      <DataTable
        columns={cols}
        rows={rows}
        loading={list.isLoading}
        search={search}
        onSearch={setSearch}
        onPage={() => {}}
        onSize={() => {}}
        toolbar={<ExportMenu table={() => ({ title: 'Referral Person List', filename: 'referral-persons', headers: ['Referrer Name', 'Category', 'Commission', 'Referrer Contact', 'Contact Person Name', 'Contact Person Phone', 'Address'], rows: rows.map((p) => [p.name, p.category ?? '', commissionLines(p.commissions).join(' | '), p.phone ?? '', p.contactPerson ?? '', p.contactPhone ?? '', p.address ?? '']) })} />}
        rowActions={(canEdit || canDelete) ? (p) => (
          <div className="flex gap-1">
            {canEdit && <button onClick={() => openEdit(p)} aria-label="Edit" title="Edit" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"><Pencil className="h-4 w-4" /></button>}
            {canDelete && <button onClick={() => remove(p)} aria-label="Delete" title="Delete" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>}
          </div>
        ) : undefined}
      />

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
          <div role="dialog" aria-modal="true" aria-label="Add Person" className="relative w-full max-w-4xl rounded-md bg-surface shadow-xl">
            <div className="flex items-center justify-between rounded-t-md bg-primary px-5 py-3 text-primary-fg">
              <h2 className="text-base font-semibold">{editing ? 'Edit Person' : 'Add Person'}</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-2">
              {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger lg:col-span-2">{error}</p>}
              {/* Details */}
              <div className="rounded-md border border-border">
                <div className="border-b border-border px-4 py-2 text-sm font-semibold">Details</div>
                <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                  <Field label="Referrer Name" required><TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
                  <Field label="Referrer Contact"><TextInput value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
                  <Field label="Contact Person Name"><TextInput value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} /></Field>
                  <Field label="Contact Person Phone"><TextInput value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} /></Field>
                  <Field label="Category" required>
                    <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Select Category"
                      options={(categories.data?.data ?? []).map((c) => ({ value: c.name, label: c.name }))} />
                  </Field>
                  <Field label="Standard Commission (%)"><TextInput type="number" step="0.01" value={form.commissionPct} onChange={(e) => setForm((f) => ({ ...f, commissionPct: e.target.value }))} /></Field>
                  <div className="sm:col-span-2"><Field label="Address"><TextArea rows={2} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></Field></div>
                </div>
              </div>
              {/* Commission for Modules */}
              <div className="rounded-md border border-border">
                <div className="flex items-center justify-between border-b border-border px-4 py-2">
                  <span className="text-sm font-semibold">Commission for Modules (%) <span className="text-danger">*</span></span>
                  <Button size="sm" onClick={applyToAll}>Apply To All</Button>
                </div>
                <div className="space-y-3 p-4">
                  {REFERRAL_MODULES.map((m) => (
                    <div key={m.key} className="grid grid-cols-3 items-center gap-3">
                      <label className="col-span-1 text-sm font-medium">{m.label}</label>
                      <div className="col-span-2"><TextInput type="number" step="0.01" value={mods[m.key] ?? ''} onChange={(e) => setMods((s) => ({ ...s, [m.key]: e.target.value }))} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button loading={create.isPending || update.isPending} onClick={save}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
