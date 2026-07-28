'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, Printer } from 'lucide-react';
import type { ProfileVisitRow } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ExportMenu } from '@/components/ui/export-menu';
import type { ExportTable } from '@/lib/export';
import { VisitDetailsModal } from './visit-details-modal';
import { useOpdVisitDetail } from '@/lib/hooks/use-clinical';
import { printOpdPrescription } from '@/lib/print';

const PAGE_SIZE_DEFAULT = 25;

/** Treatment History tab — read-only DataTable parity view over the same visits as the Visits tab. */
export function TreatmentHistoryPanel({ rows }: { rows: ProfileVisitRow[] }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(PAGE_SIZE_DEFAULT);
  const [showId, setShowId] = useState<string | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.opdNo, r.caseNo, r.consultantName, r.symptoms]
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
      title: 'Treatment History',
      filename: 'treatment-history',
      headers: ['OPD No', 'Case ID', 'Appointment Date', 'Symptoms', 'Description', 'Consultant'],
      rows: filtered.map((r) => [
        r.opdNo,
        r.caseNo ?? '',
        new Date(r.appointmentDate).toLocaleDateString(),
        r.symptoms ?? '',
        r.symptomDescription ?? '',
        r.consultantName,
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
    { key: 'appointmentDate', header: 'Appointment Date', render: (r) => new Date(r.appointmentDate).toLocaleDateString() },
    {
      key: 'symptoms',
      header: 'Symptoms',
      render: (r) => (
        <div>
          <p className="font-medium">{r.symptoms ?? '—'}</p>
          {r.symptomDescription && <p className="text-xs text-fg-muted">{r.symptomDescription}</p>}
        </div>
      ),
    },
    { key: 'consultantName', header: 'Consultant' },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={pageRows}
        meta={{ page: safePage, size, total, totalPages }}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        onPage={setPage}
        onSize={(s) => { setSize(s); setPage(1); }}
        toolbar={<ExportMenu table={exportTable} />}
        rowActions={(r) => (
          <>
            <button onClick={() => setShowId(r.id)} aria-label="Show" title="Show" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
              <Eye className="h-4 w-4" />
            </button>
            <button onClick={() => setPrintId(r.id)} aria-label="Print" title="Print" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
              <Printer className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <VisitDetailsModal id={showId} open={!!showId} onClose={() => setShowId(null)} />

      {printId && <PrintTrigger id={printId} onDone={() => setPrintId(null)} />}
    </div>
  );
}

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
