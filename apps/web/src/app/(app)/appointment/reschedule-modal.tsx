'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AppointmentDto } from '@smart-hospital/shared';
import { rescheduleAppointmentSchema } from '@smart-hospital/shared';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import {
  useShifts, usePriorities, useDoctorShiftMatrix, useAvailableSlots, useDoctorFee,
} from '@/lib/hooks/use-appointment-setup';
import { useRescheduleAppointment } from '@/lib/hooks/use-appointment';
import { ApiRequestError } from '@/lib/api';

const STATUSES = ['pending', 'approved', 'cancelled', 'completed'] as const;

export function RescheduleModal({ appt, open, onClose }: { appt: AppointmentDto | null; open: boolean; onClose: () => void }) {
  const { data: shifts = [] } = useShifts();
  const { data: priorities = [] } = usePriorities();
  const { data: matrix } = useDoctorShiftMatrix();
  const reschedule = useRescheduleAppointment();

  const [shiftId, setShiftId] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [slot, setSlot] = useState('');
  const [priority, setPriority] = useState('');
  const [discountPct, setDiscountPct] = useState('0');
  const [status, setStatus] = useState('pending');
  const [liveConsult, setLiveConsult] = useState('no');
  const [message, setMessage] = useState('');
  const [alternateAddress, setAlternateAddress] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const doctorId = appt?.doctorId ?? '';
  const { data: fee } = useDoctorFee(doctorId, shiftId);
  const { data: slots = [] } = useAvailableSlots(doctorId, shiftId, apptDate);
  const fees = fee?.amount ?? appt?.fees ?? 0;

  const doctorShifts = useMemo(() => {
    const d = matrix?.doctors.find((x) => x.id === doctorId);
    const ids = d ? Object.entries(d.shifts).filter(([, on]) => on).map(([id]) => id) : [];
    return shifts.filter((s) => ids.includes(s.id));
  }, [matrix, doctorId, shifts]);

  // Prefill when opened.
  useEffect(() => {
    if (open && appt) {
      setShiftId(shifts.find((s) => s.name === appt.shift)?.id ?? '');
      setApptDate(appt.apptDate.slice(0, 10));
      setSlot(appt.slot ?? '');
      setPriority(appt.priority || 'Normal');
      setDiscountPct(String(appt.discountPct));
      setStatus(appt.status);
      setLiveConsult(appt.liveConsult ? 'yes' : 'no');
      setMessage(appt.message ?? '');
      setAlternateAddress(appt.alternateAddress ?? '');
      setApiError(null);
    }
  }, [open, appt, shifts]);

  async function save() {
    if (!appt) return;
    setApiError(null);
    const shiftName = shifts.find((s) => s.id === shiftId)?.name ?? '';
    const parsed = rescheduleAppointmentSchema.safeParse({
      apptDate, shift: shiftName, slot, fees, discountPct,
      priority: priority || 'Normal', status, liveConsult: liveConsult === 'yes', message, alternateAddress,
    });
    if (!parsed.success) { setApiError(parsed.error.issues[0]?.message ?? 'Invalid'); return; }
    try {
      await reschedule.mutateAsync({ id: appt.id, input: parsed.data });
      onClose();
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  return (
    <FormDrawer open={open} title="Reschedule" onClose={onClose} onSubmit={save} submitting={reschedule.isPending} wide>
      {apiError && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{apiError}</p>}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Doctor"><TextInput value={appt?.doctorName ?? ''} readOnly className="bg-bg/60" /></Field>
        <Field label="Doctor Fees"><TextInput value={fees.toFixed(2)} readOnly className="bg-bg/60" /></Field>
        <Field label="Shift">
          <Select value={shiftId} onChange={(e) => { setShiftId(e.target.value); setSlot(''); }} placeholder="Select…" options={doctorShifts.map((s) => ({ value: s.id, label: s.name }))} />
        </Field>
        <Field label="Appointment Date" required>
          <TextInput type="date" value={apptDate} onChange={(e) => { setApptDate(e.target.value); setSlot(''); }} />
        </Field>
        <Field label="Slot">
          <Select value={slot} onChange={(e) => setSlot(e.target.value)} placeholder={slots.length ? 'Select…' : 'No slots'}
            options={[...(slot && !slots.some((s) => s.label === slot) ? [{ value: slot, label: slot }] : []), ...slots.map((s) => ({ value: s.label, label: s.available ? s.label : `${s.label} (booked)` }))]} />
        </Field>
        <Field label="Appointment Priority">
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} options={priorities.map((p) => ({ value: p.name, label: p.name }))} />
        </Field>
        <Field label="Discount Percentage"><TextInput type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} /></Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} options={STATUSES.map((s) => ({ value: s, label: s }))} />
        </Field>
        <Field label="Live Consultant (On Video Conference)">
          <Select value={liveConsult} onChange={(e) => setLiveConsult(e.target.value)} options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} />
        </Field>
        <div />
        <Field label="Message" className="col-span-2"><TextArea value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
        <Field label="Alternate Address" className="col-span-2"><TextArea value={alternateAddress} onChange={(e) => setAlternateAddress(e.target.value)} /></Field>
      </div>
    </FormDrawer>
  );
}
