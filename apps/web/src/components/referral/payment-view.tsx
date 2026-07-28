'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { REFERRAL_MODULES, type ReferralModuleKey, type ReferralPaymentDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Field, TextInput, Select } from '@/components/ui/field';
import { ExportMenu } from '@/components/ui/export-menu';
import { PatientSelect } from '@/components/patient-select';
import { useAbility } from '@/lib/auth-store';
import {
  useReferralPayments, useReferralPersons, useReferralPatient,
  useCreateReferralPayment, useUpdateReferralPayment, useDeleteReferralPayment,
} from '@/lib/hooks/use-finance';

export function PaymentView({ onManagePersons }: { onManagePersons: () => void }) {
  const ability = useAbility();
  const canAdd = ability.can('referral', 'add');
  const canEdit = ability.can('referral', 'edit');
  const canDelete = ability.can('referral', 'delete');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const list = useReferralPayments({ search, page, size: 100 });
  const del = useDeleteReferralPayment();
  const toast = useToast();
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReferralPaymentDto | null>(null);

  const rows = list.data?.data ?? [];

  async function remove(r: ReferralPaymentDto) {
    const ok = await confirm({
      title: `Delete referral payment to ${r.payeeName}?`,
      description: 'The commission record will be removed. This cannot be undone.',
      confirmLabel: 'Delete payment',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await del.mutateAsync(r.id);
      toast.success(`Payment to ${r.payeeName} deleted`);
    } catch (e) {
      toast.error('Could not delete payment', { description: (e as Error).message });
    }
  }

  const cols: Column<ReferralPaymentDto>[] = [
    { key: 'payeeName', header: 'Payee', className: 'font-medium text-primary' },
    { key: 'patientName', header: 'Patient Name', render: (r) => r.patientName ?? '—' },
    { key: 'billNo', header: 'Bill No', render: (r) => r.billNo ?? '—' },
    { key: 'billAmount', header: 'Bill Amount ($)', className: 'tabular text-right', render: (r) => r.billAmount.toFixed(2) },
    { key: 'commissionPct', header: 'Commission Percentage (%)', className: 'tabular text-right', render: (r) => r.commissionPct.toFixed(2) },
    { key: 'commissionAmount', header: 'Commission Amount ($)', className: 'tabular text-right', render: (r) => r.commissionAmount.toFixed(2) },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Referral Payment List"
        actions={
          <>
            {canAdd && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add Referral Payment</Button>}
            <Button variant="secondary" onClick={onManagePersons}><Users className="h-4 w-4" /> Referral Person</Button>
          </>
        }
      />

      <DataTable
        columns={cols}
        rows={rows}
        meta={list.data?.meta}
        loading={list.isLoading}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        onPage={setPage}
        onSize={() => {}}
        toolbar={<ExportMenu table={() => ({ title: 'Referral Payment List', filename: 'referral-payments', headers: cols.map((c) => c.header), rows: rows.map((r) => [r.payeeName, r.patientName ?? '', r.billNo ?? '', r.billAmount.toFixed(2), r.commissionPct.toFixed(2), r.commissionAmount.toFixed(2)]) })} />}
        rowActions={(canEdit || canDelete) ? (r) => (
          <div className="flex gap-1">
            {canEdit && <button onClick={() => { setEditing(r); setOpen(true); }} aria-label="Edit" title="Edit" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"><Pencil className="h-4 w-4" /></button>}
            {canDelete && <button onClick={() => remove(r)} aria-label="Delete" title="Delete" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>}
          </div>
        ) : undefined}
      />

      {open && <PaymentModal editing={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

const TYPE_OPTIONS = REFERRAL_MODULES.map((m) => ({ value: m.key, label: m.label }));

function PaymentModal({ editing, onClose }: { editing: ReferralPaymentDto | null; onClose: () => void }) {
  const persons = useReferralPersons();
  const create = useCreateReferralPayment();
  const update = useUpdateReferralPayment();

  const [patientId, setPatientId] = useState(editing?.patientId ?? '');
  const [patientLabel, setPatientLabel] = useState(editing?.patientName ?? '');
  const patient = useReferralPatient(patientId || null);

  const [patientType, setPatientType] = useState<string>(editing?.patientType ?? '');
  const [invoiceId, setInvoiceId] = useState('');
  const [billNo, setBillNo] = useState(editing?.billNo ?? '');
  const [billAmount, setBillAmount] = useState(editing ? String(editing.billAmount) : '');
  const [payeeId, setPayeeId] = useState(editing?.referralPersonId ?? '');
  const [pct, setPct] = useState(editing ? String(editing.commissionPct) : '');
  const [amount, setAmount] = useState(editing ? String(editing.commissionAmount) : '');
  const [error, setError] = useState('');

  const payee = useMemo(() => persons.data?.data.find((p) => p.id === payeeId), [persons.data, payeeId]);

  // Auto commission % from payee's per-module rate + patient type.
  useEffect(() => {
    if (!payee || !patientType) return;
    const rate = payee.commissions[patientType as ReferralModuleKey];
    if (rate != null) setPct(String(rate));
  }, [payee, patientType]);

  // Auto commission amount = bill × pct.
  useEffect(() => {
    const b = Number(billAmount) || 0;
    const p = Number(pct) || 0;
    setAmount((Math.round((b * p) / 100 * 100) / 100).toFixed(2));
  }, [billAmount, pct]);

  function pickBill(id: string) {
    setInvoiceId(id);
    const bill = patient.data?.bills.find((b) => b.invoiceId === id);
    if (bill) { setBillNo(bill.billNo); setBillAmount(String(bill.netAmount)); }
  }

  async function save() {
    if (!payeeId || !billAmount) { setError('Payee and Patient Bill Amount are required.'); return; }
    const input = {
      referralPersonId: payeeId,
      patientId: patientId || null,
      patientType,
      patientName: patientLabel.split(' · ')[0] || patientLabel,
      billNo,
      billAmount: Number(billAmount) || 0,
      commissionPct: Number(pct) || 0,
      commissionAmount: Number(amount) || 0,
    };
    if (editing) await update.mutateAsync({ id: editing.id, input });
    else await create.mutateAsync(input);
    onClose();
  }

  const d = patient.data;
  const kv = (label: string, value?: string | null) => (
    <div className="grid grid-cols-2 gap-2 border-b border-border/50 py-1.5 text-sm last:border-0">
      <span className="text-fg-muted">{label}</span><span className="font-medium">{value || '—'}</span>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit Referral Payment' : 'Add Referral Payment'}
      size="xl"
      headerActions={
        <div className="w-64">
          <PatientSelect value={patientId} selectedLabel={patientLabel} onChange={(id, label) => { setPatientId(id); setPatientLabel(label); }} />
        </div>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={create.isPending || update.isPending} onClick={save}>Save</Button>
        </>
      }
    >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger lg:col-span-2">{error}</p>}

          {/* Patient Details */}
          <div className="rounded-md border border-border">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold">Patient Details</div>
            <div className="p-4">
              {kv('Patient Name', d?.name)}
              {kv('Guardian', d?.guardianName)}
              {kv('Blood Group', d?.bloodGroup)}
              {kv('Marital Status', d?.maritalStatus)}
              {kv('Age', d?.age)}
              {kv('Phone', d?.phone)}
              {kv('Email', d?.email)}
              {kv('Address', d?.address)}
              {kv('Any Known Allergies', d?.allergies)}
              {kv('Remarks', d?.remarks)}
              {kv('TPA ID', d?.tpaIdNo)}
              {kv('TPA Validity', d?.tpaValidity ? new Date(d.tpaValidity).toLocaleDateString('en-GB') : null)}
              {kv('National Identification Number', d?.nationalId)}
            </div>
          </div>

          {/* Payment Details */}
          <div className="rounded-md border border-border">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold">Payment Details</div>
            <div className="space-y-4 p-4">
              <Field label="Patient Type" required><Select value={patientType} onChange={(e) => setPatientType(e.target.value)} placeholder="Select Type" options={TYPE_OPTIONS} /></Field>
              <Field label="Bill No/Case Id" required>
                <Select value={invoiceId} onChange={(e) => pickBill(e.target.value)} placeholder="Select"
                  options={(d?.bills ?? []).map((b) => ({ value: b.invoiceId, label: `${b.billNo} (${b.module.toUpperCase()})` }))} disabled={!d} />
              </Field>
              <Field label="Patient Bill Amount ($)" required><TextInput type="number" step="0.01" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} /></Field>
              <Field label="Payee" required>
                <Select value={payeeId} onChange={(e) => setPayeeId(e.target.value)} placeholder="Select Payee" options={(persons.data?.data ?? []).map((p) => ({ value: p.id, label: p.name }))} />
              </Field>
              <Field label="Commission Percentage (%)" required><TextInput type="number" step="0.01" value={pct} onChange={(e) => setPct(e.target.value)} /></Field>
              <Field label="Commission Amount ($)" required><TextInput type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            </div>
          </div>
        </div>

    </Modal>
  );
}
