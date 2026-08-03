'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, ScrollText } from 'lucide-react';
import type { OpdPatientRow } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { ExportMenu } from '@/components/ui/export-menu';
import type { ExportTable } from '@/lib/export';
import { formatAge } from '@/lib/utils';
import { useOpdPatientView } from '@/lib/hooks/use-clinical';
import { usePatientProfile } from '@/lib/hooks/use-emr';
import { PatientReportModal } from '@/components/patient-report-modal';
import { VisitsPanel } from './visits-panel';

/**
 * OPD "Patient View" (blueprint §7.1) — a roll-up *per patient*, not per visit.
 *
 * This used to be a patient picker beside one patient's visits, which answered
 * "what has this person had" but never "who keeps coming back", and left Total
 * Recheckup with nowhere to live. Recheckups are the point: a follow-up is a
 * checkup on the existing visit, so a patient seen five times on one visit
 * looks identical to a one-visit patient in every other list in the app.
 *
 * Picking a row still opens that patient's visit history — the old view, kept
 * as the drill-down rather than the landing screen.
 */
export function PatientViewPanel({ initialPatientId }: { initialPatientId?: string } = {}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [selectedId, setSelectedId] = useState<string | null>(initialPatientId ?? null);
  const [reportId, setReportId] = useState<string | null>(null);

  const { data, isLoading, error } = useOpdPatientView({ search, page, size });
  const rows = data?.data ?? [];

  // Deep-link from the Appointment list lands straight on a patient.
  useEffect(() => {
    if (initialPatientId) setSelectedId(initialPatientId);
  }, [initialPatientId]);

  function exportTable(): ExportTable {
    return {
      title: 'OPD Patient View',
      filename: 'opd-patient-view',
      headers: ['Patient No', 'Name', 'Gender', 'Age', 'Phone', 'Total Visit', 'Total Recheckup', 'Last Visit', 'Last Consultant'],
      rows: rows.map((r) => [
        r.patientNo, r.name, r.gender ?? '', formatAge(r.age), r.phone ?? '',
        String(r.totalVisits), String(r.totalRecheckups),
        r.lastVisitDate ? new Date(r.lastVisitDate).toLocaleDateString() : '',
        r.lastConsultantName ?? '',
      ]),
    };
  }

  const columns: Column<OpdPatientRow>[] = [
    { key: 'patientNo', header: 'Patient No', className: 'font-medium' },
    {
      key: 'name',
      header: 'Name',
      render: (r) => (
        <button onClick={() => setSelectedId(r.id)} className="text-primary hover:underline">
          {r.name}
        </button>
      ),
    },
    { key: 'gender', header: 'Gender', render: (r) => r.gender ?? '—' },
    { key: 'age', header: 'Age', render: (r) => formatAge(r.age) },
    { key: 'phone', header: 'Phone', render: (r) => r.phone ?? '—' },
    { key: 'totalVisits', header: 'Total Visit', className: 'tabular', render: (r) => r.totalVisits },
    {
      key: 'totalRecheckups',
      header: 'Total Recheckup',
      className: 'tabular',
      // Zero is worth seeing, not hiding: it means a visit exists that nobody
      // ever recorded a checkup against.
      render: (r) => r.totalRecheckups,
    },
    {
      key: 'lastVisitDate',
      header: 'Last Visit',
      render: (r) => (r.lastVisitDate ? new Date(r.lastVisitDate).toLocaleDateString() : '—'),
    },
    { key: 'lastConsultantName', header: 'Last Consultant', render: (r) => r.lastConsultantName ?? '—' },
  ];

  if (selectedId) return <PatientVisits patientId={selectedId} onBack={() => setSelectedId(null)} />;

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        meta={data?.meta}
        loading={isLoading}
        error={error ? 'Failed to load patient view' : undefined}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        onPage={setPage}
        onSize={(s) => { setSize(s); setPage(1); }}
        toolbar={<ExportMenu table={exportTable} />}
        rowActions={(r) => (
          <>
            <button
              onClick={() => setReportId(r.id)}
              aria-label="Patient details"
              title="Patient details"
              className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"
            >
              <ScrollText className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSelectedId(r.id)}
              className="flex h-7 items-center rounded-sm px-2 text-xs text-fg-muted hover:bg-primary/10 hover:text-primary"
            >
              Visits
            </button>
          </>
        )}
      />

      <PatientReportModal
        patientId={reportId ?? ''}
        open={!!reportId}
        onClose={() => setReportId(null)}
      />
    </>
  );
}

/** The old Patient View, now the drill-down one level in. */
function PatientVisits({ patientId, onBack }: { patientId: string; onBack: () => void }) {
  const { data: profile, isLoading } = usePatientProfile(patientId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> All patients
        </Button>
        {profile && <h3 className="text-base font-semibold">{profile.header.name}&apos;s Visits</h3>}
      </div>

      {isLoading && (
        <div className="flex min-h-[300px] items-center justify-center rounded-md border border-border bg-surface text-fg-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {profile && (
        <VisitsPanel rows={profile.visits} patientId={patientId} patientName={profile.header.name} />
      )}
    </div>
  );
}
