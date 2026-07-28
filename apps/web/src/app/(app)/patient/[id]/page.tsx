'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import type { AddFindingRecordInput, AddSymptomRecordInput } from '@smart-hospital/shared';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Barcode } from '@/components/ui/barcode';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { DescriptionList } from '@/components/ui/description-list';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, SkeletonText } from '@/components/ui/skeleton';
import { formatAge } from '@/lib/utils';
import { printDocument } from '@/lib/print';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea } from '@/components/ui/field';
import { CurrentVitals } from '@/components/emr/current-vitals';
import { VitalsTab } from '@/components/emr/vitals-tab';
import { LabTab } from '@/components/emr/lab-tab';
import { TimelineTab } from '@/components/emr/timeline-tab';
import { MedicalHistoryChart } from '@/components/emr/medical-history-chart';
import { VisitsPanel } from '@/components/emr/visits-panel';
import { TreatmentHistoryPanel } from '@/components/emr/treatment-history-panel';
import { usePatientProfile, useAddFinding, useAddSymptom } from '@/lib/hooks/use-emr';
import { useAbility } from '@/lib/auth-store';

type Tab = 'overview' | 'visits' | 'lab' | 'treatment' | 'timeline' | 'vitals';

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const ability = useAbility();
  const canEdit = ability.can('patient', 'edit');
  const { data, isLoading } = usePatientProfile(id);
  const [tab, setTab] = useState<Tab>('overview');

  const addFinding = useAddFinding(id);
  const addSymptom = useAddSymptom(id);
  const [findOpen, setFindOpen] = useState(false);
  const [sympOpen, setSympOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [sympTitle, setSympTitle] = useState('');
  const [sympDesc, setSympDesc] = useState('');

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-9 w-full max-w-xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex gap-4">
                <Skeleton className="h-24 w-24 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <SkeletonText lines={4} />
                </div>
              </div>
              <SkeletonText lines={5} />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <SkeletonText lines={8} />
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }
  const h = data.header;

  function printFile() {
    if (!data) return;
    printDocument({
      documentTitle: 'Patient File',
      heading: `Patient File — ${h.name} (${h.patientNo})`,
      meta: [
        ['Gender', h.gender ?? '—'],
        ['Age', formatAge(h.age)],
        ['Guardian', h.guardianName ?? '—'],
        ['Phone', h.phone ?? '—'],
        ...(h.tpaName ? [['TPA', `${h.tpaName}${h.tpaIdNo ? ` · ${h.tpaIdNo}` : ''}`] as [string, string]] : []),
      ],
      sections: [
        {
          heading: 'Current Vitals',
          table: {
            headers: ['Vital', 'Value', 'Status'],
            rows: data.currentVitals.length
              ? data.currentVitals.map((v) => [v.name, `${v.value}${v.unit ? ` ${v.unit}` : ''}`, v.status])
              : [['No vitals recorded', '', '']],
          },
        },
        { heading: 'Known Allergies', text: data.allergies || 'None recorded' },
        { heading: 'Findings', text: data.findings.map((f) => f.text).join('; ') || 'None' },
        { heading: 'Symptoms', text: data.symptoms.map((s) => s.title).join('; ') || 'None' },
        { heading: 'Consultant Doctors', text: data.consultants.map((c) => c.name).join(', ') || 'None' },
      ],
      footer: 'Authorised Signatory',
    });
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t border-line pt-3">
      <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">{title}</p>
      {children}
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={h.name}
        description={h.patientNo}
        backHref="/patient"
        backLabel="Back to patients"
        breadcrumbs={[{ label: 'Patients', href: '/patient' }, { label: h.patientNo }]}
        actions={
          <Button size="sm" variant="secondary" onClick={printFile}>
            <Printer className="h-4 w-4" /> Print File
          </Button>
        }
      >
        <Tabs
          tabs={[
            { value: 'overview', label: 'Overview' },
            { value: 'visits', label: 'Visits', count: data.visits.length },
            { value: 'lab', label: 'Lab Investigation' },
            { value: 'treatment', label: 'Treatment History', count: data.treatmentHistory.length },
            { value: 'timeline', label: 'Timeline', count: data.timeline.length },
            { value: 'vitals', label: 'Vitals' },
          ]}
          value={tab}
          onChange={(t) => setTab(t as Tab)}
        />
      </PageHeader>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* LEFT */}
          <Card className="space-y-4 p-card">
            <div className="flex gap-4">
              {h.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={h.photoUrl} alt={h.name} className="h-24 w-24 rounded-md object-cover" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-md bg-primary-soft text-2xl font-semibold text-primary">{h.name.charAt(0)}</div>
              )}
              <div className="min-w-0 text-sm">
                <p className="text-lg font-semibold">{h.name} <span className="text-fg-muted">({h.patientNo})</span></p>
                <DescriptionList
                  className="mt-2"
                  items={[
                    { label: 'Gender', value: h.gender ?? '—' },
                    { label: 'Age', value: formatAge(h.age) },
                    { label: 'Guardian', value: h.guardianName ?? '—' },
                    { label: 'Phone', value: h.phone ?? '—' },
                    ...(h.tpaName
                      ? [{ label: 'TPA', value: `${h.tpaName}${h.tpaIdNo ? ` · ${h.tpaIdNo}` : ''}` }]
                      : []),
                  ]}
                />
                <div className="mt-3">
                  <Barcode value={h.patientNo} height={40} />
                </div>
              </div>
            </div>

            <Section title="Current Vitals"><CurrentVitals vitals={data.currentVitals} bmi={data.bmi} /></Section>
            <Section title="Known Allergies"><p className="text-sm">{data.allergies || 'None recorded'}</p></Section>
            <Section title="Findings">
              {canEdit && <button onClick={() => setFindOpen(true)} className="mb-1 text-xs font-medium text-primary">+ Add finding</button>}
              <ul className="list-disc space-y-1 pl-5 text-sm">{data.findings.map((f) => <li key={f.id}>{f.text}</li>)}{data.findings.length === 0 && <li className="list-none text-fg-muted">None</li>}</ul>
            </Section>
            <Section title="Symptoms">
              {canEdit && <button onClick={() => setSympOpen(true)} className="mb-1 text-xs font-medium text-primary">+ Add symptom</button>}
              <ul className="list-disc space-y-1 pl-5 text-sm">{data.symptoms.map((s) => <li key={s.id}><b>{s.title}</b>{s.description ? ` — ${s.description}` : ''}</li>)}{data.symptoms.length === 0 && <li className="list-none text-fg-muted">None</li>}</ul>
            </Section>
            <Section title="Consultant Doctor">
              <div className="space-y-1 text-sm">{data.consultants.map((c) => <div key={c.id}>{c.name}</div>)}{data.consultants.length === 0 && <p className="text-fg-muted">None</p>}</div>
            </Section>
            <Section title="Timeline"><TimelineTab patientId={id} entries={data.timeline} canEdit={canEdit} compact /></Section>
          </Card>

          {/* RIGHT */}
          <div className="space-y-4">
            <Card>
              <CardHeader title="Medical History" />
              <CardBody><MedicalHistoryChart data={data.medicalHistory} /></CardBody>
            </Card>
            <Card>
              <CardHeader title="Visit Details" />
              <VisitTable rows={data.visits} emptyLabel="No visits recorded" />
            </Card>
            <Card>
              <CardHeader title="Treatment History" />
              <VisitTable rows={data.treatmentHistory} emptyLabel="No treatment history" />
            </Card>
          </div>
        </div>
      )}

      {tab === 'visits' && <VisitsPanel rows={data.visits} patientId={id} patientName={h.name} />}
      {tab === 'treatment' && <TreatmentHistoryPanel rows={data.treatmentHistory} />}
      {tab === 'lab' && <LabTab scope={{ patientId: id }} canEdit={canEdit} patientName={h.name} />}
      {tab === 'timeline' && (
        <Card>
          <CardBody><TimelineTab patientId={id} entries={data.timeline} canEdit={canEdit} /></CardBody>
        </Card>
      )}
      {tab === 'vitals' && <VitalsTab patientId={id} canEdit={canEdit} />}

      {/* Add finding */}
      <FormDrawer open={findOpen} title="Add Finding" onClose={() => setFindOpen(false)} onSubmit={async () => { if (findText.trim()) { await addFinding.mutateAsync({ patientId: id, text: findText } as AddFindingRecordInput); setFindOpen(false); setFindText(''); } }} submitting={addFinding.isPending}>
        <Field label="Finding" required><TextArea value={findText} onChange={(e) => setFindText(e.target.value)} rows={4} /></Field>
      </FormDrawer>
      {/* Add symptom */}
      <FormDrawer open={sympOpen} title="Add Symptom" onClose={() => setSympOpen(false)} onSubmit={async () => { if (sympTitle.trim()) { await addSymptom.mutateAsync({ patientId: id, title: sympTitle, description: sympDesc } as AddSymptomRecordInput); setSympOpen(false); setSympTitle(''); setSympDesc(''); } }} submitting={addSymptom.isPending}>
        <div className="space-y-4">
          <Field label="Symptom" required><TextInput value={sympTitle} onChange={(e) => setSympTitle(e.target.value)} /></Field>
          <Field label="Description"><TextArea value={sympDesc} onChange={(e) => setSympDesc(e.target.value)} /></Field>
        </div>
      </FormDrawer>
    </div>
  );
}

function VisitTable({
  rows,
  emptyLabel,
}: {
  rows: { id: string; opdNo: string; caseNo: string | null; appointmentDate: string; consultantName: string; symptoms: string | null }[];
  emptyLabel: string;
}) {
  if (rows.length === 0) return <EmptyState title={emptyLabel} compact />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-sunken text-left text-xs text-fg-muted">
            {['OPD No', 'Case ID', 'Date', 'Consultant', 'Symptoms'].map((c) => (
              <th key={c} className="px-cell py-cell font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line/60 last:border-0">
              <td className="px-cell py-cell font-medium text-primary">{r.opdNo}</td>
              <td className="px-cell py-cell">{r.caseNo ?? '—'}</td>
              <td className="px-cell py-cell">{new Date(r.appointmentDate).toLocaleDateString()}</td>
              <td className="px-cell py-cell">{r.consultantName}</td>
              <td className="px-cell py-cell text-fg-muted">{r.symptoms ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
