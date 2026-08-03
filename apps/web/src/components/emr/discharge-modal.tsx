'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { IpdAdmissionDetailDto } from '@smart-hospital/shared';
import { dischargeSchema } from '@smart-hospital/shared';
import { Modal } from '@/components/ui/modal';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { useDischarge, useIpdAdmissionDetail } from '@/lib/hooks/use-ipd';
import { ApiRequestError } from '@/lib/api';

const STATUS_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'referral', label: 'Referral' },
  { value: 'death', label: 'Death' },
];

/**
 * `yyyy-mm-ddThh:mm` for now, in local time. Never toISOString — that is UTC
 * and lands the discharge on the wrong day either side of midnight.
 */
function localNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Patient Discharge (blueprint §8.5). Discharging frees the bed and closes the
 * admission, so it collects the discharge card here rather than behind a
 * yes/no prompt — there is no second chance to fill these in from the ward.
 */
export function DischargeModal({
  admission,
  open,
  onClose,
  onDone,
}: {
  admission: IpdAdmissionDetailDto;
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const discharge = useDischarge();
  const [dischargeDate, setDischargeDate] = useState(localNow());
  const [status, setStatus] = useState('');
  const [operation, setOperation] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [investigation, setInvestigation] = useState('');
  const [treatmentHome, setTreatmentHome] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  /** Drop a field's error as soon as it is answered, rather than at next submit. */
  function clearError(key: string) {
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  }

  async function submit() {
    setApiError(null);
    const parsed = dischargeSchema.safeParse({
      dischargeDate,
      dischargeStatus: status,
      operation,
      diagnosis,
      investigation,
      treatmentHome,
      note,
    });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const i of parsed.error.issues) fe[String(i.path[0] ?? '')] = i.message;
      setErrors(fe);
      return;
    }
    try {
      await discharge.mutateAsync({ id: admission.id, input: parsed.data });
      onDone?.();
      onClose();
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.error.message : 'Discharge failed');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Patient Discharge — ${admission.patientName}`} size="lg">
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-sm bg-warning/10 px-3 py-2 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Check the patient bill before discharging. {admission.ipdNo} is closed and bed{' '}
            {admission.bedLabel} is freed for reuse — outstanding balance is{' '}
            <b>{admission.balance.toFixed(2)}</b>.
          </span>
        </p>

        {apiError && (
          <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
            {apiError}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Discharge Date" required error={errors.dischargeDate}>
            <TextInput
              type="datetime-local"
              value={dischargeDate}
              onChange={(e) => { setDischargeDate(e.target.value); clearError('dischargeDate'); }}
            />
          </Field>
          <Field label="Discharge Status" required error={errors.dischargeStatus}>
            <Select
              value={status}
              onChange={(e) => { setStatus(e.target.value); clearError('dischargeStatus'); }}
              placeholder="Select…"
              options={STATUS_OPTIONS}
            />
          </Field>
        </div>

        {/* Rule #7: this is the one place the deceased flag gets set. */}
        {status === 'death' && (
          <p className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
            {admission.patientName} will be marked deceased. New OPD, IPD and lab records can no
            longer be started for this patient.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Operation">
            <TextArea rows={3} value={operation} onChange={(e) => setOperation(e.target.value)} />
          </Field>
          <Field label="Diagnosis">
            <TextArea rows={3} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </Field>
          <Field label="Investigation">
            <TextArea rows={3} value={investigation} onChange={(e) => setInvestigation(e.target.value)} />
          </Field>
          <Field label="Treatment / Home Remedy">
            <TextArea rows={3} value={treatmentHome} onChange={(e) => setTreatmentHome(e.target.value)} />
          </Field>
        </div>

        <Field label="Note">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={discharge.isPending}>
            {discharge.isPending ? 'Discharging…' : 'Discharge'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * List-page entry point: the IPD list only holds `IpdAdmissionDto`, which has
 * none of the identity fields the card needs, so the detail is fetched once the
 * user actually asks to discharge.
 */
export function DischargeModalById({
  admissionId,
  onClose,
  onDone,
}: {
  admissionId: string;
  onClose: () => void;
  onDone?: () => void;
}) {
  const { data } = useIpdAdmissionDetail(admissionId);
  if (!data) return null;
  return <DischargeModal admission={data} open onClose={onClose} onDone={onDone} />;
}
