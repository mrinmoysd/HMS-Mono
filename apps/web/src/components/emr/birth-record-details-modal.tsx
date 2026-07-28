'use client';

import { Pencil, Printer } from 'lucide-react';
import { IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useBirth } from '@/lib/hooks/use-office';
import { printBirthRecord } from '@/lib/print';

/** "Birth Record Details" — full field grid + photo/initials Attachments row, matching the demo. */
export function BirthRecordDetailsModal({ id, open, onClose, onEdit }: { id: string | null; open: boolean; onClose: () => void; onEdit: () => void }) {
  const { data, isLoading } = useBirth(open ? id : null);

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Birth Record Details"
      size="xl"
      headerActions={
        data ? (
          <>
            <IconButton label="Print record" tone="primary" onClick={() => printBirthRecord(data)}>
              <Printer className="h-4 w-4" />
            </IconButton>
            <IconButton label="Edit record" tone="primary" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </IconButton>
          </>
        ) : null
      }
    >
      <div className="space-y-5">
          {isLoading || !data ? (
            <p className="py-12 text-center text-sm text-fg-muted">Loading…</p>
          ) : (
            <>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Birth Record Details</h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
                  <Row label="Case ID" value={data.caseNo ?? '—'} />
                  <Row label="Birth Date" value={new Date(data.birthDate).toLocaleString()} />
                  <Row label="Weight" value={data.weight ?? '—'} />
                  <Row label="Gender" value={data.gender ?? '—'} />
                  <Row label="Phone" value={data.phone ?? '—'} />
                  <Row label="Address" value={data.address ?? '—'} />
                  <Row label="Blood Group" value={data.bloodGroup ?? '—'} />
                  <Row label="Document" value={data.documentUrl ? 'Attached' : '—'} />
                </div>
                {data.report && (
                  <div className="mt-2 border-t border-border/50 pt-2 text-sm">
                    <span className="text-fg-muted">Report</span>
                    <p className="mt-1">{data.report}</p>
                  </div>
                )}
              </div>

              <div className="rounded-md border border-border p-4">
                <h3 className="mb-3 text-sm font-semibold">Attachments</h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <Avatar photoUrl={data.childPhotoUrl} label="Child Name" name={data.childName} />
                  <Avatar photoUrl={data.motherPhotoUrl} label="Mother Name" name={data.motherName ?? (data.patientNo ? `Patient (${data.patientNo})` : '—')} />
                  <Avatar photoUrl={data.fatherPhotoUrl} label="Father Name" name={data.fatherName ?? '—'} />
                </div>
              </div>
            </>
          )}
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/50 py-1.5">
      <span className="text-xs uppercase tracking-wide text-fg-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Avatar({ photoUrl, label, name }: { photoUrl: string | null; label: string; name: string }) {
  const initial = name && name !== '—' ? name.charAt(0).toUpperCase() : '?';
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={label} className="h-20 w-20 rounded-md object-cover" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-md bg-primary text-2xl font-semibold text-primary-fg">{initial}</div>
      )}
      <div>
        <p className="text-xs text-fg-muted">{label}</p>
        <p className="text-sm font-medium">{name}</p>
      </div>
    </div>
  );
}
