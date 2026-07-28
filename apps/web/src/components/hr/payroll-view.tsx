'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useState } from 'react';
import { ChevronLeft, Eye, Printer, RefreshCw, Search } from 'lucide-react';
import type { PayrollDto } from '@smart-hospital/shared';
import { Button, IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field, Select } from '@/components/ui/field';
import { useGeneratePayroll, usePayrollList, useStaffRoles } from '@/lib/hooks/use-hr';
import { printDocument } from '@/lib/print';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEARS = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - 3 + i));

export function PayrollView({ onBack }: { onBack: () => void }) {
  const roles = useStaffRoles();
  const now = new Date();
  const [role, setRole] = useState('');
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(String(now.getFullYear()));
  const [query, setQuery] = useState({ role: '', ym: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` });

  const list = usePayrollList(query.role || undefined, query.ym);
  const gen = useGeneratePayroll();
  const [viewId, setViewId] = useState<string | null>(null);

  const rows = list.data ?? [];
  const monthLabel = `${MONTHS[Number(query.ym.slice(5, 7)) - 1]} ${query.ym.slice(0, 4)}`;
  const viewing = rows.find((r) => r.staffUserId === viewId) ?? null;

  function search() { setQuery({ role, ym: `${year}-${String(month + 1).padStart(2, '0')}` }); }
  async function regenerate(r: PayrollDto) { await gen.mutateAsync({ staffUserId: r.staffUserId, month: query.ym }); }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /> Staff Directory</button>
      <PageHeader title="Payroll" />

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface p-4">
        <div className="w-52"><Field label="Role"><Select value={role} onChange={(e) => setRole(e.target.value)} placeholder="Select" options={(roles.data ?? []).map((r) => ({ value: r.slug, label: r.label }))} /></Field></div>
        <div className="w-44"><Field label="Month"><Select value={String(month)} onChange={(e) => setMonth(Number(e.target.value))} options={MONTHS.map((m, i) => ({ value: String(i), label: m }))} /></Field></div>
        <div className="w-36"><Field label="Year"><Select value={year} onChange={(e) => setYear(e.target.value)} options={YEARS.map((y) => ({ value: y, label: y }))} /></Field></div>
        <Button onClick={search}><Search className="h-4 w-4" /> Search</Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              {['Staff ID', 'Name', 'Role', 'Department', 'Designation', 'Phone', 'Status', 'Action'].map((c) => <th key={c} className="px-3 py-2.5 font-semibold">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.staffUserId} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-medium">{r.staffNo ?? '—'}</td>
                <td className="px-3 py-2.5">{r.staffName}</td>
                <td className="px-3 py-2.5">{r.roleLabel}</td>
                <td className="px-3 py-2.5">{r.departmentName ?? '—'}</td>
                <td className="px-3 py-2.5">{r.designationName ?? '—'}</td>
                <td className="px-3 py-2.5">{r.phone ?? '—'}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === 'paid' ? 'bg-success/10 text-success' : r.status === 'generated' ? 'bg-primary/10 text-primary' : 'bg-border/60 text-fg-muted'}`}>
                    {r.status === 'paid' ? 'Paid' : r.status === 'generated' ? 'Generated' : 'Not Generated'}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1">
                    <button onClick={() => regenerate(r)} aria-label="Generate" title="Generate / Regenerate" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"><RefreshCw className="h-4 w-4" /></button>
                    <button onClick={() => setViewId(r.staffUserId)} aria-label="View" title="View Payslip" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"><Eye className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.isLoading && <p className="py-8 text-center text-sm text-fg-muted">Loading…</p>}
        {!list.isLoading && rows.length === 0 && <p className="py-10 text-center text-sm text-fg-muted">No staff found</p>}
        {list.data && <p className="px-3 py-2.5 text-xs text-fg-muted">Records: 1 to {rows.length} of {rows.length}</p>}
      </div>

      {viewing && <PayslipModal payroll={viewing} monthLabel={monthLabel} onClose={() => setViewId(null)} />}
    </div>
  );
}

function PayslipModal({ payroll: p, monthLabel, onClose }: { payroll: PayrollDto; monthLabel: string; onClose: () => void }) {
  const totalEarn = p.earnings.reduce((s, e) => s + e.amount, 0);
  const totalDeduct = p.deductionItems.reduce((s, d) => s + d.amount, 0);

  function print() {
    printDocument({
      documentTitle: 'Payslip',
      heading: `Payslip For The Period Of ${monthLabel}`,
      meta: [
        ['Staff ID', p.staffNo ?? '—'],
        ['Name', p.staffName],
        ['Department', p.departmentName ?? '—'],
        ['Designation', p.designationName ?? '—'],
      ],
      sections: [
        { heading: 'Earnings', table: { headers: ['Earning', 'Amount ($)'], rows: p.earnings.length ? p.earnings.map((e) => [e.label, e.amount.toFixed(2)]) : [['—', '0.00']] } },
        { heading: 'Deductions', table: { headers: ['Deduction', 'Amount ($)'], rows: p.deductionItems.length ? p.deductionItems.map((d) => [d.label, d.amount.toFixed(2)]) : [['—', '0.00']] } },
        { heading: 'Summary', rows: [['Total Earning', totalEarn.toFixed(2)], ['Total Deduction', totalDeduct.toFixed(2)], ['Payment Mode', p.paymentMode], ['Basic Salary', p.basicSalary.toFixed(2)], ['Net Pay', p.net.toFixed(2)]] },
      ],
      footer: 'This payslip is computer generated.',
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Payslip"
      size="lg"
      headerActions={
        <IconButton label="Print payslip" tone="primary" onClick={print}>
          <Printer className="h-4 w-4" />
        </IconButton>
      }
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
        <div className="space-y-4">
          <div className="rounded-md border border-border">
            <div className="border-b border-border bg-bg px-4 py-2 text-center font-semibold">Payslip For The Period Of {monthLabel}</div>
            <div className="grid grid-cols-2 gap-y-3 p-4 text-sm">
              <Kv label="Staff ID" value={p.staffNo ?? '—'} />
              <Kv label="Name" value={p.staffName} />
              <Kv label="Department" value={p.departmentName ?? '—'} />
              <Kv label="Designation" value={p.designationName ?? '—'} />
            </div>
            <table className="w-full border-t border-border text-sm">
              <thead><tr className="bg-bg text-left text-xs uppercase text-fg-muted"><th className="px-4 py-2">Earning</th><th className="px-4 py-2 text-right">Amount ($)</th><th className="px-4 py-2">Deduction</th><th className="px-4 py-2 text-right">Amount ($)</th></tr></thead>
              <tbody>
                <tr className="border-t border-border/60">
                  <td className="px-4 py-2">{p.earnings[0]?.label ?? ''}</td>
                  <td className="px-4 py-2 text-right tabular">{(p.earnings[0]?.amount ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-2">{p.deductionItems[0]?.label ?? ''}</td>
                  <td className="px-4 py-2 text-right tabular">{(p.deductionItems[0]?.amount ?? 0).toFixed(2)}</td>
                </tr>
                <tr className="border-t border-border font-semibold">
                  <td className="px-4 py-2">Total Earning</td><td className="px-4 py-2 text-right tabular">{totalEarn.toFixed(2)}</td>
                  <td className="px-4 py-2">Total Deduction</td><td className="px-4 py-2 text-right tabular">{totalDeduct.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <div className="space-y-1 border-t border-border p-4 text-sm">
              <div className="flex justify-between"><span className="text-fg-muted">Payment Mode</span><span className="font-semibold">{p.paymentMode}</span></div>
              <div className="flex justify-between"><span className="text-fg-muted">Basic Salary ($)</span><span className="font-semibold tabular">{p.basicSalary.toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-border pt-1"><span className="text-fg-muted">Net Pay ($)</span><span className="font-semibold tabular text-primary">{p.net.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
    </Modal>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs uppercase tracking-wide text-fg-muted">{label}</p><p className="mt-0.5 font-medium">{value}</p></div>;
}
