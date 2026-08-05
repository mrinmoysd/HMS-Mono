'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/ui/page-header';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Lock } from 'lucide-react';
import type { ShiftDto, AppointmentPriorityDto } from '@smart-hospital/shared';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { useConfirmDelete } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, Select } from '@/components/ui/field';
import { useDoctors } from '@/lib/hooks/use-clinical';
import { useCharges } from '@/lib/hooks/use-masters';
import {
  useShifts, useCreateShift, useUpdateShift, useDeleteShift,
  usePriorities, useCreatePriority, useUpdatePriority, useDeletePriority,
  useDoctorShiftMatrix, useToggleDoctorShift,
  useSlotConfig, useSaveSlotConfig,
} from '@/lib/hooks/use-appointment-setup';
import { useAbility } from '@/lib/auth-store';

type Section = 'slots' | 'doctor-shift' | 'shift' | 'priority';

export default function AppointmentSetupPage() {
  const ability = useAbility();

  // Each tab is its own feature (R1). They do not share a permission: the spec
  // gives Slot/Shift/Doctor Shift to Accountant, Doctor and Receptionist but
  // keeps Appointment Priority to Admin and Receptionist. Gating them together
  // on `setup:add` showed a doctor a Priority tab whose every request 403s.
  const tabs = [
    { value: 'slots', label: 'Slots', feature: 'appointment.slot' },
    { value: 'doctor-shift', label: 'Doctor Shift', feature: 'appointment.doctor_shift' },
    { value: 'shift', label: 'Shift', feature: 'appointment.shift' },
    { value: 'priority', label: 'Appointment Priority', feature: 'appointment.appointment_priority' },
  ].filter((t) => ability.canFeature(t.feature, 'view'));

  const [section, setSection] = useState<Section>('slots');
  // Land on a tab that is actually visible, whatever the role.
  const active = tabs.some((t) => t.value === section) ? section : (tabs[0]?.value as Section);

  const can = (feature: string) => ability.canFeature(feature, 'edit');

  // Pharmacist, Pathologist, Radiologist and Nurse hold none of these four
  // features. Say so, rather than rendering a titled page with nothing under
  // it — an empty shell is exactly what docs/ROLE_PERMISSION_PARITY.md §7
  // criticises the reference build for.
  if (tabs.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="Appointment Setup" backHref="/setup" backLabel="Back to Setup" />
        <EmptyState
          icon={Lock}
          title="You don't have access to Appointment Setup"
          description="Shifts, slots and appointment priorities are managed by the scheduling and admin roles."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Appointment Setup"
        description={<>Shifts, priorities, doctor shift assignment and consultation slots</>}
        backHref="/setup"
        backLabel="Back to Setup"
      />
      <Tabs
        tabs={tabs.map(({ value, label }) => ({ value, label }))}
        value={active}
        onChange={(s) => setSection(s as Section)}
      />
      {active === 'slots' && <SlotsPanel canManage={can('appointment.slot')} />}
      {active === 'doctor-shift' && <DoctorShiftPanel canManage={can('appointment.doctor_shift')} />}
      {active === 'shift' && <ShiftPanel canManage={can('appointment.shift')} />}
      {active === 'priority' && <PriorityPanel canManage={can('appointment.appointment_priority')} />}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-md border border-border bg-surface">{children}</div>;
}
const TH = 'px-3 py-2.5 font-semibold text-left';

// ── Shift ─────────────────────────────────────────────────────
function ShiftPanel({ canManage }: { canManage: boolean }) {
  const { data: shifts = [] } = useShifts();
  const create = useCreateShift();
  const update = useUpdateShift();
  const del = useDeleteShift();

  const confirmDelete = useConfirmDelete();
  const toast = useToast();

  async function onDelete(s: ShiftDto) {
    if (!(await confirmDelete(`shift ${s.name}`))) return;
    try {
      await del.mutateAsync(s.id);
      toast.success(`${s.name} deleted`);
    } catch (e) {
      toast.error('Could not delete shift', { description: (e as Error).message });
    }
  }
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftDto | null>(null);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState<string | null>(null);

  function openAdd() { setEditing(null); setName(''); setStartTime(''); setEndTime(''); setError(null); setOpen(true); }
  function openEdit(s: ShiftDto) { setEditing(s); setName(s.name); setStartTime(s.startTime ?? ''); setEndTime(s.endTime ?? ''); setError(null); setOpen(true); }

  async function save() {
    setError(null);
    if (!name.trim() || !startTime || !endTime) { setError('Name, Time From and Time To are required'); return; }
    const input = { name, startTime, endTime };
    if (editing) await update.mutateAsync({ id: editing.id, input });
    else await create.mutateAsync(input);
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Shift</h2>
        {canManage && <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Shift</Button>}
      </div>
      <Panel>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-xs uppercase tracking-wide text-fg-muted"><th className={TH}>Name</th><th className={TH}>Time From</th><th className={TH}>Time To</th><th className={`${TH} text-right`}>Action</th></tr></thead>
          <tbody>
            {shifts.length === 0 && <tr><td colSpan={4} className="px-3 py-10 text-center text-fg-muted">No shifts</td></tr>}
            {shifts.map((s) => (
              <tr key={s.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-medium">{s.name}</td>
                <td className="px-3 py-2.5">{s.startTime ?? '—'}</td>
                <td className="px-3 py-2.5">{s.endTime ?? '—'}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {canManage && <button onClick={() => openEdit(s)} className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-border/50"><Pencil className="h-4 w-4" /></button>}
                    {canManage && <button onClick={() => onDelete(s)} className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <FormDrawer open={open} title={editing ? 'Edit Shift' : 'Add Shift'} onClose={() => setOpen(false)} onSubmit={save} submitting={create.isPending || update.isPending}>
        {error && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="space-y-4">
          <Field label="Name" required><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Morning" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Time From" required><TextInput type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Field>
            <Field label="Time To" required><TextInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Field>
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}

// ── Priority ──────────────────────────────────────────────────
function PriorityPanel({ canManage }: { canManage: boolean }) {
  const { data: priorities = [] } = usePriorities();
  const create = useCreatePriority();
  const update = useUpdatePriority();
  const del = useDeletePriority();

  const confirmDelete = useConfirmDelete();
  const toast = useToast();

  async function onDelete(p: AppointmentPriorityDto) {
    if (!(await confirmDelete(`priority ${p.name}`))) return;
    try {
      await del.mutateAsync(p.id);
      toast.success(`${p.name} deleted`);
    } catch (e) {
      toast.error('Could not delete priority', { description: (e as Error).message });
    }
  }
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentPriorityDto | null>(null);
  const [name, setName] = useState('');

  function openAdd() { setEditing(null); setName(''); setOpen(true); }
  function openEdit(p: AppointmentPriorityDto) { setEditing(p); setName(p.name); setOpen(true); }
  async function save() {
    if (!name.trim()) return;
    const input = { name, sortOrder: editing?.sortOrder ?? priorities.length };
    if (editing) await update.mutateAsync({ id: editing.id, input });
    else await create.mutateAsync(input);
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Appointment Priority</h2>
        {canManage && <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Priority</Button>}
      </div>
      <Panel>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-xs uppercase tracking-wide text-fg-muted"><th className={TH}>Priority</th><th className={`${TH} text-right`}>Action</th></tr></thead>
          <tbody>
            {priorities.length === 0 && <tr><td colSpan={2} className="px-3 py-10 text-center text-fg-muted">No priorities</td></tr>}
            {priorities.map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-medium">{p.name}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {canManage && <button onClick={() => openEdit(p)} className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-border/50"><Pencil className="h-4 w-4" /></button>}
                    {canManage && <button onClick={() => onDelete(p)} className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <FormDrawer open={open} title={editing ? 'Edit Priority' : 'Add Priority'} onClose={() => setOpen(false)} onSubmit={save} submitting={create.isPending || update.isPending}>
        <Field label="Name" required><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Urgent" /></Field>
      </FormDrawer>
    </div>
  );
}

// ── Doctor Shift matrix ───────────────────────────────────────
function DoctorShiftPanel({ canManage }: { canManage: boolean }) {
  const { data } = useDoctorShiftMatrix();
  const toggle = useToggleDoctorShift();
  const shifts = data?.shifts ?? [];
  const doctors = data?.doctors ?? [];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Doctor Shift</h2>
      <Panel>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-xs uppercase tracking-wide text-fg-muted"><th className={TH}>Doctor Name</th>{shifts.map((s) => <th key={s.id} className={`${TH}`}>{s.name}</th>)}</tr></thead>
          <tbody>
            {doctors.length === 0 && <tr><td colSpan={shifts.length + 1} className="px-3 py-10 text-center text-fg-muted">No doctors</td></tr>}
            {doctors.map((d) => (
              <tr key={d.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-medium">{d.name}</td>
                {shifts.map((s) => (
                  <td key={s.id} className="px-3 py-2.5">
                    <Checkbox
                      checked={d.shifts[s.id] ?? false}
                      disabled={!canManage || toggle.isPending}
                      onChange={(e) => toggle.mutate({ doctorId: d.id, shiftId: s.id, active: e.target.checked })}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

// ── Slots config ──────────────────────────────────────────────
function SlotsPanel({ canManage }: { canManage: boolean }) {
  const { data: doctors = [] } = useDoctors();
  const { data: shifts = [] } = useShifts();
  const { data: chargeData } = useCharges({ size: 100, module: 'appointment' });
  const save = useSaveSlotConfig();

  const [doctorId, setDoctorId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [searched, setSearched] = useState(false);
  const { data: config } = useSlotConfig(searched ? doctorId : '', searched ? shiftId : '');

  const [duration, setDuration] = useState('');
  const [chargeId, setChargeId] = useState('');
  const [amount, setAmount] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config) {
      setDuration(config.consultationDurationMinutes ? String(config.consultationDurationMinutes) : '');
      setChargeId(config.chargeId ?? '');
      setAmount(config.amount ? String(config.amount) : '');
    }
  }, [config]);

  function pickCharge(id: string) {
    setChargeId(id);
    const c = (chargeData?.data ?? []).find((x) => x.id === id);
    if (c) setAmount(String(c.standardCharge));
  }

  async function submit() {
    if (!doctorId || !shiftId || !duration) return;
    await save.mutateAsync({
      doctorId, shiftId,
      consultationDurationMinutes: Number(duration),
      chargeId: chargeId || undefined,
      amount: Number(amount) || 0,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-surface p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
          <Field label="Doctor" required>
            <Select value={doctorId} onChange={(e) => { setDoctorId(e.target.value); setSearched(false); }} placeholder="Select…" options={doctors.map((d) => ({ value: d.id, label: d.name }))} />
          </Field>
          <Field label="Shift" required>
            <Select value={shiftId} onChange={(e) => { setShiftId(e.target.value); setSearched(false); }} placeholder="Select…" options={shifts.map((s) => ({ value: s.id, label: s.name }))} />
          </Field>
          <Button size="sm" variant="secondary" disabled={!doctorId || !shiftId} onClick={() => setSearched(true)}>
            <Search className="h-4 w-4" /> Search
          </Button>
        </div>
      </div>

      {searched && (
        <div className="rounded-md border border-border bg-surface p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Field label="Consultation Duration (min)" required><TextInput type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 30" /></Field>
            <Field label="Charge">
              <Select value={chargeId} onChange={(e) => pickCharge(e.target.value)} placeholder="Select…" options={(chargeData?.data ?? []).map((c) => ({ value: c.id, label: `${c.name} (${c.standardCharge.toFixed(2)})` }))} />
            </Field>
            <Field label="Amount"><TextInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            <div className="flex items-end">
              {canManage && <Button size="sm" onClick={submit} loading={save.isPending} disabled={!duration}>Save</Button>}
              {saved && <span className="ml-3 self-center text-sm text-success">Saved ✓</span>}
            </div>
          </div>
          <p className="mt-3 text-xs text-fg-muted">Slots are generated by slicing the shift window by this duration; the amount becomes the doctor&apos;s consultation fee for this shift.</p>
        </div>
      )}
    </div>
  );
}
