'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { moveToIpdSchema } from '@smart-hospital/shared';
import { Field, TextInput, Select } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { formatAge } from '@/lib/utils';
import { useOpdVisitDetail, useMoveToIpd, useDoctors } from '@/lib/hooks/use-clinical';
import { useBedGroups, useAvailableBeds } from '@/lib/hooks/use-ipd';
import { ApiRequestError } from '@/lib/api';

/** "Move Patient to IPD" — admits via the existing IPD engine, prefilled from the OPD visit (V4). */
export function MoveToIpdModal({ id, open, onClose }: { id: string | null; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { data, isLoading } = useOpdVisitDetail(open ? id : null);
  const { data: doctors = [] } = useDoctors();
  const { data: groups } = useBedGroups();
  const move = useMoveToIpd();

  const [consultantId, setConsultantId] = useState('');
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().slice(0, 10));
  const [bedGroupId, setBedGroupId] = useState('');
  const [bedId, setBedId] = useState('');
  const [creditLimit, setCreditLimit] = useState('20000');
  const [reference, setReference] = useState('');
  const [casualty, setCasualty] = useState(false);
  const [oldPatient, setOldPatient] = useState(false);
  const [isAntenatal, setIsAntenatal] = useState(false);
  const [liveConsult, setLiveConsult] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: beds = [] } = useAvailableBeds(bedGroupId || undefined);

  useEffect(() => {
    if (!data) return;
    setConsultantId(data.consultantId);
    setReference(data.reference ?? '');
    setCasualty(data.casualty);
    setOldPatient(data.oldPatient);
    setIsAntenatal(data.isAntenatal);
    setLiveConsult(data.liveConsult);
  }, [data]);

  useEffect(() => {
    if (!open) {
      setBedGroupId('');
      setBedId('');
      setCreditLimit('20000');
      setAdmissionDate(new Date().toISOString().slice(0, 10));
      setErrors({});
      setApiError(null);
    }
  }, [open]);

  if (!open) return null;

  async function submit() {
    setApiError(null);
    if (!id) return;
    const parsed = moveToIpdSchema.safeParse({
      consultantId,
      admissionDate,
      bedId,
      creditLimit,
      isAntenatal,
      casualty,
      oldPatient,
      liveConsult,
      reference,
    });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const i of parsed.error.issues) fe[String(i.path[0] ?? '')] = i.message;
      setErrors(fe);
      return;
    }
    try {
      const admission = await move.mutateAsync({ id, input: parsed.data });
      onClose();
      router.push(`/ipd/${admission.id}`);
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.error.message : 'Move failed');
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Move Patient to IPD"
      size="lg"
    >
      {isLoading || !data ? (
        <div className="flex items-center justify-center py-12 text-fg-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          {apiError && (
            <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
              {apiError}
            </p>
          )}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* LEFT: read-only patient + symptoms */}
            <div className="min-w-0 space-y-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Patient</p>
              <div className="space-y-1 rounded-sm border border-border bg-bg/40 p-3">
                <p className="font-medium">{data.patientName}</p>
                <p className="text-fg-muted">
                  {formatAge(data.age)} · {data.gender ?? '—'} · {data.bloodGroup ?? '—'}
                </p>
                <p className="text-fg-muted">OPD No: {data.opdNo}</p>
              </div>
              <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Symptoms</p>
              <div className="space-y-1 rounded-sm border border-border bg-bg/40 p-3">
                <p>{data.symptoms || 'None recorded'}</p>
                {data.symptomDescription && <p className="text-fg-muted">{data.symptomDescription}</p>}
                <p className="text-fg-muted">Previous Medical Issue: {data.previousMedicalIssue ?? '—'}</p>
              </div>
            </div>

            {/* RIGHT: IPD Details */}
            <div className="min-w-0 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">IPD Details</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Admission Date" required>
                  <TextInput type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} />
                </Field>
                <Field label="Consultant Doctor" required error={errors.consultantId}>
                  <Select
                    value={consultantId}
                    onChange={(e) => setConsultantId(e.target.value)}
                    placeholder="Select…"
                    options={doctors.map((d) => ({ value: d.id, label: d.name }))}
                  />
                </Field>
                <Field label="Bed Group">
                  <Select
                    value={bedGroupId}
                    onChange={(e) => {
                      setBedGroupId(e.target.value);
                      setBedId('');
                    }}
                    placeholder="All groups"
                    options={(groups?.data ?? []).map((g) => ({
                      value: g.id,
                      label: g.floorName ? `${g.floorName} · ${g.name}` : g.name,
                    }))}
                  />
                </Field>
                <Field label="Bed Number" required error={errors.bedId}>
                  <Select
                    value={bedId}
                    onChange={(e) => setBedId(e.target.value)}
                    placeholder={beds.length ? 'Select bed…' : 'No available beds'}
                    options={beds.map((b) => ({ value: b.id, label: `${b.bedGroupName} · ${b.bedNo}` }))}
                  />
                </Field>
                <Field label="Credit Limit">
                  <TextInput type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
                </Field>
                <Field label="Reference">
                  <TextInput value={reference} onChange={(e) => setReference(e.target.value)} />
                </Field>
              </div>
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={casualty} onChange={(e) => setCasualty(e.target.checked)} /> Casualty
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={oldPatient} onChange={(e) => setOldPatient(e.target.checked)} /> Old Patient
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isAntenatal} onChange={(e) => setIsAntenatal(e.target.checked)} /> Is For Antenatal
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={liveConsult} onChange={(e) => setLiveConsult(e.target.checked)} /> Live Consultation
                </label>
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} loading={move.isPending}>
              Move
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
