'use client';

import { useEffect, useState } from 'react';
import type { BloodIssueDto } from '@smart-hospital/shared';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { useDoctors } from '@/lib/hooks/use-clinical';
import { useUpdateBloodIssue } from '@/lib/hooks/use-departments';
import { ApiRequestError } from '@/lib/api';

/**
 * Edit an existing Blood/Component Issue.
 *
 * Header plus the bill-level discount only — the bag is fixed. It was marked
 * `issued` when this record was created; swapping it here would have to unwind
 * that, and a mis-click would quietly return a transfused bag to stock. To
 * issue a different bag, void this issue and raise a new one, which is also
 * what leaves the audit trail.
 */
export function BloodIssueEditModal({
  issue,
  title,
  open,
  onClose,
}: {
  issue: BloodIssueDto | null;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: doctors = [] } = useDoctors();
  const update = useUpdateBloodIssue();

  const [consultantId, setConsultantId] = useState('');
  const [referenceDoctor, setReferenceDoctor] = useState('');
  const [technician, setTechnician] = useState('');
  const [bloodQty, setBloodQty] = useState('');
  const [note, setNote] = useState('');
  const [discountPct, setDiscountPct] = useState('0');
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !issue) return;
    setConsultantId(issue.consultantId ?? '');
    setReferenceDoctor(issue.referenceDoctor ?? '');
    setTechnician(issue.technician ?? '');
    setBloodQty(issue.bloodQty ?? '');
    setNote(issue.note ?? '');
    // Show the effective rate rather than 0, so saving without touching the
    // field does not silently wipe an existing discount.
    setDiscountPct(
      issue.subtotal > 0 ? String(Math.round((issue.discount / issue.subtotal) * 10000) / 100) : '0',
    );
    setApiError(null);
  }, [open, issue]);

  async function save() {
    if (!issue) return;
    setApiError(null);
    try {
      await update.mutateAsync({
        id: issue.id,
        input: {
          consultantId: consultantId || null,
          referenceDoctor,
          technician,
          bloodQty,
          note,
          discountPct: Number(discountPct) || 0,
        },
      });
      onClose();
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  return (
    <FormDrawer
      open={open}
      title={`Edit ${title} Issue${issue ? ` — ${issue.billNo}` : ''}`}
      onClose={onClose}
      onSubmit={save}
      submitting={update.isPending}
      wide
    >
      {apiError && (
        <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
          {apiError}
        </p>
      )}

      <p className="mb-4 rounded-sm bg-info/5 px-3 py-2 text-xs text-fg-muted">
        The bag on this issue cannot be changed here — it is already recorded
        against this patient. To issue a different bag, delete this issue (the
        bag returns to stock) and raise a new one.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Referral Doctor">
          <Select
            value={consultantId}
            onChange={(e) => setConsultantId(e.target.value)}
            placeholder="Select…"
            options={doctors.map((d) => ({ value: d.id, label: d.name }))}
          />
        </Field>
        <Field label="Doctor Name">
          <TextInput value={referenceDoctor} onChange={(e) => setReferenceDoctor(e.target.value)} />
        </Field>

        <Field label="Technician">
          <TextInput value={technician} onChange={(e) => setTechnician(e.target.value)} />
        </Field>
        <Field label="Blood Quantity">
          <TextInput value={bloodQty} onChange={(e) => setBloodQty(e.target.value)} />
        </Field>

        <Field label="Discount (%)">
          <TextInput
            type="number"
            min="0"
            max="100"
            value={discountPct}
            onChange={(e) => setDiscountPct(e.target.value)}
          />
        </Field>

        <Field label="Note" className="col-span-2">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </FormDrawer>
  );
}
