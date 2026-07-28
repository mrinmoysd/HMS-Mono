'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Printer, Pill, Eye, FileText, LogOut } from 'lucide-react';
import type { ProfileVisitRow } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { ExportMenu } from '@/components/ui/export-menu';
import type { ExportTable } from '@/lib/export';
import { VisitDetailsModal } from './visit-details-modal';
import { PrescriptionBuilder } from './prescription-builder';
import { ManualPrescriptionModal } from './manual-prescription-modal';
import { MoveToIpdModal } from './move-to-ipd-modal';
import { OpdForm } from '@/app/(app)/opd/opd-form';
import { useAbility } from '@/lib/auth-store';
import { useOpdVisitDetail } from '@/lib/hooks/use-clinical';
import { printOpdPrescription } from '@/lib/print';

const PAGE_SIZE_DEFAULT = 25;

/** Visits tab (Patient Details) — parity DataTable with the 5-action row cluster (V0/V1). */
export function VisitsPanel({
  rows,
  patientId,
  patientName,
}: {
  rows: ProfileVisitRow[];
  patientId: string;
  patientName: string;
}) {
  const ability = useAbility();
  const canAdd = ability.can('opd', 'add');
  const canEdit = ability.can('opd', 'edit');
  const canDelete = ability.can('opd', 'delete');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(PAGE_SIZE_DEFAULT);
  const [showId, setShowId] = useState<string | null>(null);
  const [newVisitOpen, setNewVisitOpen] = useState(false);
  const [rxVisitId, setRxVisitId] = useState<string | null>(null);
  const [manualId, setManualId] = useState<string | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);
  const [moveId, setMoveId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.opdNo, r.caseNo, r.consultantName, r.reference, r.symptoms]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * size, safePage * size);

  function exportTable(): ExportTable {
    return {
      title: 'Visits',
      filename: 'visits',
      headers: ['OPD No', 'Case ID', 'Appointment Date', 'Consultant', 'Reference', 'Symptoms', 'Previous Medical Issue'],
      rows: filtered.map((r) => [
        r.opdNo,
        r.caseNo ?? '',
        new Date(r.appointmentDate).toLocaleDateString(),
        r.consultantName,
        r.reference ?? '',
        r.symptoms ?? '',
        r.previousMedicalIssue ?? '',
      ]),
    };
  }

  const columns: Column<ProfileVisitRow>[] = [
    {
      key: 'opdNo',
      header: 'OPD No',
      className: 'font-medium',
      render: (r) => (
        <Link href={`/opd/${r.id}`} className="text-primary hover:underline">
          {r.opdNo}
        </Link>
      ),
    },
    { key: 'caseNo', header: 'Case ID', render: (r) => r.caseNo ?? '—' },
    {
      key: 'appointmentDate',
      header: 'Appointment Date',
      render: (r) => new Date(r.appointmentDate).toLocaleDateString(),
    },
    { key: 'consultantName', header: 'Consultant' },
    { key: 'reference', header: 'Reference', render: (r) => r.reference ?? '—' },
    { key: 'symptoms', header: 'Symptoms', className: 'text-fg-muted', render: (r) => r.symptoms ?? '—' },
    {
      key: 'previousMedicalIssue',
      header: 'Previous Medical Issue',
      className: 'text-fg-muted',
      render: (r) => r.previousMedicalIssue ?? '—',
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={pageRows}
        meta={{ page: safePage, size, total, totalPages }}
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
        toolbar={
          <>
            <ExportMenu table={exportTable} />
            {canAdd && (
              <Button size="sm" onClick={() => setNewVisitOpen(true)}>
                <Plus className="h-4 w-4" /> New Visit
              </Button>
            )}
          </>
        }
        rowActions={(r) => (
          <>
            <ActionIcon label="Print" onClick={() => setPrintId(r.id)} icon={Printer} />
            <ActionIcon label="Add Prescription" onClick={() => setRxVisitId(r.id)} icon={Pill} />
            <ActionIcon label="Show" onClick={() => setShowId(r.id)} icon={Eye} />
            <ActionIcon label="Manual Prescription" onClick={() => setManualId(r.id)} icon={FileText} />
            <ActionIcon label="Move to IPD" onClick={() => setMoveId(r.id)} icon={LogOut} />
          </>
        )}
      />

      <VisitDetailsModal
        id={showId}
        open={!!showId}
        onClose={() => setShowId(null)}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      <OpdForm
        open={newVisitOpen}
        onClose={() => setNewVisitOpen(false)}
        initialPatientId={patientId}
        initialPatientLabel={patientName}
      />

      <PrescriptionBuilder
        open={!!rxVisitId}
        onClose={() => setRxVisitId(null)}
        patientName={patientName}
        scope={{ patientId, encounterType: 'opd', encounterId: rxVisitId ?? undefined }}
      />

      <ManualPrescriptionModal id={manualId} open={!!manualId} onClose={() => setManualId(null)} />

      <MoveToIpdModal id={moveId} open={!!moveId} onClose={() => setMoveId(null)} />

      {printId && <PrintTrigger id={printId} onDone={() => setPrintId(null)} />}
    </div>
  );
}

/** Fetches the visit detail once, prints it, then reports back so the caller can clear state. */
function PrintTrigger({ id, onDone }: { id: string; onDone: () => void }) {
  const { data } = useOpdVisitDetail(id);

  useEffect(() => {
    if (data) {
      printOpdPrescription(data);
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return null;
}

function ActionIcon({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
