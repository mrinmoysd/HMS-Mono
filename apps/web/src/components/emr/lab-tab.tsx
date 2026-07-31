'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { useMemo, useState } from 'react';
import { Plus, FlaskConical, Printer, Eye, ClipboardEdit } from 'lucide-react';
import type { LabInvestigationDto, Modality } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, Select } from '@/components/ui/field';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ExportMenu } from '@/components/ui/export-menu';
import type { ExportTable } from '@/lib/export';
import { useDiagnosticTests } from '@/lib/hooks/use-departments';
import { useLabInvestigations, useOrderLab, useReportLab, type EncounterScope } from '@/lib/hooks/use-diagnostics-clinical';
import { printDocument } from '@/lib/print';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-border/60 text-fg-muted',
  reported: 'bg-warning/15 text-warning',
  approved: 'bg-success/15 text-success',
};

const PAGE_SIZE_DEFAULT = 25;

/** Lab Investigation tab: ordered pathology/radiology tests with result + approval. */
export function LabTab({ scope, canEdit, patientName }: { scope: EncounterScope; canEdit: boolean; patientName?: string }) {
  const { data: labs = [] } = useLabInvestigations(scope);
  const order = useOrderLab(scope);
  const report = useReportLab(scope);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(PAGE_SIZE_DEFAULT);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return labs;
    return labs.filter((l) =>
      [l.testName, l.caseNo, l.modality, l.center, l.collectedByName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [labs, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * size, safePage * size);

  function exportTable(): ExportTable {
    return {
      title: 'Lab Investigation',
      filename: 'lab-investigation',
      headers: ['Test Name', 'Case ID', 'Lab', 'Sample Collected', 'Expected Date', 'Result', 'Status', 'Approved By'],
      rows: filtered.map((l) => [
        l.testName,
        l.caseNo ?? '',
        l.modality,
        l.sampleDate ? new Date(l.sampleDate).toLocaleDateString() : '',
        l.expectedDate ? new Date(l.expectedDate).toLocaleDateString() : '',
        l.reportValue ? `${l.reportValue}${l.unit ? ` ${l.unit}` : ''}` : '',
        l.status,
        l.approvedByName ?? '',
      ]),
    };
  }

  function printReport() {
    printDocument({
      documentTitle: 'Lab Report',
      heading: 'Laboratory Investigation Report',
      meta: [['Patient', patientName ?? '—'], ['Date', new Date().toLocaleDateString()], ['Tests', String(labs.length)]],
      sections: [{
        table: {
          headers: ['Test', 'Modality', 'Result', 'Reference', 'Status'],
          rows: labs.map((l) => [l.testName, l.modality, l.reportValue ? `${l.reportValue}${l.unit ? ` ${l.unit}` : ''}` : '—', l.referenceRange ?? '—', l.status]),
        },
      }],
      footer: 'Verified By',
    });
  }

  const [orderOpen, setOrderOpen] = useState(false);
  const [modality, setModality] = useState<Modality>('pathology');
  const [testId, setTestId] = useState('');
  const [testName, setTestName] = useState('');
  const [unit, setUnit] = useState('');
  const [refRange, setRefRange] = useState('');
  const [sampleDate, setSampleDate] = useState('');
  const [expectedDate, setExpectedDate] = useState('');

  const { data: tests } = useDiagnosticTests(modality, { size: 100 });

  const [reportRow, setReportRow] = useState<LabInvestigationDto | null>(null);
  const [reportValue, setReportValue] = useState('');
  const [approve, setApprove] = useState(false);
  const [detail, setDetail] = useState<LabInvestigationDto | null>(null);

  function pickTest(id: string) {
    setTestId(id);
    const t = (tests?.data ?? []).find((x) => x.id === id);
    if (t) { setTestName(t.name); setUnit(t.unitName ?? ''); setRefRange(t.referenceRange ?? ''); }
  }

  async function saveOrder() {
    if (!testName.trim()) return;
    await order.mutateAsync({
      patientId: scope.patientId,
      encounterType: scope.encounterType,
      encounterId: scope.encounterId,
      modality,
      testId: testId || undefined,
      testName,
      unit: unit || undefined,
      referenceRange: refRange || undefined,
      sampleDate: sampleDate ? new Date(sampleDate) : undefined,
      expectedDate: expectedDate ? new Date(expectedDate) : undefined,
    });
    setOrderOpen(false);
    setTestId(''); setTestName(''); setUnit(''); setRefRange(''); setSampleDate(''); setExpectedDate('');
  }

  function openReport(row: LabInvestigationDto) {
    setReportRow(row);
    setReportValue(row.reportValue ?? '');
    setApprove(row.status === 'approved');
  }
  async function saveReport() {
    if (!reportRow) return;
    await report.mutateAsync({ id: reportRow.id, input: { reportValue, approve } });
    setReportRow(null);
  }

  const columns: Column<LabInvestigationDto>[] = [
    {
      key: 'testName',
      header: 'Test Name',
      render: (l) => (
        <>
          <span className="font-medium">{l.testName}</span>
          <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase text-primary">{l.modality}</span>
        </>
      ),
    },
    { key: 'caseNo', header: 'Case ID', render: (l) => l.caseNo ?? '—' },
    { key: 'modality', header: 'Lab', className: 'capitalize', render: (l) => l.modality },
    {
      key: 'sampleCollected',
      header: 'Sample Collected',
      render: (l) => (
        <div className="text-xs">
          <p>{l.collectedByName ?? '—'}</p>
          <p className="text-fg-muted">{l.center ?? '—'}</p>
          <p className="text-fg-muted">{l.sampleDate ? new Date(l.sampleDate).toLocaleDateString() : '—'}</p>
        </div>
      ),
    },
    { key: 'expectedDate', header: 'Expected Date', render: (l) => (l.expectedDate ? new Date(l.expectedDate).toLocaleDateString() : '—') },
    { key: 'reportValue', header: 'Result', className: 'tabular', render: (l) => (l.reportValue ? `${l.reportValue}${l.unit ? ` ${l.unit}` : ''}` : '—') },
    {
      key: 'status',
      header: 'Status',
      render: (l) => <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLE[l.status] ?? ''}`}>{l.status}</span>,
    },
    {
      key: 'approvedByName',
      header: 'Approved By',
      render: (l) => (
        <div className="text-xs">
          <p>{l.approvedByName ?? '—'}</p>
          {l.approvedAt && <p className="text-fg-muted">{new Date(l.approvedAt).toLocaleDateString()}</p>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lab Investigation</h2>
        {canEdit && <Button size="sm" onClick={() => setOrderOpen(true)}><Plus className="h-4 w-4" /> Order Test</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={pageRows}
        meta={{ page: safePage, size, total, totalPages }}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        onPage={setPage}
        onSize={(s) => { setSize(s); setPage(1); }}
        toolbar={
          <>
            <ExportMenu table={exportTable} />
            {labs.length > 0 && (
              <Button size="sm" variant="secondary" onClick={printReport}><Printer className="h-4 w-4" /> Print Report</Button>
            )}
          </>
        }
        rowActions={(l) => (
          <>
            <button onClick={() => setDetail(l)} aria-label="Details" title="Details" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
              <Eye className="h-4 w-4" />
            </button>
            {canEdit && (
              <button onClick={() => openReport(l)} aria-label="Report" title="Report" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                <ClipboardEdit className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      />

      {/* Order test */}
      <FormDrawer open={orderOpen} title="Order Lab Test" onClose={() => setOrderOpen(false)} onSubmit={saveOrder} submitting={order.isPending}>
        <div className="space-y-4">
          <Field label="Modality" required>
            <Select value={modality} onChange={(e) => { setModality(e.target.value as Modality); setTestId(''); }} options={[{ value: 'pathology', label: 'Pathology' }, { value: 'radiology', label: 'Radiology' }]} />
          </Field>
          <Field label="Test">
            <Select value={testId} onChange={(e) => pickTest(e.target.value)} placeholder="Select from master…" options={(tests?.data ?? []).map((t) => ({ value: t.id, label: t.name }))} />
          </Field>
          <Field label="Test Name" required><TextInput value={testName} onChange={(e) => setTestName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Unit"><TextInput value={unit} onChange={(e) => setUnit(e.target.value)} /></Field>
            <Field label="Reference Range"><TextInput value={refRange} onChange={(e) => setRefRange(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sample Date"><TextInput type="date" value={sampleDate} onChange={(e) => setSampleDate(e.target.value)} /></Field>
            <Field label="Expected Date"><TextInput type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} /></Field>
          </div>
        </div>
      </FormDrawer>

      {/* Report result */}
      <FormDrawer open={!!reportRow} title="Enter Report" onClose={() => setReportRow(null)} onSubmit={saveReport} submitting={report.isPending}>
        {reportRow && (
          <div className="space-y-4">
            <p className="text-sm"><b>{reportRow.testName}</b> · {reportRow.referenceRange ?? 'no reference'}</p>
            <Field label={`Report Value${reportRow.unit ? ` (${reportRow.unit})` : ''}`}>
              <TextInput value={reportValue} onChange={(e) => setReportValue(e.target.value)} />
            </Field>
            <Checkbox label="Approve report" checked={approve} onChange={(e) => setApprove(e.target.checked)} />
          </div>
        )}
      </FormDrawer>

      {/* Details */}
      <FormDrawer open={!!detail} title="Investigation Details" onClose={() => setDetail(null)} onSubmit={() => setDetail(null)} submitLabel="Close">
        {detail && (
          <div className="space-y-2 text-sm">
            <Detail label="Test" value={detail.testName} />
            <Detail label="Case ID" value={detail.caseNo ?? '—'} />
            <Detail label="Modality" value={detail.modality} />
            <Detail label="Result" value={detail.reportValue ? `${detail.reportValue}${detail.unit ? ` ${detail.unit}` : ''}` : '—'} />
            <Detail label="Reference Range" value={detail.referenceRange ?? '—'} />
            <Detail label="Previous Value" value={detail.previousValue ?? '—'} />
            <Detail label="Sample Date" value={detail.sampleDate ? new Date(detail.sampleDate).toLocaleDateString() : '—'} />
            <Detail label="Expected Date" value={detail.expectedDate ? new Date(detail.expectedDate).toLocaleDateString() : '—'} />
            <Detail label="Center" value={detail.center ?? '—'} />
            <Detail label="Collected By" value={detail.collectedByName ?? '—'} />
            <Detail label="Status" value={detail.status} />
            <Detail label="Approved By" value={detail.approvedByName ?? '—'} />
          </div>
        )}
      </FormDrawer>

      {labs.length === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-fg-muted"><FlaskConical className="h-3.5 w-3.5" /> Order pathology or radiology tests and enter their results here.</p>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-border/60 py-1.5">
      <span className="text-fg-muted">{label}</span>
      <span className="text-right font-medium capitalize">{value}</span>
    </div>
  );
}
