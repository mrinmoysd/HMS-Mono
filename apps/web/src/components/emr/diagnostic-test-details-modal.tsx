'use client';

import { Pencil, Trash2 } from 'lucide-react';
import type { DiagnosticTestDto, Modality } from '@smart-hospital/shared';
import { useAbility } from '@/lib/auth-store';
import { Modal } from '@/components/ui/modal';

interface Props {
  test: DiagnosticTestDto | null;
  modality: Modality;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Read-only "Test Details" view (Pathology/Radiology Test list row action). */
export function DiagnosticTestDetailsModal({ test, modality, open, onClose, onEdit, onDelete }: Props) {
  const ability = useAbility();
  const canEdit = ability.can(modality, 'edit');
  const canDelete = ability.can(modality, 'delete');

  if (!open || !test) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title="Test Details"
      size="xl"
      headerActions={
        <>
          {canEdit && (
              <button onClick={onEdit} aria-label="Edit" className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {canDelete && (
              <button onClick={onDelete} aria-label="Delete" className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          <Row label="Test Name" value={test.name} />
          <Row label="Short Name" value={test.shortName ?? '—'} />
          <Row label="Test Type" value={test.testType ?? '—'} />
          <Row label="Sub Category" value={test.subCategory ?? '—'} />
          <Row label="Report Days" value={String(test.reportDays)} />
          <Row label="Method" value={test.method ?? '—'} />
          <Row label="Category Name" value={test.categoryName ?? '—'} />
          <Row label="Charge Name" value={test.chargeName ?? '—'} />
          <Row label="Charge Category" value={test.chargeCategoryName ?? '—'} />
          {/* This row used to be labelled "Tax Category" while showing the
              percentage — the reference shows both, separately. */}
          <Row label="Tax Category" value={test.taxCategoryName ?? '—'} />
          <Row label="Tax (%)" value={`${test.taxPercent.toFixed(2)}%`} />
          <Row label="Standard Charge" value={`#${test.standardCharge.toFixed(2)}`} />
          <Row label="Amount" value={`#${test.charge.toFixed(2)}`} />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Charge Category Details :</h3>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                  <th className="px-3 py-2 font-semibold">Test Parameter Name</th>
                  <th className="px-3 py-2 font-semibold">Reference Range</th>
                  <th className="px-3 py-2 font-semibold">Unit</th>
                </tr>
              </thead>
              <tbody>
                {test.parameters.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-6 text-center text-fg-muted">No parameters</td></tr>
                )}
                {test.parameters.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 font-medium">{p.parameterName}</td>
                    <td className="px-3 py-2">{p.referenceRange ?? '—'}</td>
                    <td className="px-3 py-2">{p.unit ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-1.5 text-sm">
      <span className="text-fg-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
