'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowUp, ArrowDown, ListOrdered } from 'lucide-react';
import type { QueueRow } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { useDoctors } from '@/lib/hooks/use-clinical';
import { useShifts, useDoctorShiftMatrix, useAvailableSlots } from '@/lib/hooks/use-appointment-setup';
import { useQueue, useReorderQueue } from '@/lib/hooks/use-appointment';

const EMPTY: QueueRow[] = [];

export default function QueuePage() {
  const { data: doctors = [] } = useDoctors();
  const { data: shifts = [] } = useShifts();
  const { data: matrix } = useDoctorShiftMatrix();
  const reorder = useReorderQueue();

  const [doctorId, setDoctorId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [q, setQ] = useState<{ doctorId: string; shift: string; date: string; slot: string } | null>(null);

  const { data: slotOpts = [] } = useAvailableSlots(doctorId, shiftId, date);
  const { data, isLoading } = useQueue(q?.doctorId ?? '', q?.shift ?? '', q?.date ?? '', q?.slot ?? '', !!q);
  const rows = data ?? EMPTY; // stable ref so the sync effect doesn't loop

  const [ordered, setOrdered] = useState<QueueRow[]>([]);
  useEffect(() => { setOrdered(rows); }, [rows]);

  const doctorShifts = useMemo(() => {
    const d = matrix?.doctors.find((x) => x.id === doctorId);
    const ids = d ? Object.entries(d.shifts).filter(([, on]) => on).map(([id]) => id) : [];
    return shifts.filter((s) => ids.includes(s.id));
  }, [matrix, doctorId, shifts]);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= ordered.length) return;
    const next = [...ordered];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setOrdered(next);
  }

  function search() {
    const shiftName = shifts.find((s) => s.id === shiftId)?.name ?? '';
    setQ({ doctorId, shift: shiftName, date, slot });
  }

  const dirty = ordered.map((r) => r.id).join(',') !== rows.map((r) => r.id).join(',');

  return (
    <div className="space-y-4">
      <PageHeader title="Patient Queue" backHref="/appointment" backLabel="Back to Appointments" />

      <div className="rounded-md border border-border bg-surface p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="Doctor" required>
            <Select value={doctorId} onChange={(e) => { setDoctorId(e.target.value); setShiftId(''); setSlot(''); }} placeholder="Select…" options={doctors.map((d) => ({ value: d.id, label: d.name }))} />
          </Field>
          <Field label="Shift" required>
            <Select value={shiftId} onChange={(e) => { setShiftId(e.target.value); setSlot(''); }} placeholder="Select…" options={doctorShifts.map((s) => ({ value: s.id, label: s.name }))} />
          </Field>
          <Field label="Date" required><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Slot">
            <Select value={slot} onChange={(e) => setSlot(e.target.value)} placeholder="All slots" options={slotOpts.map((s) => ({ value: s.label, label: s.label }))} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {q && dirty && <Button size="sm" variant="secondary" loading={reorder.isPending} onClick={() => reorder.mutate(ordered.map((r) => r.id))}><ListOrdered className="h-4 w-4" /> Reorder Queue</Button>}
          <Button size="sm" disabled={!doctorId || !shiftId || !date} onClick={search}><Search className="h-4 w-4" /> Search</Button>
        </div>
      </div>

      {q && (
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                <th className="px-3 py-2.5 font-semibold">#</th>
                <th className="px-3 py-2.5 font-semibold">Patient</th>
                <th className="px-3 py-2.5 font-semibold">Appointment No</th>
                <th className="px-3 py-2.5 font-semibold">Phone</th>
                <th className="px-3 py-2.5 font-semibold">Priority</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 text-right font-semibold">Order</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="px-3 py-8 text-center text-fg-muted">Loading…</td></tr>}
              {!isLoading && ordered.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-fg-muted">No patients in this queue</td></tr>}
              {ordered.map((r, i) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2.5 tabular font-medium">{i + 1}</td>
                  <td className="px-3 py-2.5"><Link href={`/patient/${r.patientId}`} className="font-medium text-primary hover:underline">{r.patientName}</Link></td>
                  <td className="px-3 py-2.5">{r.apptNo}</td>
                  <td className="px-3 py-2.5">{r.phone ?? '—'}</td>
                  <td className="px-3 py-2.5">{r.priority}</td>
                  <td className="px-3 py-2.5 capitalize">{r.status}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-border/50 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                      <button onClick={() => move(i, 1)} disabled={i === ordered.length - 1} aria-label="Move down" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-border/50 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
