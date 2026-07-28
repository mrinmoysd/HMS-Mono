'use client';

import { useEffect } from 'react';
import { X, Printer, Trash2, Loader2 } from 'lucide-react';
import { StatusPill } from '@/components/ui/status-pill';
import { formatAge } from '@/lib/utils';
import { useAppointmentDetail, useDeleteAppointment } from '@/lib/hooks/use-appointment';
import { printAppointmentSlip } from './appointment-form';

/** Read-only Appointment Details modal (the demo's ☰ hamburger action). */
export function AppointmentDetailsModal({ id, open, onClose }: { id: string | null; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useAppointmentDetail(open ? id : null);
  const del = useDeleteAppointment();

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function onDelete() {
    if (!data) return;
    if (confirm(`Delete appointment ${data.apptNo}?`)) {
      await del.mutateAsync(data.id);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Appointment Details" className="relative z-10 w-full max-w-3xl rounded-md bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">Appointment Details</h2>
          <div className="flex items-center gap-2">
            {data && <button onClick={() => printAppointmentSlip(data)} aria-label="Print" className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-border/50"><Printer className="h-4 w-4" /></button>}
            {data && <button onClick={onDelete} aria-label="Delete" className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>}
            <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-border/50"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="p-5">
          {isLoading || !data ? (
            <div className="flex items-center justify-center py-12 text-fg-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
              <Row label="Patient Name" value={data.patientName} />
              <Row label="Appointment No" value={data.apptNo} />
              <Row label="Age" value={formatAge(data.patientAge)} />
              <Row label="Appointment Date" value={new Date(data.apptDate).toLocaleString()} />
              <Row label="Email" value={data.patientEmail ?? '—'} />
              <Row label="Appointment Priority" value={data.priority} />
              <Row label="Phone" value={data.patientPhone ?? '—'} />
              <Row label="Shift" value={data.shift ?? '—'} />
              <Row label="Gender" value={data.patientGender ?? '—'} />
              <Row label="Slot" value={data.slot ?? '—'} />
              <Row label="Doctor" value={data.doctorName} />
              <Row label="Amount" value={data.fees.toFixed(2)} />
              <Row label="Department" value={data.department ?? '—'} />
              <Row label="Status" value={<StatusPill status={data.status} />} />
              <Row label="Live Consultation" value={data.liveConsult ? 'Yes' : 'No'} />
              <Row label="Payment Mode" value={data.paymentMode} />
              <Row label="Source" value={data.source ?? '—'} />
              <Row label="Collected By" value={data.createdByName ?? '—'} />
              <Row label="Message" value={data.message ?? '—'} />
              <Row label="Alternate Address" value={data.alternateAddress ?? '—'} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-2">
      <span className="text-fg-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
