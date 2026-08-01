'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Printer, Pencil, Trash2 } from 'lucide-react';
import { Tabs } from '@/components/ui/tabs';
import { Button, IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useConfirmDelete } from '@/components/ui/confirm-dialog';
import { formatAge } from '@/lib/utils';
import { printEncounterBill } from '@/lib/print';
import { ChargesTab } from '@/components/emr/charges-tab';
import { PaymentsTab } from '@/components/emr/payments-tab';
import { DetailPageShell, type RailItem } from '@/components/emr/detail-page-shell';
import { EncounterOverview } from '@/components/emr/encounter-overview';
import { VisitEditForm } from '@/components/emr/visit-edit-form';
import { LabTab } from '@/components/emr/lab-tab';
import { PrescriptionTab } from '@/components/emr/prescription-tab';
import { MedicationTab } from '@/components/emr/medication-tab';
import { OperationsTab } from '@/components/emr/operations-tab';
import { LiveConsultTab } from '@/components/emr/live-consult-tab';
import { CurrentVitals } from '@/components/emr/current-vitals';
import { VitalsTab } from '@/components/emr/vitals-tab';
import { TimelineTab } from '@/components/emr/timeline-tab';
import { EncounterVisitTable } from '@/components/emr/visit-table';
import { CheckupsTab } from '@/components/emr/checkups-tab';
import { useEncounterBilling } from '@/lib/hooks/use-encounter-billing';
import { usePatientProfile } from '@/lib/hooks/use-emr';
import { useOpdVisits, useOpdVisitDetail, useDeleteOpdVisit } from '@/lib/hooks/use-clinical';
import { useAbility } from '@/lib/auth-store';

type Tab =
  | 'overview' | 'visits' | 'vitals' | 'lab' | 'prescription' | 'medication'
  | 'operations' | 'liveconsult' | 'charges' | 'payments' | 'timeline' | 'treatment';

export default function OpdDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const ability = useAbility();
  const canEdit = ability.can('billing', 'edit');
  const canEditClinical = ability.can('patient', 'edit');
  const canEditOpd = ability.can('opd', 'edit');
  const canDeleteOpd = ability.can('opd', 'delete');
  const { data, isLoading } = useEncounterBilling('opd', id);
  const { data: visit } = useOpdVisitDetail(id);
  const { data: profile } = usePatientProfile(data?.header.patientId ?? '');
  // Today's clinic populates the left rail — the switcher, not a list.
  const { data: today, isLoading: railLoading } = useOpdVisits('today', { page: 1, size: 100 });
  const del = useDeleteOpdVisit();
  const confirmDelete = useConfirmDelete();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);

  if (isLoading || !data) return <div className="p-8 text-sm text-fg-muted">Loading OPD visit…</div>;
  const h = data.header;
  const scope = { patientId: h.patientId, encounterType: 'opd' as const, encounterId: id };

  const rail: RailItem[] = (today?.data ?? []).map((v) => ({
    id: v.id,
    encounterNo: v.opdNo,
    patientName: v.patientName,
    subtitle: v.caseNo,
  }));

  async function onDelete() {
    if (!(await confirmDelete(`visit ${h.encounterNo}`))) return;
    try {
      await del.mutateAsync(id);
      toast.success(`${h.encounterNo} deleted`);
      router.push('/opd');
    } catch (e) {
      toast.error('Could not delete visit', { description: (e as Error).message });
    }
  }

  return (
    <DetailPageShell
      railTitle="Today OPD"
      items={rail}
      loading={railLoading}
      activeId={id}
      hrefFor={(i) => `/opd/${i.id}`}
      searchPlaceholder="Search OPD / ID / Name"
      breadcrumb={
        <>
          <Link href="/opd" className="hover:underline">OPD</Link>
          {' / '}
          <span className="text-fg">{h.caseNo ?? '—'}</span>
          {' · '}
          <Link href={`/patient/${h.patientId}`} className="text-primary hover:underline">{h.patientName}</Link>
        </>
      }
    >
      <div className="rounded-md border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
              {h.patientName.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="text-lg font-semibold">
                <Link href={`/patient/${h.patientId}`} className="hover:underline">{h.patientName}</Link>
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                {h.caseNo ?? '—'} · {h.encounterNo} · {visit?.gender ?? '—'} · {visit ? formatAge(visit.age) : '—'}
              </p>
              <p className="text-sm text-fg-muted">{h.consultantName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEditOpd && (
              <IconButton label="Edit visit" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
              </IconButton>
            )}
            <Button size="sm" variant="secondary" onClick={() => printEncounterBill(data, 'OPD')}><Printer className="h-4 w-4" /> Print Bill</Button>
            {canDeleteOpd && (
              <IconButton label="Delete visit" tone="danger" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </IconButton>
            )}
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
          { value: 'visits', label: 'Visits' },
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
        <div className="space-y-4">
          <EncounterOverview
            encounterModule="opd"
            barcodeValue={h.encounterNo}
            billingSummary={data.billingSummary}
            fields={[
              { label: 'Patient', value: h.patientName },
              { label: 'Case ID', value: h.caseNo },
              { label: 'OPD No', value: h.encounterNo },
              { label: 'Gender', value: visit?.gender },
              { label: 'Age', value: visit ? formatAge(visit.age) : null },
              { label: 'Phone', value: visit?.phone },
              { label: 'Guardian Name', value: visit?.guardianName },
              { label: 'TPA', value: visit?.tpaName },
              { label: 'TPA ID', value: visit?.tpaIdNo },
              {
                label: 'TPA Validity',
                value: visit?.tpaValidity ? new Date(visit.tpaValidity).toLocaleDateString() : null,
              },
            ]}
          />
          {/* The clinical read-outs the Overview carried before the info grid
              landed. Kept below it rather than dropped — they are the reason
              a doctor opens this tab, where the grid is for the front desk. */}
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
            </div>
            <div className="rounded-md border border-border bg-surface p-5">
              <p className="mb-2 text-sm font-semibold">Timeline</p>
              <TimelineTab patientId={h.patientId} entries={profile?.timeline ?? []} canEdit={canEditClinical} compact />
            </div>
          </div>
        </div>
      )}
      {tab === 'visits' && (
        <CheckupsTab visitId={id} opdNo={h.encounterNo} canEdit={canEditClinical} />
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

      {editing && visit && (
        <Modal open onClose={() => setEditing(false)} title={`Edit ${visit.opdNo}`} size="lg">
          <VisitEditForm visit={visit} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </DetailPageShell>
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
