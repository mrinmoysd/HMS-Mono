'use client';

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  IdCard,
  ScrollText,
  ChevronDown,
  Stethoscope,
  BedDouble,
  Scan,
  TestTube,
  Pill,
} from 'lucide-react';
import type { PatientDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button, IconButton } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Menu, MenuItem } from '@/components/ui/menu';
import { ExportMenu } from '@/components/ui/export-menu';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { PatientReportModal } from '@/components/patient-report-modal';
import { PatientForm } from './patient-form';
import { ImportModal } from './import-modal';
import {
  usePatients,
  useDeletePatient,
  useBulkDeletePatients,
} from '@/lib/hooks/use-patients';
import { useAbility } from '@/lib/auth-store';
import { formatAge } from '@/lib/utils';
import type { ExportTable } from '@/lib/export';

type ListTab = 'all' | 'disabled';

export default function PatientPage() {
  const params = useSearchParams();
  const router = useRouter();
  const ability = useAbility();
  const toast = useToast();
  const confirm = useConfirm();
  const canAdd = ability.can('patient', 'add');
  const canEdit = ability.can('patient', 'edit');
  const canDelete = ability.can('patient', 'delete');

  const [listTab, setListTab] = useState<ListTab>('all');
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<PatientDto | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  const { data, isLoading, error } = usePatients({
    search,
    page,
    size,
    ...(listTab === 'disabled' ? { disabled: 'true' as const } : {}),
  });
  const del = useDeletePatient();
  const bulkDel = useBulkDeletePatients();

  const columns = useMemo<Column<PatientDto>[]>(
    () => [
      { key: 'patientNo', header: 'Patient No', className: 'font-medium' },
      {
        key: 'name',
        header: 'Name',
        render: (p) => (
          <div className="flex items-center gap-2">
            <Link href={`/patient/${p.id}`} className="font-medium text-primary hover:underline">
              {p.name} <span className="text-fg-muted">({p.patientNo})</span>
            </Link>
            {p.isDisabled && (
              <Badge tone="warning" size="sm">
                Disabled
              </Badge>
            )}
          </div>
        ),
      },
      { key: 'age', header: 'Age', className: 'tabular', render: (p) => formatAge(p.age) },
      { key: 'gender', header: 'Gender', render: (p) => p.gender ?? '—' },
      { key: 'phone', header: 'Phone', render: (p) => p.phone ?? '—' },
      { key: 'guardianName', header: 'Guardian', render: (p) => p.guardianName ?? '—' },
      { key: 'address', header: 'Address', render: (p) => p.address ?? '—' },
      {
        key: 'isDeceased',
        header: 'Dead',
        render: (p) =>
          p.isDeceased ? (
            <span className="font-medium text-danger">Yes</span>
          ) : (
            <span className="text-fg-muted">No</span>
          ),
      },
    ],
    [],
  );

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleAll(ids: string[]) {
    setSelected((s) => (ids.every((id) => s.has(id)) ? new Set() : new Set(ids)));
  }

  async function onDelete(p: PatientDto) {
    const ok = await confirm({
      title: `Delete ${p.name}?`,
      description: `Patient ${p.patientNo} and their linked records will be removed. This cannot be undone.`,
      confirmLabel: 'Delete patient',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await del.mutateAsync(p.id);
      toast.success(`${p.name} deleted`);
    } catch (e) {
      toast.error('Could not delete patient', { description: (e as Error).message });
    }
  }

  async function onBulkDelete() {
    if (!selected.size) return;
    const ok = await confirm({
      title: `Delete ${selected.size} patient${selected.size === 1 ? '' : 's'}?`,
      description: 'The selected records and everything linked to them will be removed. This cannot be undone.',
      confirmLabel: `Delete ${selected.size}`,
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const count = selected.size;
      await bulkDel.mutateAsync([...selected]);
      setSelected(new Set());
      toast.success(`${count} patient${count === 1 ? '' : 's'} deleted`);
    } catch (e) {
      toast.error('Could not delete patients', { description: (e as Error).message });
    }
  }

  /** Quick-create an encounter for a patient (OPD/IPD open a prefilled form). */
  function quickCreate(p: PatientDto, module: 'opd' | 'ipd' | 'radiology' | 'pathology' | 'pharmacy') {
    const label = encodeURIComponent(`${p.name} · ${p.patientNo}`);
    if (module === 'opd' || module === 'ipd') {
      router.push(`/${module}?new=1&patientId=${p.id}&patientName=${label}`);
    } else {
      router.push(`/${module}?patientId=${p.id}&patientName=${label}`);
    }
  }

  function exportTable(): ExportTable {
    const rows = data?.data ?? [];
    return {
      title: listTab === 'disabled' ? 'Disabled Patient List' : 'Patient List',
      filename: listTab === 'disabled' ? 'disabled-patients' : 'patients',
      headers: ['Patient No', 'Name', 'Age', 'Gender', 'Phone', 'Guardian', 'Address', 'Dead'],
      rows: rows.map((p) => [
        p.patientNo,
        p.name,
        formatAge(p.age),
        p.gender ?? '',
        p.phone ?? '',
        p.guardianName ?? '',
        p.address ?? '',
        p.isDeceased ? 'Yes' : 'No',
      ]),
    };
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Patients" description="Central patient registry">
        <Tabs
          tabs={[
            { value: 'all', label: 'Patient List' },
            { value: 'disabled', label: 'Disabled Patient List' },
          ]}
          value={listTab}
          onChange={(t) => {
            setListTab(t as ListTab);
            setPage(1);
            setSelected(new Set());
          }}
        />
      </PageHeader>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        meta={data?.meta}
        loading={isLoading}
        error={error ? 'Failed to load patients' : undefined}
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onPage={setPage}
        onSize={(s) => {
          setSize(s);
          setPage(1);
        }}
        selectable={canDelete}
        selected={selected}
        onToggle={toggle}
        onToggleAll={toggleAll}
        rowActions={(p) => (
          <>
            <IconButton
              label="Show patient details"
              tone="primary"
              size="sm"
              onClick={() => setReportId(p.id)}
            >
              <ScrollText className="h-3.5 w-3.5" />
            </IconButton>
            <Link
              href={`/patient/${p.id}`}
              aria-label="View 360 profile"
              title="View 360 profile"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-line text-fg-muted transition hover:bg-primary-soft hover:text-primary"
            >
              <IdCard className="h-3.5 w-3.5" />
            </Link>
            <Menu
              trigger={
                <span className="flex h-7 items-center gap-1 rounded-sm border border-line px-2 text-xs text-fg-muted transition hover:bg-surface-sunken hover:text-fg">
                  Action <ChevronDown className="h-3.5 w-3.5" />
                </span>
              }
            >
              <MenuItem icon={Stethoscope} onClick={() => quickCreate(p, 'opd')}>New OPD</MenuItem>
              <MenuItem icon={BedDouble} onClick={() => quickCreate(p, 'ipd')}>New IPD</MenuItem>
              <MenuItem icon={Scan} onClick={() => quickCreate(p, 'radiology')}>Radiology</MenuItem>
              <MenuItem icon={TestTube} onClick={() => quickCreate(p, 'pathology')}>Pathology</MenuItem>
              <MenuItem icon={Pill} onClick={() => quickCreate(p, 'pharmacy')}>Pharmacy</MenuItem>
            </Menu>
            {canEdit && (
              <IconButton
                label="Edit patient"
                size="sm"
                onClick={() => {
                  setEditing(p);
                  setFormOpen(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </IconButton>
            )}
            {canDelete && (
              <IconButton label="Delete patient" tone="danger" size="sm" onClick={() => onDelete(p)}>
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            )}
          </>
        )}
        toolbar={
          <>
            {canDelete && selected.size > 0 && (
              <Button variant="danger" size="sm" onClick={onBulkDelete} loading={bulkDel.isPending}>
                Delete ({selected.size})
              </Button>
            )}
            <ExportMenu table={exportTable} />
            {canAdd && (
              <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" /> Import
              </Button>
            )}
            {canAdd && (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add Patient
              </Button>
            )}
          </>
        }
      />

      <PatientForm open={formOpen} patient={editing} onClose={() => setFormOpen(false)} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      {reportId && <PatientReportModal patientId={reportId} open onClose={() => setReportId(null)} />}
    </div>
  );
}
