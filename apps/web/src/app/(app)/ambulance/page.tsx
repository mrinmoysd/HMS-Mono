'use client';

import { useState } from 'react';
import { Plus, Eye, Pencil, Trash2, CreditCard, Printer, List } from 'lucide-react';
import type { AmbulanceCallDto, AmbulanceVehicleDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ExportMenu } from '@/components/ui/export-menu';
import type { ExportTable } from '@/lib/export';
import { useAmbulanceVehicles, useAmbulanceCalls, useDeleteVehicle } from '@/lib/hooks/use-finance';
import { useAbility } from '@/lib/auth-store';
import { printAmbulanceBill } from '@/lib/print';
import { AmbulanceVehicleForm } from '@/components/emr/ambulance-vehicle-form';
import { AmbulanceCallForm } from '@/components/emr/ambulance-call-form';
import { AmbulanceCallDetailsModal } from '@/components/emr/ambulance-call-details-modal';
import { AmbulanceCallPaymentsModal } from '@/components/emr/ambulance-call-payments-modal';

type Tab = 'fleet' | 'calls';

export default function AmbulancePage() {
  const ability = useAbility();
  const canAdd = ability.can('ambulance', 'add');
  const canDelete = ability.can('ambulance', 'delete');
  const [tab, setTab] = useState<Tab>('fleet');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ambulance</h1>
          <p className="text-sm text-fg-muted">Fleet management and call log with fare billing</p>
        </div>
      </div>

      <Tabs tabs={[{ value: 'fleet', label: 'Ambulance List' }, { value: 'calls', label: 'Ambulance Call List' }]}
        value={tab} onChange={(t) => setTab(t as Tab)} />

      {tab === 'fleet' ? <FleetPanel canAdd={canAdd} canDelete={canDelete} onGoToCalls={() => setTab('calls')} /> : <CallsPanel canAdd={canAdd} onGoToFleet={() => setTab('fleet')} />}
    </div>
  );
}

function FleetPanel({ canAdd, canDelete, onGoToCalls }: { canAdd: boolean; canDelete: boolean; onGoToCalls: () => void }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AmbulanceVehicleDto | null>(null);

  const vehicles = useAmbulanceVehicles({ search, page, size: 25 });
  const deleteVehicle = useDeleteVehicle();

  function exportTable(): ExportTable {
    const rows = vehicles.data?.data ?? [];
    return {
      title: 'Ambulance List',
      filename: 'ambulance-vehicles',
      headers: ['Vehicle Number', 'Vehicle Model', 'Year Made', 'Driver Name', 'Driver License', 'Driver Contact', 'Note', 'Vehicle Type'],
      rows: rows.map((v) => [v.vehicleNo, v.model ?? '', v.year ?? '', v.driverName ?? '', v.driverLicense ?? '', v.driverContact ?? '', v.note ?? '', v.vehicleType ?? '']),
    };
  }

  const cols: Column<AmbulanceVehicleDto>[] = [
    { key: 'vehicleNo', header: 'Vehicle Number', className: 'font-medium' },
    { key: 'model', header: 'Vehicle Model', render: (v) => v.model ?? '—' },
    { key: 'year', header: 'Year Made', render: (v) => v.year ?? '—' },
    { key: 'driverName', header: 'Driver Name', render: (v) => v.driverName ?? '—' },
    { key: 'driverLicense', header: 'Driver License', render: (v) => v.driverLicense ?? '—' },
    { key: 'driverContact', header: 'Driver Contact', render: (v) => v.driverContact ?? '—' },
    { key: 'note', header: 'Note', render: (v) => v.note ?? '—' },
    {
      key: 'vehicleType', header: 'Vehicle Type',
      render: (v) => v.vehicleType ? v.vehicleType.charAt(0).toUpperCase() + v.vehicleType.slice(1) : '—',
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={cols}
        rows={vehicles.data?.data ?? []}
        meta={vehicles.data?.meta}
        loading={vehicles.isLoading}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        onPage={setPage}
        onSize={() => {}}
        toolbar={
          <>
            <ExportMenu table={exportTable} />
            <Button size="sm" variant="secondary" onClick={onGoToCalls}>
              <List className="h-4 w-4" /> Ambulance Call List
            </Button>
            {canAdd && (
              <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4" /> Add Ambulance
              </Button>
            )}
          </>
        }
        rowActions={(v) => (
          <>
            {canAdd && (
              <button onClick={() => { setEditing(v); setFormOpen(true); }} aria-label="Edit" title="Edit" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={async () => { if (confirm(`Delete vehicle "${v.vehicleNo}"?`)) await deleteVehicle.mutateAsync(v.id); }}
                aria-label="Delete" title="Delete" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      />

      <AmbulanceVehicleForm open={formOpen} vehicle={editing} onClose={() => setFormOpen(false)} />
    </div>
  );
}

function CallsPanel({ canAdd, onGoToFleet }: { canAdd: boolean; onGoToFleet: () => void }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [callOpen, setCallOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [paymentsId, setPaymentsId] = useState<string | null>(null);

  const calls = useAmbulanceCalls({ search, page, size: 100 });

  function exportTable(): ExportTable {
    const rows = calls.data?.data ?? [];
    return {
      title: 'Ambulance Call List',
      filename: 'ambulance-calls',
      headers: ['Bill No', 'Case ID', 'Patient Name', 'Generated By', 'Vehicle Number', 'Vehicle Model', 'Driver Name', 'Driver Contact', 'Patient Address', 'Date', 'Amount', 'Discount(%)', 'Tax(%)', 'Net Amount', 'Paid', 'Balance'],
      rows: rows.map((c) => [
        c.billNo, c.caseNo ?? '', `${c.patientName}${c.patientNo ? ` (${c.patientNo})` : ''}`, c.createdByName ?? '',
        c.vehicleNo, c.vehicleModel ?? '', c.driverName ?? '', c.driverContact ?? '', c.patientAddress ?? '',
        new Date(c.date).toLocaleString(), c.subtotal.toFixed(2), c.discount.toFixed(2), c.tax.toFixed(2),
        c.netAmount.toFixed(2), c.paid.toFixed(2), c.balance.toFixed(2),
      ]),
    };
  }

  const cols: Column<AmbulanceCallDto>[] = [
    { key: 'billNo', header: 'Bill No', className: 'font-medium' },
    { key: 'caseNo', header: 'Case ID', render: (c) => c.caseNo ?? '—' },
    { key: 'patientName', header: 'Patient Name', render: (c) => `${c.patientName}${c.patientNo ? ` (${c.patientNo})` : ''}` },
    { key: 'createdByName', header: 'Generated By', render: (c) => c.createdByName ?? '—' },
    { key: 'vehicleNo', header: 'Vehicle Number' },
    { key: 'vehicleModel', header: 'Vehicle Model', render: (c) => c.vehicleModel ?? '—' },
    { key: 'driverName', header: 'Driver Name', render: (c) => c.driverName ?? '—' },
    { key: 'driverContact', header: 'Driver Contact No', render: (c) => c.driverContact ?? '—' },
    { key: 'patientAddress', header: 'Patient Address', render: (c) => c.patientAddress ?? '—' },
    { key: 'date', header: 'Date', render: (c) => new Date(c.date).toLocaleString() },
    { key: 'subtotal', header: 'Amount ($)', className: 'tabular', render: (c) => c.subtotal.toFixed(2) },
    { key: 'discount', header: 'Discount', className: 'tabular', render: (c) => c.discount.toFixed(2) },
    { key: 'tax', header: 'Tax', className: 'tabular', render: (c) => c.tax.toFixed(2) },
    { key: 'netAmount', header: 'Net Amount ($)', className: 'tabular', render: (c) => c.netAmount.toFixed(2) },
    { key: 'paid', header: 'Paid ($)', className: 'tabular', render: (c) => c.paid.toFixed(2) },
    {
      key: 'balance', header: 'Balance ($)', className: 'tabular',
      render: (c) => <span className={c.balance > 0 ? 'text-warning' : 'text-success'}>{c.balance.toFixed(2)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={cols}
        rows={calls.data?.data ?? []}
        meta={calls.data?.meta}
        loading={calls.isLoading}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        onPage={setPage}
        onSize={() => {}}
        toolbar={
          <>
            <ExportMenu table={exportTable} />
            {canAdd && (
              <Button size="sm" onClick={() => setCallOpen(true)}>
                <Plus className="h-4 w-4" /> Add Ambulance Call
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={onGoToFleet}>
              <List className="h-4 w-4" /> Ambulance List
            </Button>
          </>
        }
        rowActions={(c) => (
          <>
            <button onClick={() => setDetailId(c.id)} aria-label="Details" title="Bill Details" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
              <Eye className="h-4 w-4" />
            </button>
            <button onClick={() => setPaymentsId(c.id)} aria-label="Payments" title="Payments" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
              <CreditCard className="h-4 w-4" />
            </button>
            <button onClick={() => printAmbulanceBill(c)} aria-label="Print" title="Print" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
              <Printer className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <AmbulanceCallForm open={callOpen} onClose={() => setCallOpen(false)} />
      <AmbulanceCallDetailsModal id={detailId} open={!!detailId} onClose={() => setDetailId(null)} />
      <AmbulanceCallPaymentsModal id={paymentsId} open={!!paymentsId} onClose={() => setPaymentsId(null)} />
    </div>
  );
}
