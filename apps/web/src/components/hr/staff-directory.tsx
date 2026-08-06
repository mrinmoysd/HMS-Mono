'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useState } from 'react';
import { LayoutGrid, List, Phone, Pencil, Eye, Plus, CalendarCheck, Wallet, Plane } from 'lucide-react';
import type { StaffDto } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { DataTable, type Column } from '@/components/ui/data-table';
import { useStaff, useStaffRoles } from '@/lib/hooks/use-hr';
import { useAbility } from '@/lib/auth-store';
import { StaffAvatar, roleBadgeClass } from './staff-shared';

interface Props {
  onAdd: () => void;
  onShow: (userId: string) => void;
  onEdit: (userId: string) => void;
  onAttendance: () => void;
  onPayroll: () => void;
  onLeaves: () => void;
}

export function StaffDirectory({ onAdd, onShow, onEdit, onAttendance, onPayroll, onLeaves }: Props) {
  const ability = useAbility();
  const canAdd = ability.can('human_resource', 'add');
  const canEdit = ability.can('human_resource', 'edit');
  const roles = useStaffRoles();

  const [roleFilter, setRoleFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'card' | 'list'>('card');

  const staff = useStaff(roleFilter || undefined, { search, page: 1, size: 200 });
  const rows = staff.data?.data ?? [];

  // DataTable keys on `id`; StaffDto's identifier is `userId`. Map rather than
  // rename the DTO field — userId is what every callback here already passes.
  const listRows = rows.map((s) => ({ ...s, id: s.userId }));

  const listColumns: Column<StaffDto & { id: string }>[] = [
    { key: 'staffNo', header: 'Staff ID', className: 'font-medium', alwaysVisible: true, render: (s) => s.staffNo ?? '—' },
    { key: 'name', header: 'Name' },
    { key: 'roleLabel', header: 'Role', render: (s) => <span className={`rounded-full px-2 py-0.5 text-xs ${roleBadgeClass(s.roleSlug)}`}>{s.roleLabel}</span> },
    { key: 'designationName', header: 'Designation', render: (s) => s.designationName ?? '—' },
    { key: 'specialistName', header: 'Specialist', render: (s) => s.specialistName ?? '—' },
    { key: 'phone', header: 'Contact', render: (s) => s.phone ?? '—' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Staff Directory"
        actions={
          <>
            {canAdd && <Button onClick={onAdd}><Plus className="h-4 w-4" /> Add Staff</Button>}
            <Button variant="secondary" onClick={onAttendance}><CalendarCheck className="h-4 w-4" /> Staff Attendance</Button>
            <Button variant="secondary" onClick={onPayroll}><Wallet className="h-4 w-4" /> Payroll</Button>
            <Button variant="secondary" onClick={onLeaves}><Plane className="h-4 w-4" /> Leaves</Button>
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface p-4">
        <div className="w-56">
          <Field label="Role">
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} placeholder="Select"
              options={(roles.data ?? []).map((r) => ({ value: r.slug, label: r.label }))} />
          </Field>
        </div>
        <div className="flex-1 min-w-[240px]">
          <Field label="Search By Keyword">
            <TextInput value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Search By Staff ID, Name, Role etc…"
              onKeyDown={(e) => { if (e.key === 'Enter') setSearch(keyword); }} />
          </Field>
        </div>
        <Button onClick={() => setSearch(keyword)}>Search</Button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-fg-muted">Staff List</p>
        <div className="flex overflow-hidden rounded-sm border border-border">
          <button onClick={() => setView('card')} className={`flex items-center gap-1 px-3 py-1.5 text-xs ${view === 'card' ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-border/40'}`}>
            <LayoutGrid className="h-3.5 w-3.5" /> Card View
          </button>
          <button onClick={() => setView('list')} className={`flex items-center gap-1 px-3 py-1.5 text-xs ${view === 'list' ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-border/40'}`}>
            <List className="h-3.5 w-3.5" /> List View
          </button>
        </div>
      </div>

      {staff.isLoading && <p className="py-10 text-center text-sm text-fg-muted">Loading…</p>}

      {/* DataTable keys on `id`; StaffDto's identifier is userId. */}
      {view === 'card' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((s) => <StaffCard key={s.userId} s={s} canEdit={canEdit} onShow={onShow} onEdit={onEdit} />)}
        </div>
      ) : (
        /* Was a hand-rolled <table>. DataTable gives this list the same
           sorting, column chooser and empty state as every other list in the
           app; the card view above stays bespoke because it is not a table. */
        <DataTable
          columns={listColumns}
          rows={listRows}
          loading={staff.isLoading}
          search=""
          onSearch={() => {}}
          onPage={() => {}}
          onSize={() => {}}
          hideSearch
          rowActions={(s) => (
            <div className="flex gap-1">
              <button onClick={() => onShow(s.userId)} aria-label="Show" title="Show" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"><Eye className="h-4 w-4" /></button>
              {canEdit && <button onClick={() => onEdit(s.userId)} aria-label="Edit" title="Edit" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"><Pencil className="h-4 w-4" /></button>}
            </div>
          )}
        />
      )}

      {!staff.isLoading && rows.length === 0 && <p className="py-12 text-center text-sm text-fg-muted">No staff found</p>}
    </div>
  );
}

function StaffCard({ s, canEdit, onShow, onEdit }: { s: StaffDto; canEdit: boolean; onShow: (id: string) => void; onEdit: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex gap-4 p-4">
        <StaffAvatar photoUrl={s.photoUrl} name={s.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{s.name}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs ${roleBadgeClass(s.roleSlug)}`}>{s.roleLabel}</span>
            {s.designationName && <span className="rounded-full bg-border/60 px-2 py-0.5 text-xs text-fg-muted">{s.designationName}</span>}
          </div>
          <p className="mt-0.5 text-sm text-fg-muted"># {s.staffNo ?? '—'}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 text-primary" />
              <div><p className="text-[10px] uppercase tracking-wide text-fg-muted">Contact No</p><p>{s.phone ?? '—'}</p></div>
            </div>
            {s.specialistName && <div><p className="text-[10px] uppercase tracking-wide text-fg-muted">Specialist Name</p><p>{s.specialistName}</p></div>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 border-t border-border">
        <button onClick={() => onShow(s.userId)} className="border-r border-border py-2 text-sm text-primary hover:bg-primary/5">Show</button>
        <button onClick={() => canEdit && onEdit(s.userId)} disabled={!canEdit} className="py-2 text-sm text-fg-muted hover:bg-border/30 disabled:opacity-50">Edit</button>
      </div>
    </div>
  );
}
