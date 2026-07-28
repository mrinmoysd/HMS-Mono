'use client';

import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { portalBookSchema } from '@smart-hospital/shared';
import { useAppointments, useDoctors, useBook } from '@/lib/hooks';
import { ApiRequestError } from '@/lib/api';

const TONE: Record<string, string> = { approved: 'bg-success/10 text-success', completed: 'bg-success/10 text-success', pending: 'bg-warning/10 text-warning', cancelled: 'bg-danger/10 text-danger' };

export default function AppointmentsPage() {
  const appts = useAppointments();
  const doctors = useDoctors();
  const book = useBook();
  const [open, setOpen] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const parsed = portalBookSchema.safeParse({ doctorId, apptDate: date, message });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Invalid'); return; }
    try {
      await book.mutateAsync(parsed.data);
      setOpen(false); setDoctorId(''); setMessage('');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : 'Booking failed');
    }
  }

  const input = 'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Appointments</h1>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-fg"><Plus className="h-4 w-4" /> Book</button>
      </div>

      <div className="space-y-2">
        {(appts.data ?? []).map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">{a.doctorName}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TONE[a.status] ?? 'bg-border/60 text-fg-muted'}`}>{a.status}</span>
            </div>
            <p className="mt-0.5 text-sm text-fg-muted">{new Date(a.apptDate).toLocaleDateString()} · {a.apptNo}</p>
          </div>
        ))}
        {appts.data && appts.data.length === 0 && <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-fg-muted">No appointments yet.</p>}
      </div>

      {open && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Book Appointment</h2><button onClick={() => setOpen(false)}><X className="h-5 w-5 text-fg-muted" /></button></div>
            <div className="space-y-3">
              <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={input}>
                <option value="">Select doctor…</option>
                {(doctors.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
              <textarea placeholder="Reason (optional)" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className={input} />
              {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              <button onClick={submit} disabled={book.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-fg disabled:opacity-60">
                {book.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
