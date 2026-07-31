'use client';

import { useEffect, useState } from 'react';
import type { InvoiceDto } from '@smart-hospital/shared';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { useDoctors } from '@/lib/hooks/use-clinical';
import { useUpdatePharmacyBill } from '@/lib/hooks/use-departments';
import { ApiRequestError } from '@/lib/api';

/**
 * Edit an existing Pharmacy bill.
 *
 * Header plus the bill-level discount only — the dispensed lines are fixed.
 * Selling a medicine decrements its stock, so re-saving lines would have to
 * reconcile every quantity change against the shelf, and getting that wrong
 * corrupts the count silently. To change what was dispensed, delete the bill
 * (which returns the stock) and raise a new one.
 */
export function PharmacyBillEditModal({
  bill,
  open,
  onClose,
}: {
  bill: InvoiceDto | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: doctors = [] } = useDoctors();
  const update = useUpdatePharmacyBill();

  const [consultantId, setConsultantId] = useState('');
  const [referenceDoctor, setReferenceDoctor] = useState('');
  const [note, setNote] = useState('');
  const [discountPct, setDiscountPct] = useState('0');
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !bill) return;
    setConsultantId(bill.consultantId ?? '');
    setReferenceDoctor(bill.referenceDoctor ?? '');
    setNote(bill.note ?? '');
    // Show the effective rate rather than 0, so saving without touching the
    // field does not silently wipe an existing discount.
    setDiscountPct(
      bill.subtotal > 0 ? String(Math.round((bill.discount / bill.subtotal) * 10000) / 100) : '0',
    );
    setApiError(null);
  }, [open, bill]);

  async function save() {
    if (!bill) return;
    setApiError(null);
    try {
      await update.mutateAsync({
        id: bill.id,
        input: {
          consultantId: consultantId || null,
          referenceDoctor,
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
      title={`Edit Bill${bill ? ` — ${bill.billNo}` : ''}`}
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
        Medicines on this bill cannot be changed here — the stock has already
        been taken off the shelf against them. Delete this bill (the stock is
        returned) and raise a new one to change what was dispensed.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Doctor">
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
