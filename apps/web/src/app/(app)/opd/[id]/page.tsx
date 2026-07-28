'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Printer } from 'lucide-react';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { printEncounterBill } from '@/lib/print';
import { ChargesTab } from '@/components/emr/charges-tab';
import { PaymentsTab } from '@/components/emr/payments-tab';
import { BillingSummaryBars } from '@/components/emr/billing-summary-bars';
import { LabTab } from '@/components/emr/lab-tab';
import { PrescriptionTab } from '@/components/emr/prescription-tab';
import { MedicationTab } from '@/components/emr/medication-tab';
import { OperationsTab } from '@/components/emr/operations-tab';
import { LiveConsultTab } from '@/components/emr/live-consult-tab';
import { CurrentVitals } from '@/components/emr/current-vitals';
import { VitalsTab } from '@/components/emr/vitals-tab';
import { TimelineTab } from '@/components/emr/timeline-tab';
import { EncounterVisitTable } from '@/components/emr/visit-table';
import { useEncounterBilling } from '@/lib/hooks/use-encounter-billing';
import { usePatientProfile } from '@/lib/hooks/use-emr';
import { useAbility } from '@/lib/auth-store';

type Tab =
  | 'overview' | 'vitals' | 'lab' | 'prescription' | 'medication'
  | 'operations' | 'liveconsult' | 'charges' | 'payments' | 'timeline' | 'treatment';

export default function OpdDetailPage() {
  const { id } = useParams<{ id: string }>();
  const ability = useAbility();
  const canEdit = ability.can('billing', 'edit');
  const canEditClinical = ability.can('patient', 'edit');
  const { data, isLoading } = useEncounterBilling('opd', id);
  const { data: profile } = usePatientProfile(data?.header.patientId ?? '');
  const [tab, setTab] = useState<Tab>('overview');

  if (isLoading || !data) return <div className="p-8 text-sm text-fg-muted">Loading OPD visit…</div>;
  const h = data.header;
  const scope = { patientId: h.patientId, encounterType: 'opd' as const, encounterId: id };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold">OPD Visit <span className="text-fg-muted">{h.encounterNo}</span></p>
            <table className="mt-2 text-sm">
              <tbody className="[&_td]:py-0.5 [&_td:first-child]:pr-6 [&_td:first-child]:text-fg-muted">
                <tr><td>Patient</td><td><Link href={`/patient/${h.patientId}`} className="font-medium text-primary hover:underline">{h.patientName}</Link></td></tr>
                <tr><td>Case ID</td><td>{h.caseNo ?? '—'}</td></tr>
                <tr><td>Consultant</td><td>{h.consultantName}</td></tr>
                <tr><td>Date</td><td>{new Date(h.date).toLocaleDateString()}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Button size="sm" variant="secondary" onClick={() => printEncounterBill(data, 'OPD')}><Printer className="h-4 w-4" /> Print Bill</Button>
            <div className="flex gap-3">
              <Chip label="Net" value={data.netAmount} />
              <Chip label="Paid" value={data.paid} accent="text-success" />
              <Chip label="Balance" value={data.balance} accent={data.balance > 0 ? 'text-warning' : 'text-success'} />
            </div>
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'vitals', label: 'Vitals' },
          { value: 'lab', label: 'Lab Investigation' },
          { value: 'prescription', label: 'Prescription' },
          { value: 'medication', label: 'Medication' },
          { value: 'operations', label: 'Operations' },
          { value: 'liveconsult', label: 'Live Consultation' },
          { value: 'charges', label: 'Charges' },
          { value: 'payments', label: 'Payments' },
          { value: 'timeline', label: 'Timeline' },
          { value: 'treatment', label: 'Treatment History' },
        ]}
        value={tab}
        onChange={(t) => setTab(t as Tab)}
      />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-4 rounded-md border border-border bg-surface p-5">
            <Section title="Current Vitals">{profile ? <CurrentVitals vitals={profile.currentVitals} bmi={profile.bmi} /> : <Muted />}</Section>
            <Section title="Findings">
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {(profile?.findings ?? []).map((f) => <li key={f.id}>{f.text}</li>)}
                {(!profile || profile.findings.length === 0) && <li className="list-none text-fg-muted">None</li>}
              </ul>
            </Section>
            <Section title="Symptoms">
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {(profile?.symptoms ?? []).map((s) => <li key={s.id}><b>{s.title}</b>{s.description ? ` — ${s.description}` : ''}</li>)}
                {(!profile || profile.symptoms.length === 0) && <li className="list-none text-fg-muted">None</li>}
              </ul>
            </Section>
            <Section title="Consultant Doctor">
              <div className="space-y-1 text-sm">
                {(profile?.consultants ?? []).map((c) => <div key={c.id}>{c.name}</div>)}
                {(!profile || profile.consultants.length === 0) && <p className="text-fg-muted">{h.consultantName}</p>}
              </div>
            </Section>
          </div>
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-surface p-5">
              <p className="mb-3 text-sm font-semibold">Billing Summary (by department)</p>
              <BillingSummaryBars rows={data.billingSummary} />
            </div>
            <div className="rounded-md border border-border bg-surface p-5">
              <p className="mb-2 text-sm font-semibold">Timeline</p>
              <TimelineTab patientId={h.patientId} entries={profile?.timeline ?? []} canEdit={canEditClinical} compact />
            </div>
          </div>
        </div>
      )}
      {tab === 'vitals' && <VitalsTab patientId={h.patientId} canEdit={canEditClinical} />}
      {tab === 'lab' && <LabTab scope={scope} canEdit={canEditClinical} patientName={h.patientName} />}
      {tab === 'prescription' && <PrescriptionTab scope={scope} canEdit={canEditClinical} patientName={h.patientName} />}
      {tab === 'medication' && <MedicationTab scope={scope} canEdit={canEditClinical} />}
      {tab === 'operations' && <OperationsTab scope={scope} canEdit={canEditClinical} />}
      {tab === 'liveconsult' && <LiveConsultTab scope={scope} canEdit={canEditClinical} />}
      {tab === 'charges' && <ChargesTab type="opd" id={id} data={data} canEdit={canEdit} />}
      {tab === 'payments' && <PaymentsTab type="opd" id={id} data={data} canEdit={canEdit} />}
      {tab === 'timeline' && <div className="rounded-md border border-border bg-surface p-5"><TimelineTab patientId={h.patientId} entries={profile?.timeline ?? []} canEdit={canEditClinical} /></div>}
      {tab === 'treatment' && <div className="rounded-md border border-border bg-surface p-5"><h2 className="mb-3 text-lg font-semibold">Treatment History</h2><EncounterVisitTable rows={profile?.treatmentHistory ?? []} /></div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-3 first:border-0 first:pt-0">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">{title}</p>
      {children}
    </div>
  );
}
function Muted() { return <p className="text-sm text-fg-muted">—</p>; }

function Chip({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-md border border-border px-3 py-2 text-center">
      <p className="text-xs text-fg-muted">{label}</p>
      <p className={`tabular text-base font-semibold ${accent ?? ''}`}>{value.toFixed(2)}</p>
    </div>
  );
}
