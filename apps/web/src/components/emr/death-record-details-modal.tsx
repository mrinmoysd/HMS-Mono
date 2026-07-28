'use client';

import { Pencil, Printer, X } from 'lucide-react';
import { useDeath } from '@/lib/hooks/use-office';
import { printDeathRecord } from '@/lib/print';

/** "Death Record Details" — field grid with computed Age + Address resolved from the linked patient. */
export function DeathRecordDetailsModal({ id, open, onClose, onEdit }: { id: string | null; open: boolean; onClose: () => void; onEdit: () => void }) {
  const { data, isLoading } = useDeath(open ? id : null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div role="dialog" aria-modal="true" aria-label="Death Record Details" className="relative z-10 w-full max-w-3xl rounded-md bg-surface shadow-xl">
        <div className="flex items-center justify-between rounded-t-md bg-primary px-5 py-3 text-primary-fg">
          <h2 className="text-base font-semibold">Death Record Details</h2>
          <div className="flex items-center gap-2">
            {data && (
              <>
                <button onClick={() => printDeathRecord(data)} aria-label="Print" className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-white/10">
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
            <div>
              <h3 className="mb-2 text-sm font-semibold">Death Record Details</h3>
              <div className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
                <Row label="Reference No" value={data.referenceNo} />
                <Row label="Case ID" value={data.caseNo ?? '—'} />
                <Row label="Death Date" value={new Date(data.deathDate).toLocaleString()} />
                <Row label="Gender" value={data.gender ?? '—'} />
                <Row label="Patient Name" value={data.patientName} />
                <Row label="Age" value={data.age ?? '—'} />
                <Row label="Guardian Name" value={data.guardianName ?? '—'} />
                <Row label="Address" value={data.address ?? '—'} />
                <Row label="Blood Group" value={data.bloodGroup ?? '—'} />
                <Row label="Attachment" value={data.attachmentUrl ? 'Attached' : '—'} />
              </div>
              {data.cause && (
                <div className="mt-2 border-t border-border/50 pt-2 text-sm">
                  <span className="text-fg-muted">Death Report</span>
                  <p className="mt-1">{data.cause}</p>
                </div>
              )}
            </div>
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
