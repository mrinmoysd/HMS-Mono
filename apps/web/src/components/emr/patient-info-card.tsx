'use client';

import { UserRound } from 'lucide-react';
import { formatAge } from '@/lib/utils';
import { usePatient } from '@/lib/hooks/use-patients';

/**
 * Read-only patient card on the OPD New Visit and IPD Admission forms
 * (blueprint §7.2, §8.2 — left column, above the Symptoms block).
 *
 * It exists so the person filling the form can confirm they picked the right
 * patient without leaving it. Two patients with the same name is ordinary, and
 * a wrong pick here attaches a visit — and its bill — to the wrong record.
 *
 * Read-only on purpose: this is the patient master, and correcting it belongs
 * on the patient screen, not buried in a visit form.
 */
export function PatientInfoCard({ patientId }: { patientId: string }) {
  const { data: p, isLoading } = usePatient(patientId);

  if (!patientId) return null;
  if (isLoading || !p) {
    return (
      <div className="rounded-md border border-border bg-surface-sunken p-4 text-sm text-fg-muted">
        Loading patient…
      </div>
    );
  }

  const fields: [string, string | null][] = [
    ['Guardian', p.guardianName],
    ['Gender', p.gender],
    ['Blood Group', p.bloodGroup],
    ['Marital Status', p.maritalStatus],
    ['Age', formatAge(p.age)],
    ['Phone', p.phone],
    ['Email', p.email],
    ['Address', p.address],
    ['TPA', p.tpaName],
    ['TPA ID', p.tpaIdNo],
    ['TPA Validity', p.tpaValidity ? new Date(p.tpaValidity).toLocaleDateString() : null],
    ['National ID', p.nationalId],
    ['Any Known Allergies', p.allergies],
    ['Remarks', p.remarks],
  ];

  return (
    <div className="rounded-md border border-border bg-surface-sunken p-4">
      <div className="mb-3 flex items-center gap-3">
        {p.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <UserRound className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{p.name}</p>
          <p className="text-xs text-fg-muted">{p.patientNo}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
        {fields.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="break-words font-medium">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
