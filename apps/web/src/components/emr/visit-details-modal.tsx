'use client';

import { useEffect, useState } from 'react';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { formatAge } from '@/lib/utils';
import { useConfirmDelete } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useOpdVisitDetail, useDeleteOpdVisit } from '@/lib/hooks/use-clinical';
import { VisitEditForm } from './visit-edit-form';

/** Read-only OPD Visit Details modal, with an inline Edit mode (Patient Visit parity V0/V1). */
export function VisitDetailsModal({
  id,
  open,
  onClose,
  canEdit,
  canDelete,
}: {
  id: string | null;
  open: boolean;
  onClose: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const { data, isLoading } = useOpdVisitDetail(open ? id : null);
  const del = useDeleteOpdVisit();
  const confirmDelete = useConfirmDelete();
  const toast = useToast();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);

  if (!open) return null;

  async function onDelete() {
    if (!data) return;
    if (!(await confirmDelete(`visit ${data.opdNo}`))) return;
    try {
      await del.mutateAsync(data.id);
      toast.success(`Visit ${data.opdNo} deleted`);
      onClose();
    } catch (e) {
      toast.error('Could not delete visit', { description: (e as Error).message });
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit Visit' : 'Visit Details'}
      size="lg"
      headerActions={
        <>
          {data && canEdit && !editing && (
              <button onClick={() => setEditing(true)} aria-label="Edit" className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {data && canDelete && !editing && (
              <button onClick={onDelete} aria-label="Delete" disabled={del.isPending} className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger disabled:opacity-40">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
        </>
      }
    >
      {isLoading || !data ? (
        <div className="flex items-center justify-center py-12 text-fg-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : editing ? (
        <VisitEditForm visit={data} onCancel={() => setEditing(false)} onDone={() => setEditing(false)} />
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          <Row label="OPD No" value={data.opdNo} />
          <Row label="Case ID" value={data.caseNo ?? '—'} />
          <Row label="Patient Name" value={data.patientName} />
          <Row label="Old Patient" value={data.oldPatient ? 'Yes' : 'No'} />
          <Row label="Guardian" value={data.guardianName ?? '—'} />
          <Row label="Gender" value={data.gender ?? '—'} />
          <Row label="Marital Status" value={data.maritalStatus ?? '—'} />
          <Row label="Phone" value={data.phone ?? '—'} />
          <Row label="Email" value={data.email ?? '—'} />
          <Row label="Address" value={data.address ?? '—'} />
          <Row label="Age" value={formatAge(data.age)} />
          <Row label="Blood Group" value={data.bloodGroup ?? '—'} />
          <Row label="Known Allergies" value={data.knownAllergies ?? '—'} />
          <Row label="Appointment Date" value={new Date(data.appointmentDate).toLocaleString()} />
          <Row label="Casualty" value={data.casualty ? 'Yes' : 'No'} />
          <Row label="Reference" value={data.reference ?? '—'} />
          <Row label="TPA" value={data.tpaName ? `${data.tpaName}${data.tpaIdNo ? ` · ${data.tpaIdNo}` : ''}` : '—'} />
          <Row label="Consultant Doctor" value={data.consultantName} />
          <Row label="Is Antenatal" value={data.isAntenatal ? 'Yes' : 'No'} />
          <Row label="Apply TPA" value={data.applyTpa ? 'Yes' : 'No'} />
          <Row label="Live Consultation" value={data.liveConsult ? 'Yes' : 'No'} />
          <Row label="Note" value={data.note ?? '—'} />
          <Row label="Symptoms Type" value={data.symptomType ?? '—'} />
          <Row label="Symptoms" value={data.symptoms ?? '—'} />
          <Row label="Symptoms Description" value={data.symptomDescription ?? '—'} />
          <Row label="ICD-10 Group" value={data.icd10Group ?? '—'} />
          <Row label="ICD-10 Diagnosis" value={data.icd10Diagnosis ?? '—'} />
          <Row label="Previous Medical Issue" value={data.previousMedicalIssue ?? '—'} />
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-2">
      <span className="text-fg-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
