'use client';

import { Pencil, Printer, X } from 'lucide-react';
import { useBirth } from '@/lib/hooks/use-office';
import { printBirthRecord } from '@/lib/print';

/** "Birth Record Details" — full field grid + photo/initials Attachments row, matching the demo. */
export function BirthRecordDetailsModal({ id, open, onClose, onEdit }: { id: string | null; open: boolean; onClose: () => void; onEdit: () => void }) {
  const { data, isLoading } = useBirth(open ? id : null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div role="dialog" aria-modal="true" aria-label="Birth Record Details" className="relative z-10 w-full max-w-4xl rounded-md bg-surface shadow-xl">
        <div className="flex items-center justify-between rounded-t-md bg-primary px-5 py-3 text-primary-fg">
          <h2 className="text-base font-semibold">Birth Record Details</h2>
          <div className="flex items-center gap-2">
            {data && (
              <>
                <button onClick={() => printBirthRecord(data)} aria-label="Print" className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-white/10">
                  <Printer className="h-4 w-4" />
                </button>
                <button onClick={onEdit} aria-label="Edit" className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-white/10">
                  <Pencil className="h-4 w-4" />
                </button>
              </>
            )}
            <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
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
      </div>
    </div>
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
