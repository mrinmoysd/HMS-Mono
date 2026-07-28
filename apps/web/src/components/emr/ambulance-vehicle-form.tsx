'use client';

import { useEffect, useState } from 'react';
import { AMBULANCE_VEHICLE_TYPES, ambulanceVehicleSchema, type AmbulanceVehicleDto } from '@smart-hospital/shared';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { useCreateVehicle, useUpdateVehicle } from '@/lib/hooks/use-finance';
import { ApiRequestError } from '@/lib/api';

const EMPTY = { vehicleNo: '', model: '', year: '', driverName: '', driverLicense: '', driverContact: '', vehicleType: '', note: '' };

/** Add/Edit Ambulance — the "Ambulance List" (fleet) modal. */
export function AmbulanceVehicleForm({ open, vehicle, onClose }: { open: boolean; vehicle: AmbulanceVehicleDto | null; onClose: () => void }) {
  const create = useCreateVehicle();
  const update = useUpdateVehicle();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(
        vehicle
          ? {
              vehicleNo: vehicle.vehicleNo, model: vehicle.model ?? '', year: vehicle.year ? String(vehicle.year) : '',
              driverName: vehicle.driverName ?? '', driverLicense: vehicle.driverLicense ?? '', driverContact: vehicle.driverContact ?? '',
              vehicleType: vehicle.vehicleType ?? '', note: vehicle.note ?? '',
            }
          : EMPTY,
      );
      setError(null);
    }
  }, [open, vehicle]);

  if (!open) return null;

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setError(null);
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
    const parsed = ambulanceVehicleSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the highlighted fields');
      return;
    }
    try {
      if (vehicle) await update.mutateAsync({ id: vehicle.id, input: parsed.data });
      else await create.mutateAsync(parsed.data);
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  return (
    <FormDrawer open={open} title={vehicle ? 'Edit Ambulance' : 'Add Ambulance'} onClose={onClose} onSubmit={submit} submitting={create.isPending || update.isPending}>
      {error && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Vehicle Number" required><TextInput value={form.vehicleNo} onChange={(e) => set('vehicleNo', e.target.value)} /></Field>
          <Field label="Vehicle Model" required><TextInput value={form.model} onChange={(e) => set('model', e.target.value)} /></Field>
        </div>
        <Field label="Year Made"><TextInput type="number" value={form.year} onChange={(e) => set('year', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Driver Name"><TextInput value={form.driverName} onChange={(e) => set('driverName', e.target.value)} /></Field>
          <Field label="Driver License"><TextInput value={form.driverLicense} onChange={(e) => set('driverLicense', e.target.value)} /></Field>
        </div>
        <Field label="Driver Contact"><TextInput value={form.driverContact} onChange={(e) => set('driverContact', e.target.value)} /></Field>
        <Field label="Vehicle Type" required>
          <Select value={form.vehicleType} onChange={(e) => set('vehicleType', e.target.value)} placeholder="Select"
            options={AMBULANCE_VEHICLE_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
        </Field>
        <Field label="Note"><TextArea value={form.note} onChange={(e) => set('note', e.target.value)} /></Field>
      </div>
    </FormDrawer>
  );
}
