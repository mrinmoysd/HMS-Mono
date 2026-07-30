'use client';

import { useEffect, useState } from 'react';
import type { InvoiceDto, Modality } from '@smart-hospital/shared';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { useDoctors } from '@/lib/hooks/use-clinical';
import { useUpdateDiagnosticBill } from '@/lib/hooks/use-departments';
import { ApiRequestError } from '@/lib/api';

/**
 * Edit an existing Pathology/Radiology bill.
 *
 * Scope is the bill's header plus its overall discount — deliberately not the
 * test lines. Every line has a matching LabInvestigation row carrying
 * reportValue, status, approvedById and approvedAt; re-saving the lines would
 * wipe collected samples and approved results. Adding or dropping a test means
 * raising a new bill, and the form says so rather than leaving people guessing.
 */
export function DiagnosticBillEditModal({
  bill,
  modality,
  open,
  onClose,
}: {
  bill: InvoiceDto | null;
  modality: Modality;
  open: boolean;
  onClose: () => void;
}) {
  const { data: doctors = [] } = useDoctors();
  const update = useUpdateDiagnosticBill(modality);

  const [consultantId, setConsultantId] = useState('');
  const [referenceDoctor, setReferenceDoctor] = useState('');
  const [prescriptionNo, setPrescriptionNo] = useState('');
  const [note, setNote] = useState('');
  const [previousReportValue, setPreviousReportValue] = useState('');
  const [discountPct, setDiscountPct] = useState('0');
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !bill) return;
    setConsultantId(bill.consultantId ?? '');
    setReferenceDoctor(bill.referenceDoctor ?? '');
    setPrescriptionNo(bill.prescriptionNo ?? '');
    setNote(bill.note ?? '');
    setPreviousReportValue(bill.previousReportValue ?? '');
    // Show the effective bill-level rate rather than 0, so saving without
    // touching the field does not silently wipe an existing discount.
    setDiscountPct(bill.subtotal > 0 ? String(Math.round((bill.discount / bill.subtotal) * 10000) / 100) : '0');
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
          prescriptionNo,
          note,
          previousReportValue,
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
        Tests on this bill cannot be changed here — their samples, results and
        approvals are already recorded against them. Raise a new bill to add or
        remove a test.
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

        <Field label="Prescription No">
          <TextInput value={prescriptionNo} onChange={(e) => setPrescriptionNo(e.target.value)} />
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
        <Field label="Previous Report Value" className="col-span-2">
          <TextInput
            value={previousReportValue}
            onChange={(e) => setPreviousReportValue(e.target.value)}
          />
        </Field>
      </div>
    </FormDrawer>
  );
}
