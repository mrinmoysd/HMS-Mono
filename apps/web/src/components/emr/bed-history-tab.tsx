'use client';

import { useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, Select } from '@/components/ui/field';
import { ApiRequestError } from '@/lib/api';
import { useBedGroups, useAvailableBeds } from '@/lib/hooks/use-ipd';
import { useBedHistory, useTransferBed } from '@/lib/hooks/use-ipd-clinical';

/** Bed History tab (IPD): occupancy timeline + Transfer Bed action. */
export function BedHistoryTab({ admissionId, canEdit }: { admissionId: string; canEdit: boolean }) {
  const { data: history = [] } = useBedHistory(admissionId);
  const { data: groups } = useBedGroups();
  const transfer = useTransferBed(admissionId);
  const [open, setOpen] = useState(false);
  const [bedGroupId, setBedGroupId] = useState('');
  const [bedId, setBedId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { data: beds = [] } = useAvailableBeds(bedGroupId || undefined);

  async function save() {
    setError(null);
    if (!bedId) { setError('Select a bed'); return; }
    try {
      await transfer.mutateAsync(bedId);
      setOpen(false);
      setBedGroupId(''); setBedId('');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : 'Transfer failed');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Bed History</h2>
        {canEdit && <Button size="sm" onClick={() => setOpen(true)}><ArrowRightLeft className="h-4 w-4" /> Transfer Bed</Button>}
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-3 py-2.5 font-semibold">Bed</th>
              <th className="px-3 py-2.5 font-semibold">From</th>
              <th className="px-3 py-2.5 font-semibold">To</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && <tr><td colSpan={4} className="px-3 py-10 text-center text-fg-muted">No bed history</td></tr>}
            {history.map((h) => (
              <tr key={h.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-medium">{h.bedLabel}</td>
                <td className="px-3 py-2.5">{new Date(h.fromDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td className="px-3 py-2.5">{h.toDate ? new Date(h.toDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${h.active ? 'bg-success/15 text-success' : 'bg-border/60 text-fg-muted'}`}>{h.active ? 'Current' : 'Past'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormDrawer open={open} title="Transfer Bed" onClose={() => setOpen(false)} onSubmit={save} submitting={transfer.isPending}>
        {error && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="space-y-4">
          <Field label="Bed Group">
            <Select value={bedGroupId} onChange={(e) => { setBedGroupId(e.target.value); setBedId(''); }} placeholder="All groups"
              options={(groups?.data ?? []).map((g) => ({ value: g.id, label: g.floorName ? `${g.floorName} · ${g.name}` : g.name }))} />
          </Field>
          <Field label="New Bed" required>
            <Select value={bedId} onChange={(e) => setBedId(e.target.value)} placeholder={beds.length ? 'Select bed…' : 'No available beds'}
              options={beds.map((b) => ({ value: b.id, label: `${b.bedGroupName} · ${b.bedNo}` }))} />
          </Field>
        </div>
      </FormDrawer>
    </div>
  );
}
