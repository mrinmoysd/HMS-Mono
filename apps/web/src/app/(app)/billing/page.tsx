'use client';

import { useState } from 'react';
import { Search, Wallet } from 'lucide-react';
import type { InvoiceDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { StatusPill } from '@/components/ui/status-pill';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, Select } from '@/components/ui/field';
import { useInvoices, useAddPayment } from '@/lib/hooks/use-clinical';
import { useAbility } from '@/lib/auth-store';
import { api } from '@/lib/api';

/** Chip label → the feature key that governs it (R1). `blood` is the UI's short name. */
const MODULES: { key: string; feature: string }[] = [
  { key: 'opd', feature: 'billing.opd_billing' },
  { key: 'ipd', feature: 'billing.ipd_billing' },
  { key: 'pharmacy', feature: 'billing.pharmacy_billing' },
  { key: 'pathology', feature: 'billing.pathology_billing' },
  { key: 'radiology', feature: 'billing.radiology_billing' },
  { key: 'blood', feature: 'billing.blood_bank_billing' },
  { key: 'ambulance', feature: 'billing.ambulance_billing' },
];

export default function BillingPage() {
  const ability = useAbility();
  const canPay = ability.can('billing', 'edit');
  // Billing is per module in the spec. Showing every chip meant a pathologist
  // could pick "Opd" and get a 403 behind an empty table; the API already
  // scopes the rows, so the filters should offer only what it will return.
  const modules = MODULES.filter((m) => ability.canFeature(m.feature, 'view'));
  const [module, setModule] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [caseNo, setCaseNo] = useState('');
  const [caseResults, setCaseResults] = useState<InvoiceDto[] | null>(null);

  const { data, isLoading } = useInvoices(module, { search, page, size: 25 });
  const addPayment = useAddPayment();

  const [payFor, setPayFor] = useState<InvoiceDto | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('cash');

  async function lookupCase() {
    if (!caseNo.trim()) return setCaseResults(null);
    const res = await api.get<InvoiceDto[]>(`/invoices/by-case/${encodeURIComponent(caseNo.trim())}`);
    setCaseResults(res);
  }

  async function submitPayment() {
    if (!payFor) return;
    await addPayment.mutateAsync({ id: payFor.id, amount: Number(payAmount) || 0, mode: payMode });
    setPayFor(null);
    setPayAmount('');
  }

  const columns: Column<InvoiceDto>[] = [
    { key: 'billNo', header: 'Bill No', className: 'font-medium' },
    { key: 'module', header: 'Module', render: (i) => i.module.toUpperCase() },
    { key: 'caseNo', header: 'Case ID', render: (i) => i.caseNo ?? '—' },
    { key: 'patientName', header: 'Patient' },
    { key: 'netAmount', header: 'Net', className: 'tabular', render: (i) => i.netAmount.toFixed(2) },
    { key: 'paid', header: 'Paid', className: 'tabular', render: (i) => i.paid.toFixed(2) },
    { key: 'balance', header: 'Balance', className: 'tabular', render: (i) => i.balance.toFixed(2) },
    { key: 'status', header: 'Status', render: (i) => <StatusPill status={i.status} /> },
  ];

  const rows = caseResults ?? data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Billing"
        description="Invoices across every department · look up by Case ID"
      />

      {/* Module shortcuts + Case ID lookup */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface p-3">
        <button
          onClick={() => { setModule(undefined); setCaseResults(null); }}
          className={`rounded-full px-3 py-1 text-sm ${!module && !caseResults ? 'bg-primary text-primary-fg' : 'bg-bg text-fg-muted'}`}
        >
          All
        </button>
        {modules.map((m) => (
          <button
            key={m.key}
            onClick={() => { setModule(m.key); setCaseResults(null); setPage(1); }}
            className={`rounded-full px-3 py-1 text-sm capitalize ${module === m.key && !caseResults ? 'bg-primary text-primary-fg' : 'bg-bg text-fg-muted'}`}
          >
            {m.key}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              value={caseNo}
              onChange={(e) => setCaseNo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && lookupCase()}
              placeholder="Search by Case ID…"
              className="rounded-sm border border-border bg-bg py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={lookupCase}>
            Find
          </Button>
        </div>
      </div>

      {caseResults && (
        <p className="text-sm text-fg-muted">
          Showing {caseResults.length} invoice(s) for case <b>{caseNo}</b> ·{' '}
          <button className="text-primary" onClick={() => setCaseResults(null)}>clear</button>
        </p>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        meta={caseResults ? undefined : data?.meta}
        loading={isLoading && !caseResults}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); setCaseResults(null); }}
        onPage={setPage}
        onSize={() => {}}
        rowActions={
          canPay
            ? (inv) =>
                inv.balance > 0 ? (
                  <button
                    onClick={() => { setPayFor(inv); setPayAmount(String(inv.balance)); }}
                    className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-primary hover:bg-primary/10"
                  >
                    <Wallet className="h-3.5 w-3.5" /> Collect
                  </button>
                ) : (
                  <span className="text-xs text-success">Paid</span>
                )
            : undefined
        }
      />

      <FormDrawer
        open={!!payFor}
        title={`Collect Payment — ${payFor?.billNo ?? ''}`}
        onClose={() => setPayFor(null)}
        onSubmit={submitPayment}
        submitting={addPayment.isPending}
        submitLabel="Record Payment"
      >
        <div className="space-y-4">
          <div className="rounded-sm bg-bg p-3 text-sm">
            <div className="flex justify-between"><span className="text-fg-muted">Net</span><span className="tabular">{payFor?.netAmount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-fg-muted">Paid</span><span className="tabular">{payFor?.paid.toFixed(2)}</span></div>
            <div className="flex justify-between font-medium"><span>Balance</span><span className="tabular text-warning">{payFor?.balance.toFixed(2)}</span></div>
          </div>
          <Field label="Amount">
            <TextInput type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          </Field>
          <Field label="Payment Mode">
            <Select
              value={payMode}
              onChange={(e) => setPayMode(e.target.value)}
              options={['cash', 'card', 'upi', 'tpa', 'cheque'].map((m) => ({ value: m, label: m }))}
            />
          </Field>
        </div>
      </FormDrawer>
    </div>
  );
}
