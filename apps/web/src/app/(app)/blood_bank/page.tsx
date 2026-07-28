'use client';

import { useState } from 'react';
import { Plus, Eye, Pencil, Trash2, CreditCard, Printer, Droplet } from 'lucide-react';
import type { BloodBagDto, BloodDonorDto, BloodIssueDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { ExportMenu } from '@/components/ui/export-menu';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import type { ExportTable } from '@/lib/export';
import {
  useBloodDonors, useDeleteBloodDonor, useBloodBagStatus, useBloodBags, useBloodIssues,
} from '@/lib/hooks/use-departments';
import { useAbility } from '@/lib/auth-store';
import { formatAge } from '@/lib/utils';
import { printBloodIssueBill } from '@/lib/print';
import { BloodDonorForm } from '@/components/emr/blood-donor-form';
import { BloodDonorDetailsModal } from '@/components/emr/blood-donor-details-modal';
import { BloodBagForm } from '@/components/emr/blood-bag-form';
import { BloodComponentSplitForm } from '@/components/emr/blood-component-split-form';
import { BloodIssueForm } from '@/components/emr/blood-issue-form';
import { BloodIssueDetailsModal } from '@/components/emr/blood-issue-details-modal';
import { BloodIssuePaymentsModal } from '@/components/emr/blood-issue-payments-modal';

type Tab = 'status' | 'donors' | 'components' | 'blood-issues' | 'component-issues';

export default function BloodBankPage() {
  const ability = useAbility();
  const canAdd = ability.can('blood_bank', 'add');
  const canDelete = ability.can('blood_bank', 'delete');

  const [tab, setTab] = useState<Tab>('status');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Blood Bank"
        description="Donors, bag inventory, components and issue billing"
      />

      <Tabs
        tabs={[
          { value: 'status', label: 'Blood Bank Status' },
          { value: 'donors', label: 'Donor Details' },
          { value: 'components', label: 'Components List' },
          { value: 'blood-issues', label: 'Blood Issue Details' },
          { value: 'component-issues', label: 'Component Issue Details' },
        ]}
        value={tab}
        onChange={(t) => setTab(t as Tab)}
      />

      {tab === 'status' && <StatusPanel canAdd={canAdd} />}
      {tab === 'donors' && <DonorsPanel canAdd={canAdd} canDelete={canDelete} />}
      {tab === 'components' && <ComponentsPanel canAdd={canAdd} />}
      {tab === 'blood-issues' && <IssuesPanel kind="blood" title="Blood" canAdd={canAdd} />}
      {tab === 'component-issues' && <IssuesPanel kind="component" title="Component" canAdd={canAdd} />}
    </div>
  );
}

function StatusPanel({ canAdd }: { canAdd: boolean }) {
  const { data } = useBloodBagStatus();
  const [issueOpen, setIssueOpen] = useState<{ kind: 'blood' | 'component'; group: string } | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-sm font-semibold">Blood</h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                <th className="px-3 py-2 font-semibold">Blood Group</th>
                <th className="px-3 py-2 text-right font-semibold">Available Bags</th>
                <th className="px-3 py-2 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {(!data || data.blood.length === 0) && (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-fg-muted">No blood in stock</td></tr>
              )}
              {data?.blood.map((row) => (
                <tr key={row.bloodGroup} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2 font-medium">{row.bloodGroup}</td>
                  <td className="px-3 py-2 text-right tabular">
                    <span className={row.count <= 0 ? 'text-danger' : row.count < 3 ? 'text-warning' : 'text-success'}>{row.count}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canAdd && (
                      <Button size="sm" variant="secondary" onClick={() => setIssueOpen({ kind: 'blood', group: row.bloodGroup })}>
                        <Droplet className="h-3.5 w-3.5" /> Issue
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Components</h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                <th className="px-3 py-2 font-semibold">Blood Group</th>
                <th className="px-3 py-2 font-semibold">Component</th>
                <th className="px-3 py-2 text-right font-semibold">Available Bags</th>
                <th className="px-3 py-2 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {(!data || data.components.length === 0) && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-fg-muted">No components in stock</td></tr>
              )}
              {data?.components.map((row) => (
                <tr key={`${row.bloodGroup}-${row.component}`} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2 font-medium">{row.bloodGroup}</td>
                  <td className="px-3 py-2">{row.component}</td>
                  <td className="px-3 py-2 text-right tabular">{row.count}</td>
                  <td className="px-3 py-2 text-right">
                    {canAdd && (
                      <Button size="sm" variant="secondary" onClick={() => setIssueOpen({ kind: 'component', group: row.bloodGroup })}>
                        <Droplet className="h-3.5 w-3.5" /> Issue
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BloodIssueForm
        open={!!issueOpen}
        kind={issueOpen?.kind ?? 'blood'}
        title={issueOpen?.kind === 'component' ? 'Component' : 'Blood'}
        initialBloodGroup={issueOpen?.group}
        onClose={() => setIssueOpen(null)}
      />
    </div>
  );
}

function DonorsPanel({ canAdd, canDelete }: { canAdd: boolean; canDelete: boolean }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDonor, setEditingDonor] = useState<BloodDonorDto | null>(null);
  const [detailDonor, setDetailDonor] = useState<BloodDonorDto | null>(null);
  const [bagFormOpen, setBagFormOpen] = useState(false);

  const donors = useBloodDonors({ search, page, size: 25 });
  const deleteDonor = useDeleteBloodDonor();
  const toast = useToast();
  const confirm = useConfirm();

  function exportTable(): ExportTable {
    const rows = donors.data?.data ?? [];
    return {
      title: 'Donor Details',
      filename: 'blood-donors',
      headers: ['Donor Name', 'Blood Group', 'Gender', 'Age', 'Contact No', 'Address'],
      rows: rows.map((d) => [d.name, d.bloodGroup, d.gender ?? '', formatAge(d.age), d.phone ?? '', d.address ?? '']),
    };
  }

  const cols: Column<BloodDonorDto>[] = [
    { key: 'name', header: 'Donor Name', className: 'font-medium' },
    { key: 'bloodGroup', header: 'Blood Group' },
    { key: 'gender', header: 'Gender', render: (d) => d.gender ?? '—' },
    { key: 'age', header: 'Age', render: (d) => formatAge(d.age) },
    { key: 'phone', header: 'Contact No', render: (d) => d.phone ?? '—' },
    { key: 'address', header: 'Address', render: (d) => d.address ?? '—' },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={cols}
        rows={donors.data?.data ?? []}
        meta={donors.data?.meta}
        loading={donors.isLoading}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        onPage={setPage}
        onSize={() => {}}
        toolbar={
          <>
            <ExportMenu table={exportTable} />
            {canAdd && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setBagFormOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Bag
                </Button>
                <Button size="sm" onClick={() => { setEditingDonor(null); setFormOpen(true); }}>
                  <Plus className="h-4 w-4" /> Add Blood Donor
                </Button>
              </>
            )}
          </>
        }
        rowActions={(d) => (
          <>
            <button onClick={() => setDetailDonor(d)} aria-label="Details" title="Details" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
              <Eye className="h-4 w-4" />
            </button>
            {canAdd && (
              <button onClick={() => { setEditingDonor(d); setFormOpen(true); }} aria-label="Edit" title="Edit" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: `Delete donor ${d.name}?`,
                    description: 'Their bag and donation history will be removed. This cannot be undone.',
                    confirmLabel: 'Delete donor',
                    tone: 'danger',
                  });
                  if (!ok) return;
                  try {
                    await deleteDonor.mutateAsync(d.id);
                    toast.success(`Donor ${d.name} deleted`);
                  } catch (e) {
                    toast.error('Could not delete donor', { description: (e as Error).message });
                  }
                }}
                aria-label="Delete" title="Delete" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      />

      <BloodDonorForm open={formOpen} donor={editingDonor} onClose={() => setFormOpen(false)} />
      <BloodDonorDetailsModal donor={detailDonor} open={!!detailDonor} onClose={() => setDetailDonor(null)} />
      <BloodBagForm open={bagFormOpen} onClose={() => setBagFormOpen(false)} />
    </div>
  );
}

function ComponentsPanel({ canAdd }: { canAdd: boolean }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [splitOpen, setSplitOpen] = useState(false);

  const components = useBloodBags({ kind: 'component', search, page, size: 25 });

  function exportTable(): ExportTable {
    const rows = components.data?.data ?? [];
    return {
      title: 'Components List',
      filename: 'blood-components',
      headers: ['Component', 'Bag No', 'Blood Group', 'Volume', 'Lot', 'Status'],
      rows: rows.map((c) => [c.component ?? '', c.bagNo, c.bloodGroup, c.volume ?? '', c.lot ?? '', c.status]),
    };
  }

  const cols: Column<BloodBagDto>[] = [
    { key: 'component', header: 'Component', className: 'font-medium', render: (c) => c.component ?? '—' },
    { key: 'bagNo', header: 'Bag No' },
    { key: 'bloodGroup', header: 'Blood Group' },
    { key: 'volume', header: 'Volume', render: (c) => c.volume ?? '—' },
    { key: 'lot', header: 'Lot', render: (c) => c.lot ?? '—' },
    {
      key: 'status', header: 'Status',
      render: (c) => <span className={`rounded-sm px-2 py-0.5 text-xs ${c.status === 'available' ? 'bg-success/10 text-success' : 'bg-fg-muted/10 text-fg-muted'}`}>{c.status}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={cols}
        rows={components.data?.data ?? []}
        meta={components.data?.meta}
        loading={components.isLoading}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        onPage={setPage}
        onSize={() => {}}
        toolbar={
          <>
            <ExportMenu table={exportTable} />
            {canAdd && (
              <Button size="sm" onClick={() => setSplitOpen(true)}>
                <Plus className="h-4 w-4" /> Add Components
              </Button>
            )}
          </>
        }
      />
      <BloodComponentSplitForm open={splitOpen} onClose={() => setSplitOpen(false)} />
    </div>
  );
}

function IssuesPanel({ kind, title, canAdd }: { kind: 'blood' | 'component'; title: string; canAdd: boolean }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [issueOpen, setIssueOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [paymentsId, setPaymentsId] = useState<string | null>(null);

  const issues = useBloodIssues({ type: kind, search, page, size: 25 });

  function exportTable(): ExportTable {
    const rows = issues.data?.data ?? [];
    return {
      title: `${title} Issue Details`,
      filename: `blood-${kind}-issues`,
      headers: ['Bill No', 'Case ID', 'Issue Date', 'Patient Name', 'Blood Group', 'Bags', 'Donor Name', 'Amount', 'Paid', 'Balance'],
      rows: rows.map((i) => [
        i.billNo, i.caseNo ?? '', new Date(i.issueDate).toLocaleString(), i.patientName, i.bloodGroup ?? '', i.bagNo ?? '', i.donorName ?? '',
        i.subtotal.toFixed(2), i.paid.toFixed(2), i.balance.toFixed(2),
      ]),
    };
  }

  const cols: Column<BloodIssueDto>[] = [
    { key: 'billNo', header: 'Bill No', className: 'font-medium' },
    { key: 'caseNo', header: 'Case ID', render: (i) => i.caseNo ?? '—' },
    { key: 'issueDate', header: 'Issue Date', render: (i) => new Date(i.issueDate).toLocaleString() },
    { key: 'patientName', header: 'Patient Name' },
    { key: 'bloodGroup', header: 'Blood Group', render: (i) => i.bloodGroup ?? '—' },
    { key: 'bagNo', header: 'Bags', render: (i) => i.bagNo ?? '—' },
    ...(kind === 'component' ? [{ key: 'component', header: 'Component', render: (i: BloodIssueDto) => i.component ?? '—' } as Column<BloodIssueDto>] : []),
    { key: 'donorName', header: 'Donor Name', render: (i) => i.donorName ?? '—' },
    { key: 'subtotal', header: 'Amount (#)', className: 'tabular', render: (i) => i.subtotal.toFixed(2) },
    { key: 'paid', header: 'Paid (#)', className: 'tabular', render: (i) => i.paid.toFixed(2) },
    {
      key: 'balance', header: 'Balance (#)', className: 'tabular',
      render: (i) => <span className={i.balance > 0 ? 'text-warning' : 'text-success'}>{i.balance.toFixed(2)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={cols}
        rows={issues.data?.data ?? []}
        meta={issues.data?.meta}
        loading={issues.isLoading}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        onPage={setPage}
        onSize={() => {}}
        toolbar={
          <>
            <ExportMenu table={exportTable} />
            {canAdd && (
              <Button size="sm" onClick={() => setIssueOpen(true)}>
                <Plus className="h-4 w-4" /> Issue {title}
              </Button>
            )}
          </>
        }
        rowActions={(i) => (
          <>
            <button onClick={() => setDetailId(i.id)} aria-label="Details" title="Bill Details" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
              <Eye className="h-4 w-4" />
            </button>
            <button onClick={() => setPaymentsId(i.id)} aria-label="Payments" title="Payments" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
              <CreditCard className="h-4 w-4" />
            </button>
            <button onClick={() => printBloodIssueBill(title, i)} aria-label="Print" title="Print" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
              <Printer className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <BloodIssueForm open={issueOpen} kind={kind} title={title} onClose={() => setIssueOpen(false)} />
      <BloodIssueDetailsModal id={detailId} title={title} open={!!detailId} onClose={() => setDetailId(null)} />
      <BloodIssuePaymentsModal id={paymentsId} open={!!paymentsId} onClose={() => setPaymentsId(null)} />
    </div>
  );
}
