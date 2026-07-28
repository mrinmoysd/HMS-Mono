'use client';

import { useEffect, useState } from 'react';
import { bloodDonorSchema, BLOOD_GROUPS, GENDERS, type BloodDonorDto } from '@smart-hospital/shared';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { useCreateBloodDonor, useUpdateBloodDonor } from '@/lib/hooks/use-departments';
import { ageFromDob, composeAge, parseAge } from '@/lib/utils';
import { ApiRequestError } from '@/lib/api';

const EMPTY = { name: '', bloodGroup: '', gender: '', dob: '', age: '', fatherName: '', phone: '', address: '', lastDonation: '' };

/** Add/Edit Blood Donor — mirrors the Patient form's DOB → 3-part age auto-compute. */
export function BloodDonorForm({ open, donor, onClose, onSaved }: { open: boolean; donor: BloodDonorDto | null; onClose: () => void; onSaved?: (d: BloodDonorDto) => void }) {
  const create = useCreateBloodDonor();
  const update = useUpdateBloodDonor();
  const [form, setForm] = useState(EMPTY);
  const [ageParts, setAgePartsState] = useState({ years: 0, months: 0, days: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(
        donor
          ? {
              name: donor.name, bloodGroup: donor.bloodGroup, gender: donor.gender ?? '', dob: donor.dob ? donor.dob.slice(0, 10) : '',
              age: donor.age ?? '', fatherName: donor.fatherName ?? '', phone: donor.phone ?? '', address: donor.address ?? '',
              lastDonation: donor.lastDonation ? donor.lastDonation.slice(0, 10) : '',
            }
          : EMPTY,
      );
      setAgePartsState(parseAge(donor?.age));
      setError(null);
    }
  }, [open, donor]);

  if (!open) return null;

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setDob(value: string) {
    set('dob', value);
    if (value) {
      const parts = ageFromDob(value);
      setAgePartsState(parts);
      set('age', composeAge(parts));
    }
  }

  function setAgePart(part: 'years' | 'months' | 'days', value: string) {
    const next = { ...ageParts, [part]: Math.max(0, Number.parseInt(value || '0', 10) || 0) };
    setAgePartsState(next);
    set('age', composeAge(next));
  }

  async function submit() {
    setError(null);
    // strip empty strings before validating optional date fields
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
    const parsed = bloodDonorSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the highlighted fields');
      return;
    }
    try {
      const saved = donor ? await update.mutateAsync({ id: donor.id, input: parsed.data }) : await create.mutateAsync(parsed.data);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  return (
    <FormDrawer open={open} title={donor ? 'Edit Blood Donor' : 'Add Blood Donor'} onClose={onClose} onSubmit={submit} submitting={create.isPending || update.isPending}>
      {error && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="space-y-4">
        <Field label="Donor Name" required>
          <TextInput value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date of Birth">
            <TextInput type="date" value={form.dob} onChange={(e) => setDob(e.target.value)} />
          </Field>
          <Field label="Blood Group" required>
            <Select value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)} placeholder="Select…" options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))} />
          </Field>
        </div>
        <Field label="Age">
          <div className="grid grid-cols-3 gap-2">
            <TextInput type="number" min={0} value={String(ageParts.years)} onChange={(e) => setAgePart('years', e.target.value)} placeholder="Years" />
            <TextInput type="number" min={0} value={String(ageParts.months)} onChange={(e) => setAgePart('months', e.target.value)} placeholder="Months" />
            <TextInput type="number" min={0} value={String(ageParts.days)} onChange={(e) => setAgePart('days', e.target.value)} placeholder="Days" />
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Gender">
            <Select value={form.gender} onChange={(e) => set('gender', e.target.value)} placeholder="Select…" options={GENDERS.map((g) => ({ value: g, label: g.charAt(0).toUpperCase() + g.slice(1) }))} />
          </Field>
          <Field label="Father Name">
            <TextInput value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact No">
            <TextInput value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="Last Donation">
            <TextInput type="date" value={form.lastDonation} onChange={(e) => set('lastDonation', e.target.value)} />
          </Field>
        </div>
        <Field label="Address">
          <TextArea value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
      </div>
    </FormDrawer>
  );
}
