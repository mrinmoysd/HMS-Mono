'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import {
  CERTIFICATE_KINDS,
  type CertificateKind,
  type GenerateCertificateResult,
} from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/field';
import { DataTable, type Column } from '@/components/ui/data-table';
import { usePatients } from '@/lib/hooks/use-patients';
import { api } from '@/lib/api';
import type { PatientDto } from '@smart-hospital/shared';

const KIND_LABEL: Record<CertificateKind, string> = {
  certificate: 'Medical Certificate',
  patient_id_card: 'Patient ID Card',
  staff_id_card: 'Staff ID Card',
};

export default function CertificatePage() {
  const [kind, setKind] = useState<CertificateKind>('certificate');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [docs, setDocs] = useState<GenerateCertificateResult['documents']>([]);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = usePatients({ search, page, size: 25 });

  const columns: Column<PatientDto>[] = [
    { key: 'patientNo', header: 'Patient No', className: 'font-medium' },
    { key: 'name', header: 'Name' },
    { key: 'age', header: 'Age', className: 'tabular' },
    { key: 'phone', header: 'Phone', render: (p) => p.phone ?? '—' },
  ];

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function generate() {
    setBusy(true);
    try {
      const res = await api.post<GenerateCertificateResult>('/certificates/generate', {
        kind,
        patientIds: [...selected],
        staffIds: [],
      });
      setDocs(res.documents);
    } finally {
      setBusy(false);
    }
  }

  function printDocs() {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(
      `<html><head><title>Print</title></head><body style="display:flex;flex-wrap:wrap;gap:24px;padding:24px">${docs
        .map((d) => d.html)
        .join('')}</body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={<span className="flex items-center gap-2"><FileText className="h-5 w-5 shrink-0 text-primary" /> Certificate & ID Cards</span>}
        description="Generate certificates and ID cards from templates"
      />

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface p-4">
        <div className="w-64">
          <Field label="Document type">
            <Select
              value={kind}
              onChange={(e) => setKind(e.target.value as CertificateKind)}
              options={CERTIFICATE_KINDS.filter((k) => k !== 'staff_id_card').map((k) => ({
                value: k,
                label: KIND_LABEL[k],
              }))}
            />
          </Field>
        </div>
        <Button onClick={generate} disabled={selected.size === 0} loading={busy}>
          Generate ({selected.size})
        </Button>
        {docs.length > 0 && (
          <Button variant="secondary" onClick={printDocs}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        meta={data?.meta}
        loading={isLoading}
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onPage={setPage}
        onSize={() => {}}
        selectable
        selected={selected}
        onToggle={toggle}
        onToggleAll={(ids) => setSelected((s) => (ids.every((i) => s.has(i)) ? new Set() : new Set(ids)))}
      />

      {docs.length > 0 && (
        <div className="rounded-md border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold">Preview ({docs.length})</h2>
          <div className="flex flex-wrap gap-4">
            {docs.map((d, i) => (
              <div key={i} dangerouslySetInnerHTML={{ __html: d.html }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
