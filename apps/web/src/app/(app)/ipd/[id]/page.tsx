'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Printer, Pencil, Trash2, LogOut, List, FileText } from 'lucide-react';
import { Tabs } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/modal';
import { useConfirmDelete } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { formatAge } from '@/lib/utils';
import { printDischargeCard, printEncounterBill } from '@/lib/print';
import { ChargesTab } from '@/components/emr/charges-tab';
import { PaymentsTab } from '@/components/emr/payments-tab';
import { CreditDonut } from '@/components/emr/credit-donut';
import { LabTab } from '@/components/emr/lab-tab';
import { PrescriptionTab } from '@/components/emr/prescription-tab';
import { MedicationTab } from '@/components/emr/medication-tab';
import { OperationsTab } from '@/components/emr/operations-tab';
import { LiveConsultTab } from '@/components/emr/live-consult-tab';
import { NurseNotesTab } from '@/components/emr/nurse-notes-tab';
import { ConsultantRegisterTab } from '@/components/emr/consultant-register-tab';
import { BedHistoryTab } from '@/components/emr/bed-history-tab';
import { DetailPageShell, type RailItem } from '@/components/emr/detail-page-shell';
import { EncounterOverview } from '@/components/emr/encounter-overview';
import { PatientReportModal } from '@/components/patient-report-modal';
import { TimelineTab } from '@/components/emr/timeline-tab';
import { VitalsTab } from '@/components/emr/vitals-tab';
import { IpdTreatmentHistoryPanel } from '@/components/emr/ipd-treatment-history-panel';
import { IpdAdmissionEditForm } from '@/components/emr/ipd-admission-edit-form';
import { DischargeModal } from '@/components/emr/discharge-modal';
import { useEncounterBilling } from '@/lib/hooks/use-encounter-billing';
import { useIpdAdmissions, useIpdAdmissionDetail, useDeleteIpdAdmission } from '@/lib/hooks/use-ipd';
import { usePatientProfile } from '@/lib/hooks/use-emr';
import { useAbility } from '@/lib/auth-store';

type Tab =
  | 'overview' | 'nursenotes' | 'medication' | 'prescription' | 'consultants'
  | 'lab' | 'operations' | 'charges' | 'payments' | 'liveconsult' | 'bedhistory'
  | 'timeline' | 'treatmenthistory' | 'vitals';

function lengthOfStay(admissionDate: string, dischargeDate: string | null): string {
  const start = new Date(admissionDate).getTime();
  const end = dischargeDate ? new Date(dischargeDate).getTime() : Date.now();
  const ms = Math.max(0, end - start);
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return `${days}d ${hours}h`;
}

export default function IpdDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const ability = useAbility();
  const canEdit = ability.can('billing', 'edit');
  const canEditClinical = ability.can('patient', 'edit');
  const canEditIpd = ability.can('ipd', 'edit');
  const canDeleteIpd = ability.can('ipd', 'delete');
  const { data, isLoading } = useEncounterBilling('ipd', id);
  const { data: admission } = useIpdAdmissionDetail(id);
  const { data: profile } = usePatientProfile(data?.header.patientId ?? '');
  // The ward populates the left rail — the switcher, not a list.
  const { data: ward, isLoading: railLoading } = useIpdAdmissions('admitted', { page: 1, size: 100 });
  const del = useDeleteIpdAdmission();
  const confirmDelete = useConfirmDelete();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);
  const [discharging, setDischarging] = useState(false);
  const [showReport, setShowReport] = useState(false);

  if (isLoading || !data) return <div className="p-8 text-sm text-fg-muted">Loading IPD admission…</div>;
  const h = data.header;
  const scope = { patientId: h.patientId, encounterType: 'ipd' as const, encounterId: id };

  const rail: RailItem[] = (ward?.data ?? []).map((a) => ({
    id: a.id,
    encounterNo: a.ipdNo,
    patientName: a.patientName,
    subtitle: a.bedLabel,
  }));

  async function onDelete() {
    if (!admission) return;
    if (!(await confirmDelete(`admission ${admission.ipdNo}`))) return;
    try {
      await del.mutateAsync(id);
      toast.success(`Admission ${admission.ipdNo} deleted`);
      router.push('/ipd');
    } catch (e) {
      toast.error('Could not delete admission', { description: (e as Error).message });
    }
  }

  return (
    <DetailPageShell
      railTitle="Admitted"
      items={rail}
      loading={railLoading}
      activeId={id}
      hrefFor={(i) => `/ipd/${i.id}`}
      searchPlaceholder="Search IPD / Bed / Name"
      breadcrumb={
        <>
          <Link href="/ipd" className="hover:underline">IPD</Link>
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
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold">
                  <Link href={`/patient/${h.patientId}`} className="hover:underline">{h.patientName}</Link>
                </p>
                {admission && <StatusPill status={admission.status === 'admitted' ? 'approved' : admission.status} />}
              </div>
              <p className="mt-1 text-sm text-fg-muted">
                {h.caseNo ?? '—'} · {h.encounterNo} · {admission?.gender ?? '—'} · {admission ? formatAge(admission.age) : '—'} · {h.bedLabel ?? '—'}
              </p>
              <p className="text-sm text-fg-muted">
                {h.consultantName} · LOS {admission ? lengthOfStay(admission.admissionDate, admission.dischargeDate) : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowReport(true)} aria-label="Patient details" title="Patient details" className="flex h-9 w-9 items-center justify-center rounded-sm text-fg-muted hover:bg-border/50">
              <List className="h-4 w-4" />
            </button>
            {canEditIpd && (
              <button onClick={() => setEditing(true)} aria-label="Edit" title="Edit" className="flex h-9 w-9 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {canEditIpd && admission?.status === 'admitted' && (
              <button onClick={() => setDischarging(true)} aria-label="Discharge" title="Discharge" className="flex h-9 w-9 items-center justify-center rounded-sm text-fg-muted hover:bg-warning/10 hover:text-warning">
                <LogOut className="h-4 w-4" />
              </button>
            )}
            {canDeleteIpd && (
              <button onClick={onDelete} aria-label="Delete" title="Delete" className="flex h-9 w-9 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <Button size="sm" variant="secondary" onClick={() => printEncounterBill(data, 'IPD')}><Printer className="h-4 w-4" /> Print Bill</Button>
            {admission?.status === 'discharged' && (
              <Button size="sm" variant="secondary" onClick={() => printDischargeCard(admission)}>
                <FileText className="h-4 w-4" /> Discharge Card
              </Button>
            )}
            {data.credit && (
              <div className="flex gap-3">
                <Chip label="Credit Limit" value={data.credit.limit} />
                <Chip label="Used" value={data.credit.used} />
                <Chip
                  label="Balance"
                  value={data.credit.balance}
                  accent={data.credit.balance < 0 ? 'text-danger' : 'text-success'}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'nursenotes', label: 'Nurse Notes' },
          { value: 'medication', label: 'Medication (MAR)' },
          { value: 'prescription', label: 'Prescription' },
          { value: 'consultants', label: 'Consultant Register' },
          { value: 'lab', label: 'Lab Investigation' },
          { value: 'operations', label: 'Operations' },
          { value: 'charges', label: 'Charges' },
          { value: 'payments', label: 'Payments' },
          { value: 'liveconsult', label: 'Live Consultation' },
          { value: 'bedhistory', label: 'Bed History' },
          { value: 'timeline', label: 'Timeline' },
          { value: 'treatmenthistory', label: 'Treatment History' },
          { value: 'vitals', label: 'Vitals' },
        ]}
        value={tab}
        onChange={(t) => setTab(t as Tab)}
      />

      {/* Consultant Register and Bed History used to be duplicated here as
          panels while also having their own tabs. The Overview's job is the
          identity grid and the money (blueprint §8.3 tab 1) — the tabs own
          the detail. */}
      {tab === 'overview' && (
        <EncounterOverview
          encounterModule="ipd"
          barcodeValue={h.encounterNo}
          billingSummary={data.billingSummary}
          aside={
            data.credit ? (
              <div className="rounded-md border border-border bg-surface p-5">
                <p className="mb-3 text-sm font-semibold">Credit Limit</p>
                <CreditDonut credit={data.credit} />
              </div>
            ) : undefined
          }
          fields={[
            { label: 'Patient', value: h.patientName },
            { label: 'Case ID', value: h.caseNo },
            { label: 'IPD No', value: h.encounterNo },
            { label: 'Gender', value: admission?.gender },
            { label: 'Age', value: admission ? formatAge(admission.age) : null },
            { label: 'Phone', value: admission?.phone },
            { label: 'Guardian Name', value: admission?.guardianName },
            { label: 'Blood Group', value: admission?.bloodGroup },
            { label: 'Consultant', value: h.consultantName },
            {
              label: 'Admission Date',
              value: admission ? new Date(admission.admissionDate).toLocaleString() : null,
            },
            { label: 'Bed', value: admission?.bedLabel },
            {
              label: 'Discharge Date',
              value: admission?.dischargeDate ? new Date(admission.dischargeDate).toLocaleString() : null,
            },
            { label: 'TPA', value: admission?.tpaName },
            { label: 'TPA ID', value: admission?.tpaIdNo },
            { label: 'Credit Limit', value: admission ? admission.creditLimit.toFixed(2) : null },
          ]}
        />
      )}
      {tab === 'nursenotes' && <NurseNotesTab scope={scope} canEdit={canEditClinical} />}
      {tab === 'lab' && <LabTab scope={scope} canEdit={canEditClinical} patientName={h.patientName} />}
      {tab === 'prescription' && <PrescriptionTab scope={scope} canEdit={canEditClinical} patientName={h.patientName} />}
      {tab === 'consultants' && <ConsultantRegisterTab scope={scope} canEdit={canEditClinical} />}
      {tab === 'medication' && <MedicationTab scope={scope} canEdit={canEditClinical} mar />}
      {tab === 'operations' && <OperationsTab scope={scope} canEdit={canEditClinical} />}
      {tab === 'liveconsult' && <LiveConsultTab scope={scope} canEdit={canEditClinical} />}
      {tab === 'bedhistory' && <BedHistoryTab admissionId={id} canEdit={canEdit && admission?.status === 'admitted'} />}
      {tab === 'charges' && <ChargesTab type="ipd" id={id} data={data} canEdit={canEdit} />}
      {tab === 'payments' && <PaymentsTab type="ipd" id={id} data={data} canEdit={canEdit} />}
      {tab === 'timeline' && <TimelineTab patientId={h.patientId} entries={profile?.timeline ?? []} canEdit={canEditClinical} />}
      {tab === 'vitals' && <VitalsTab patientId={h.patientId} canEdit={canEditClinical} />}
      {tab === 'treatmenthistory' && <IpdTreatmentHistoryPanel patientId={h.patientId} />}

      {editing && admission && (
        <Modal open onClose={() => setEditing(false)} title="Edit Admission" size="lg">
          <IpdAdmissionEditForm admission={admission} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
        </Modal>
      )}

      {discharging && admission && (
        <DischargeModal
          admission={admission}
          open
          onClose={() => setDischarging(false)}
          onDone={() => toast.success(`${admission.patientName} discharged · bed ${admission.bedLabel} freed`)}
        />
      )}

      <PatientReportModal patientId={h.patientId} open={showReport} onClose={() => setShowReport(false)} />
    </DetailPageShell>
  );
}

/** Compact money read-out for the header. */
function Chip({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-sm bg-surface-sunken px-3 py-1.5 text-right">
      <p className="text-2xs uppercase tracking-wide text-fg-muted">{label}</p>
      <p className={`tabular text-sm font-semibold ${accent ?? ''}`}>{value.toFixed(2)}</p>
    </div>
  );
}
