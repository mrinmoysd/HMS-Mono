'use client';

import { Pencil, Printer } from 'lucide-react';
import { IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useDeath } from '@/lib/hooks/use-office';
import { printDeathRecord } from '@/lib/print';

/** "Death Record Details" — field grid with computed Age + Address resolved from the linked patient. */
export function DeathRecordDetailsModal({ id, open, onClose, onEdit }: { id: string | null; open: boolean; onClose: () => void; onEdit: () => void }) {
  const { data, isLoading } = useDeath(open ? id : null);

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Death Record Details"
      size="lg"
      headerActions={
        data ? (
          <>
            <IconButton label="Print record" tone="primary" onClick={() => printDeathRecord(data)}>
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
