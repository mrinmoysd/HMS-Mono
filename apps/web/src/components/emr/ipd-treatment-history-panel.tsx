'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { IpdTreatmentHistoryRow } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ExportMenu } from '@/components/ui/export-menu';
import type { ExportTable } from '@/lib/export';
import { useIpdAdmissionsByPatient } from '@/lib/hooks/use-ipd';

const PAGE_SIZE_DEFAULT = 25;

/** IPD detail-page "Treatment History" tab — read-only list of a patient's other admissions. */
export function IpdTreatmentHistoryPanel({ patientId }: { patientId: string }) {
  const { data: rows = [], isLoading } = useIpdAdmissionsByPatient(patientId);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(PAGE_SIZE_DEFAULT);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.ipdNo, r.symptoms, r.consultantName, r.bedLabel].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * size, safePage * size);

  function exportTable(): ExportTable {
    return {
      title: 'Treatment History',
      filename: 'ipd-treatment-history',
      headers: ['IPD No', 'Symptoms', 'Consultant', 'Bed'],
      rows: filtered.map((r) => [r.ipdNo, r.symptoms ?? '', r.consultantName, r.bedLabel]),
    };
  }

  const columns: Column<IpdTreatmentHistoryRow>[] = [
    {
      key: 'ipdNo',
      header: 'IPD No',
      className: 'font-medium',
      render: (r) => (
        <Link href={`/ipd/${r.id}`} className="text-primary hover:underline">
          {r.ipdNo}
        </Link>
      ),
    },
    { key: 'symptoms', header: 'Symptoms', render: (r) => r.symptoms ?? '—' },
    { key: 'consultantName', header: 'Consultant' },
    { key: 'bedLabel', header: 'Bed' },
  ];

  return (
    <DataTable
      columns={columns}
      rows={pageRows}
      meta={{ page: safePage, size, total, totalPages }}
      loading={isLoading}
      search={search}
      onSearch={(v) => { setSearch(v); setPage(1); }}
      onPage={setPage}
      onSize={(s) => { setSize(s); setPage(1); }}
      toolbar={<ExportMenu table={exportTable} />}
    />
  );
}
