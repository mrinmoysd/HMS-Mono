'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { appointmentSchema, type AppointmentDto } from '@smart-hospital/shared';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { PatientSelect } from '@/components/patient-select';
import { useDoctors, useCreateAppointment } from '@/lib/hooks/use-clinical';
import {
  useShifts, usePriorities, useDoctorShiftMatrix, useAvailableSlots, useDoctorFee,
} from '@/lib/hooks/use-appointment-setup';
import { printDocument } from '@/lib/print';
import { PatientForm } from '../patient/patient-form';
import { ApiRequestError } from '@/lib/api';

const PAYMENT_MODES = ['cash', 'card', 'upi', 'tpa', 'cheque'] as const;
const STATUSES = ['pending', 'approved', 'cancelled', 'completed'] as const;

function round2(n: number) { return Math.round((n + Number.EPSILON) * 100) / 100; }

export function AppointmentForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: doctors = [] } = useDoctors();
  const { data: shifts = [] } = useShifts();
  const { data: priorities = [] } = usePriorities();
  const { data: matrix } = useDoctorShiftMatrix();
  const create = useCreateAppointment();

  const [patientId, setPatientId] = useState('');
  const [patientLabel, setPatientLabel] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [apptDate, setApptDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState('');
  const [priority, setPriority] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [status, setStatus] = useState('pending');
  const [discountPct, setDiscountPct] = useState('0');
  const [liveConsult, setLiveConsult] = useState('no');
  const [message, setMessage] = useState('');
  const [alternateAddress, setAlternateAddress] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [newPatientOpen, setNewPatientOpen] = useState(false);

  const { data: fee } = useDoctorFee(doctorId, shiftId);
  const { data: slots = [] } = useAvailableSlots(doctorId, shiftId, apptDate);
  const fees = fee?.amount ?? 0;

  // Only the shifts this doctor is assigned to.
  const doctorShiftIds = useMemo(() => {
    const d = matrix?.doctors.find((x) => x.id === doctorId);
    return d ? Object.entries(d.shifts).filter(([, on]) => on).map(([id]) => id) : [];
  }, [matrix, doctorId]);
  const doctorShifts = shifts.filter((s) => doctorShiftIds.includes(s.id));

  useEffect(() => { setShiftId(''); setSlot(''); }, [doctorId]);
  useEffect(() => { setSlot(''); }, [shiftId, apptDate]);
  useEffect(() => { if (!priority && priorities.length) setPriority(priorities[0]!.name); }, [priorities, priority]);

  function reset() {
    setPatientId(''); setPatientLabel(''); setDoctorId(''); setShiftId(''); setSlot('');
    setDiscountPct('0'); setLiveConsult('no'); setMessage(''); setAlternateAddress('');
    setStatus('pending'); setPaymentMode('cash'); setErrors({}); setApiError(null);
  }

  function buildInput() {
    const shiftName = shifts.find((s) => s.id === shiftId)?.name ?? '';
    const paid = round2(fees * (1 - (Number(discountPct) || 0) / 100));
    return {
      patientId, doctorId, apptDate,
      shift: shiftName, slot,
      fees, discountPct, paid,
      priority: priority || 'Normal',
      source: 'Offline',
      paymentMode, liveConsult: liveConsult === 'yes',
      status, message, alternateAddress,
    };
  }

  async function submit(print: boolean) {
    setApiError(null);
    const parsed = appointmentSchema.safeParse(buildInput());
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const i of parsed.error.issues) if (typeof i.path[0] === 'string') fe[i.path[0]] = i.message;
      setErrors(fe);
      return;
    }
    try {
      const appt = await create.mutateAsync(parsed.data);
      if (print) printAppointmentSlip(appt);
      reset();
      onClose();
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  return (
    <>
      <FormDrawer open={open} title="Add Appointment" onClose={onClose} onSubmit={() => submit(false)} submitting={create.isPending} submitLabel="Save" wide
        extraActions={<Button type="button" variant="secondary" onClick={() => submit(true)} loading={create.isPending}>Save &amp; Print</Button>}>
        {apiError && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{apiError}</p>}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Patient" required error={errors.patientId} className="col-span-2">
            <div className="flex gap-2">
              <div className="flex-1"><PatientSelect value={patientId} selectedLabel={patientLabel} onChange={(id, label) => { setPatientId(id); setPatientLabel(label); }} /></div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setNewPatientOpen(true)}><UserPlus className="h-4 w-4" /> New Patient</Button>
            </div>
          </Field>

          <Field label="Doctor" required error={errors.doctorId}>
            <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} placeholder="Select…" options={doctors.map((d) => ({ value: d.id, label: d.name }))} />
          </Field>
          <Field label="Doctor Fees">
            <TextInput value={fees.toFixed(2)} readOnly className="bg-bg/60" />
          </Field>
          <Field label="Shift" required>
            <Select value={shiftId} onChange={(e) => setShiftId(e.target.value)} placeholder={doctorId ? (doctorShifts.length ? 'Select…' : 'No shifts assigned') : 'Select doctor first'} options={doctorShifts.map((s) => ({ value: s.id, label: s.name }))} />
          </Field>
          <Field label="Appointment Date" required error={errors.apptDate}>
            <TextInput type="date" value={apptDate} onChange={(e) => setApptDate(e.target.value)} />
          </Field>

          <Field label="Slot">
            <Select value={slot} onChange={(e) => setSlot(e.target.value)} placeholder={shiftId ? (slots.length ? 'Select…' : 'Configure slots in Setup') : 'Select shift first'}
              options={slots.map((s) => ({ value: s.label, label: s.available ? s.label : `${s.label} (booked)` }))} />
          </Field>
          <Field label="Appointment Priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value)} options={priorities.map((p) => ({ value: p.name, label: p.name }))} />
          </Field>
          <Field label="Payment Mode">
            <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} options={PAYMENT_MODES.map((m) => ({ value: m, label: m }))} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} options={STATUSES.map((s) => ({ value: s, label: s }))} />
          </Field>

          <Field label="Discount Percentage">
            <TextInput type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
          </Field>
          <Field label="Live Consultant (On Video Conference)">
            <Select value={liveConsult} onChange={(e) => setLiveConsult(e.target.value)} options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} />
          </Field>
          <Field label="Message" className="col-span-2">
            <TextArea value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <Field label="Alternate Address" className="col-span-2">
            <TextArea value={alternateAddress} onChange={(e) => setAlternateAddress(e.target.value)} />
          </Field>
        </div>
      </FormDrawer>

      <PatientForm open={newPatientOpen} onClose={() => setNewPatientOpen(false)} />
    </>
  );
}

export function printAppointmentSlip(a: AppointmentDto) {
  printDocument({
    documentTitle: 'Appointment',
    heading: `Appointment Slip — ${a.apptNo}`,
    meta: [
      ['Patient', a.patientName], ['Phone', a.patientPhone ?? '—'], ['Doctor', a.doctorName],
      ['Date', new Date(a.apptDate).toLocaleString()], ['Shift', a.shift ?? '—'], ['Slot', a.slot ?? '—'],
      ['Priority', a.priority], ['Status', a.status],
    ],
    sections: [{
      heading: 'Payment',
      rows: [
        ['Doctor Fees', a.fees.toFixed(2)],
        ['Discount', `${a.discountPct}%`],
        ['Paid', a.paid.toFixed(2)],
        ['Payment Mode', a.paymentMode],
      ],
    }],
    footer: 'Authorised Signatory',
  });
}
