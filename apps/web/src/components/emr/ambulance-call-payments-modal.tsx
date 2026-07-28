'use client';

import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useState } from 'react';
import { Printer, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Field, TextInput, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { useAmbulanceCall } from '@/lib/hooks/use-finance';
import { useInvoice, useAddPayment, useDeletePayment } from '@/lib/hooks/use-clinical';
import { useAbility } from '@/lib/auth-store';

const MODES = ['cash', 'card', 'upi', 'tpa', 'cheque'] as const;

/** "Payments" for an Ambulance Call bill — vehicle/driver header + Add Payment + Transaction History. */
export function AmbulanceCallPaymentsModal({ id, open, onClose }: { id: string | null; open: boolean; onClose: () => void }) {
  const ability = useAbility();
  const canEdit = ability.can('billing', 'edit');
  const { data: callData } = useAmbulanceCall(open ? id : null);
  const { data, isLoading } = useInvoice(open ? callData?.invoiceId ?? null : null);
  const addPayment = useAddPayment();
  const deletePayment = useDeletePayment();
  const toast = useToast();
  const confirm = useConfirm();

  const [amount, setAmount] = useState('0');
  const [mode, setMode] = useState<(typeof MODES)[number]>('cash');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function save() {
    setError(null);
    if (!data) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError('Enter a payment amount');
      return;
    }
    await addPayment.mutateAsync({ id: data.id, amount: amt, mode, reference: note || undefined });
    setAmount('0');
    setNote('');
  }

  async function onDeletePayment(paymentId: string) {
    if (!data) return;
    const ok = await confirm({
      title: `Delete this payment?`,
      description: 'The bill balance will be recalculated. This cannot be undone.',
      confirmLabel: 'Delete payment',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deletePayment.mutateAsync({ id: data.id, paymentId });
      toast.success(`Payment deleted`);
    } catch (e) {
      toast.error('Could not delete payment', { description: (e as Error).message });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Payments" size="xl">
      <div className="space-y-5">
          {isLoading || !data || !callData ? (
            <p className="py-12 text-center text-sm text-fg-muted">Loading…</p>
          ) : (
            <>
              {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-1 text-sm">
                  <Row label="Bill No" value={callData.billNo} />
                  <Row label="Received To" value={callData.patientName} />
                  <Row label="Vehicle Number" value={callData.vehicleNo} />
                  <Row label="Vehicle Model" value={callData.vehicleModel ?? '—'} />
                  <Row label="Driver Name" value={callData.driverName ?? '—'} />
                  <Row label="Driver Contact" value={callData.driverContact ?? '—'} />
                  <Row label="Date" value={new Date(callData.date).toLocaleDateString()} />
                  <Row label="Patient Address" value={callData.patientAddress ?? '—'} />
                </div>
                <div className="space-y-1 text-sm">
                  <SummaryRow label="Amount" value={data.subtotal.toFixed(2)} />
                  <SummaryRow label="Discount" value={`${data.discount.toFixed(2)}`} />
                  <SummaryRow label="Tax" value={data.tax.toFixed(2)} />
                  <SummaryRow label="Net Amount" value={data.netAmount.toFixed(2)} bold />
                  <SummaryRow label="Paid Amount" value={data.paid.toFixed(2)} />
                  <SummaryRow label="Balance Amount" value={data.balance.toFixed(2)} />
                </div>
                {canEdit && (
                  <div className="space-y-3">
                    <Field label="Amount" required>
                      <TextInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </Field>
                    <Field label="Payment Mode">
                      <Select value={mode} onChange={(e) => setMode(e.target.value as (typeof MODES)[number])} options={MODES.map((m) => ({ value: m, label: m.toUpperCase() }))} />
                    </Field>
                    <Field label="Note">
                      <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
                    </Field>
                    <Button size="sm" onClick={save} loading={addPayment.isPending} disabled={data.balance <= 0}>
                      Save
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Transaction History</h3>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                        <th className="px-3 py-2 font-semibold">Transaction ID</th>
                        <th className="px-3 py-2 font-semibold">Date</th>
                        <th className="px-3 py-2 font-semibold">Mode</th>
                        <th className="px-3 py-2 font-semibold">Note</th>
                        <th className="px-3 py-2 text-right font-semibold">Amount</th>
                        <th className="px-3 py-2 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.payments ?? []).length === 0 && (
                        <tr><td colSpan={6} className="px-3 py-8 text-center text-fg-muted">No payments recorded</td></tr>
                      )}
                      {(data.payments ?? []).map((p) => (
                        <tr key={p.id} className="border-b border-border/60 last:border-0">
                          <td className="px-3 py-2 font-mono text-xs">{p.id.slice(0, 8).toUpperCase()}</td>
                          <td className="px-3 py-2">{new Date(p.paidAt).toLocaleString()}</td>
                          <td className="px-3 py-2 uppercase">{p.mode}</td>
                          <td className="px-3 py-2 text-fg-muted">{p.reference ?? '—'}</td>
                          <td className="px-3 py-2 text-right tabular">{p.amount.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => window.print()} aria-label="Print" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                              {canEdit && (
                                <button onClick={() => onDeletePayment(p.id)} aria-label="Delete" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-1.5">
      <span className="text-fg-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-fg-muted">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
