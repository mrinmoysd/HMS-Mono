'use client';

import { useEffect, useState } from 'react';
import {
  Eye,
  Pencil,
  Printer,
  Trash2,
  Users,
  User,
  LayoutGrid,
  List,
  Moon,
  Sun,
  Download,
} from 'lucide-react';
import { Button, IconButton } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusPill } from '@/components/ui/status-pill';
import { Field, Select, TextArea, TextInput } from '@/components/ui/field';
import { Checkbox, Radio, RadioGroup } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Combobox } from '@/components/ui/combobox';
import { FileDrop } from '@/components/ui/file-drop';
import { Tabs } from '@/components/ui/tabs';
import { Menu, MenuItem } from '@/components/ui/menu';
import { Modal, ModalForm } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, SkeletonText } from '@/components/ui/skeleton';
import { DataTable, type Column, type SortState } from '@/components/ui/data-table';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

/**
 * Live gallery of every primitive, across all three candidate palettes, both
 * modes and both densities. Exists so the visual language can be judged on real
 * components before the rollout touches 48 pages (UI_SYSTEM_PLAN.md §4, U1d).
 */

type Theme = 'meridian' | 'slate' | 'plum';
type Density = 'comfortable' | 'compact';

const THEMES: { value: Theme; label: string; blurb: string }[] = [
  { value: 'slate', label: 'Slate', blurb: 'Deep navy on cool grey — understated, enterprise (app default)' },
  { value: 'meridian', label: 'Meridian', blurb: 'Indigo-violet on warm stone — calm, premium' },
  { value: 'plum', label: 'Plum', blurb: 'Violet-plum on warm white — higher contrast' },
];

/**
 * Class strings are written out in full: Tailwind's JIT scans source text, so a
 * template literal like `bg-${name}` generates nothing.
 */
const SWATCHES: { name: string; cls: string }[][] = [
  [
    { name: 'canvas', cls: 'bg-canvas' },
    { name: 'surface-1', cls: 'bg-surface-1' },
    { name: 'surface-sunken', cls: 'bg-surface-sunken' },
    { name: 'line', cls: 'bg-line' },
    { name: 'line-strong', cls: 'bg-line-strong' },
  ],
  [
    { name: 'fg', cls: 'bg-fg' },
    { name: 'fg-muted', cls: 'bg-fg-muted' },
    { name: 'fg-subtle', cls: 'bg-fg-subtle' },
  ],
  [
    { name: 'primary', cls: 'bg-primary' },
    { name: 'primary-hover', cls: 'bg-primary-hover' },
    { name: 'primary-active', cls: 'bg-primary-active' },
    { name: 'primary-soft', cls: 'bg-primary-soft' },
  ],
  [
    { name: 'accent', cls: 'bg-accent' },
    { name: 'accent-soft', cls: 'bg-accent-soft' },
  ],
  [
    { name: 'success', cls: 'bg-success' },
    { name: 'success-soft', cls: 'bg-success-soft' },
    { name: 'warning', cls: 'bg-warning' },
    { name: 'warning-soft', cls: 'bg-warning-soft' },
  ],
  [
    { name: 'danger', cls: 'bg-danger' },
    { name: 'danger-soft', cls: 'bg-danger-soft' },
    { name: 'info', cls: 'bg-info' },
    { name: 'info-soft', cls: 'bg-info-soft' },
    { name: 'occupied', cls: 'bg-occupied' },
  ],
];

const SHADOWS = [
  { name: 'xs', cls: 'shadow-xs' },
  { name: 'sm', cls: 'shadow-sm' },
  { name: 'md', cls: 'shadow-md' },
  { name: 'lg', cls: 'shadow-lg' },
  { name: 'xl', cls: 'shadow-xl' },
];

const RADII = [
  { name: 'xs', cls: 'rounded-xs' },
  { name: 'sm', cls: 'rounded-sm' },
  { name: 'md', cls: 'rounded-md' },
  { name: 'lg', cls: 'rounded-lg' },
  { name: 'xl', cls: 'rounded-xl' },
  { name: '2xl', cls: 'rounded-2xl' },
];

interface Row {
  id: string;
  patient: string;
  no: string;
  status: string;
  amount: string;
}

const ROWS: Row[] = [
  { id: '1', patient: 'Ravi Menon', no: 'PT000110', status: 'Paid', amount: '1,240.00' },
  { id: '2', patient: 'Anita Desai', no: 'PT000111', status: 'Unpaid', amount: '860.50' },
  { id: '3', patient: 'Suresh Nair', no: 'PT000112', status: 'Partial', amount: '2,015.75' },
  { id: '4', patient: 'Meera Iyer', no: 'PT000113', status: 'Scheduled', amount: '430.00' },
];

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {note && <p className="text-sm text-fg-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Row2({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line/60 py-3 last:border-0">
      <span className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-fg-subtle">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export default function DesignSystemPage() {
  const [theme, setTheme] = useState<Theme>('slate');
  const [dark, setDark] = useState(false);
  const [density, setDensity] = useState<Density>('compact');

  const [modal, setModal] = useState(false);
  const [formModal, setFormModal] = useState(false);
  const [tab, setTab] = useState('overview');
  const [seg, setSeg] = useState('group');
  const [view, setView] = useState('card');
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState('a');
  const [on, setOn] = useState(true);
  const [combo, setCombo] = useState('');
  const [file, setFile] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'patient', dir: 'asc' });
  const [selected, setSelected] = useState<Set<string>>(new Set(['2']));

  const toast = useToast();
  const confirm = useConfirm();

  // Drive the real token attributes so the gallery reflects production exactly.
  useEffect(() => {
    const el = document.documentElement;
    // Slate + compact are the CSS defaults, so those are expressed by removing
    // the attribute rather than setting it.
    if (theme === 'slate') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', theme);
    el.classList.toggle('dark', dark);
    if (density === 'comfortable') el.setAttribute('data-density', 'comfortable');
    else el.removeAttribute('data-density');
    return () => {
      el.removeAttribute('data-theme');
      el.removeAttribute('data-density');
      el.classList.remove('dark');
    };
  }, [theme, dark, density]);

  const columns: Column<Row>[] = [
    { key: 'no', header: 'Patient No', sortable: true, alwaysVisible: true, className: 'tabular' },
    { key: 'patient', header: 'Name', sortable: true, render: (r) => <span className="font-medium">{r.patient}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusPill status={r.status} /> },
    { key: 'amount', header: 'Amount', align: 'right', sortable: true, className: 'tabular' },
  ];

  return (
    <div className="min-h-screen bg-canvas text-fg">
      {/* ── Control bar ── */}
      <header className="sticky top-0 z-sticky border-b border-line bg-surface-1/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-3">
          <div className="mr-auto">
            <h1 className="text-base font-semibold">Meridian design system</h1>
            <p className="text-xs text-fg-muted">{THEMES.find((t) => t.value === theme)?.blurb}</p>
          </div>
          <SegmentedControl
            options={THEMES.map((t) => ({ value: t.value, label: t.label }))}
            value={theme}
            onChange={setTheme}
            size="sm"
          />
          <SegmentedControl
            options={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
            value={density}
            onChange={setDensity}
            size="sm"
          />
          <Button variant="secondary" size="sm" onClick={() => setDark((d) => !d)}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {dark ? 'Light' : 'Dark'}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-8">
        <Section title="Colour roles" note="Every value is a CSS variable; swapping the palette re-themes the whole app.">
          <div className="space-y-4">
            {SWATCHES.map((group, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                {group.map((sw) => (
                  <div key={sw.name} className="w-36 overflow-hidden rounded-md border border-line">
                    <div className={`h-10 ${sw.cls}`} />
                    <div className="bg-surface-1 px-2 py-1 text-2xs text-fg-muted">{sw.name}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Typography" note="Paired line-heights; tabular figures for money and quantities.">
          <Card>
            <CardBody className="space-y-1">
              <p className="text-3xl font-semibold">Display 3xl — 28px</p>
              <p className="text-2xl font-semibold">Heading 2xl — 22px</p>
              <p className="text-xl font-semibold">Heading xl — 19px</p>
              <p className="text-lg font-medium">Heading lg — 17px</p>
              <p className="text-base">Body base — 15px</p>
              <p className="text-sm">Body sm — 14px (table default)</p>
              <p className="text-xs text-fg-muted">Caption xs — 12px</p>
              <p className="text-2xs uppercase tracking-wide text-fg-subtle">Overline 2xs — 11px</p>
              <p className="tabular pt-2 text-sm">Tabular figures 1,240.00 · 860.50 · 2,015.75</p>
            </CardBody>
          </Card>
        </Section>

        <Section title="Buttons">
          <Card>
            <CardBody className="divide-y divide-line/60 py-0">
              <Row2 label="Variants">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="subtle">Subtle</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="link">Link</Button>
              </Row2>
              <Row2 label="Sizes">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </Row2>
              <Row2 label="States">
                <Button loading>Saving</Button>
                <Button disabled>Disabled</Button>
                <Button>
                  <Download className="h-4 w-4" /> With icon
                </Button>
              </Row2>
              <Row2 label="Row actions">
                <IconButton label="View"><Eye className="h-4 w-4" /></IconButton>
                <IconButton label="Edit" tone="primary"><Pencil className="h-4 w-4" /></IconButton>
                <IconButton label="Print"><Printer className="h-4 w-4" /></IconButton>
                <IconButton label="Delete" tone="danger"><Trash2 className="h-4 w-4" /></IconButton>
              </Row2>
            </CardBody>
          </Card>
        </Section>

        <Section title="Form controls">
          <Card>
            <CardBody className="grid gap-5 sm:grid-cols-2">
              <Field label="Patient name" required>
                <TextInput placeholder="e.g. Ravi Menon" />
              </Field>
              <Field label="Phone" hint="Digits only — country code optional.">
                <TextInput placeholder="91111-22223" />
              </Field>
              <Field label="Blood group">
                <Select placeholder="Select" options={[{ value: 'a+', label: 'A+' }, { value: 'o-', label: 'O−' }]} />
              </Field>
              <Field label="Email" error="Enter a valid email address.">
                <TextInput invalid defaultValue="not-an-email" />
              </Field>
              <Field label="Consultant" className="sm:col-span-2">
                <Combobox
                  options={[
                    { value: '1', label: 'Dr. Kavita Rao', description: 'Cardiology' },
                    { value: '2', label: 'Dr. Imran Sheikh', description: 'Orthopaedics' },
                    { value: '3', label: 'Dr. Neha Gupta', description: 'Paediatrics' },
                  ]}
                  value={combo}
                  onChange={setCombo}
                  clearable
                  placeholder="Search consultants…"
                />
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <TextArea placeholder="Clinical notes…" />
              </Field>
              <Field label="Attachment" className="sm:col-span-2">
                <FileDrop value={file} onChange={setFile} hint="PDF or image, up to 5 MB" />
              </Field>
              <Field label="Disabled">
                <TextInput disabled defaultValue="Read only" />
              </Field>
            </CardBody>
          </Card>
        </Section>

        <Section title="Selection controls">
          <Card>
            <CardBody className="divide-y divide-line/60 py-0">
              <Row2 label="Checkbox">
                <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} label="Apply TPA" />
                <Checkbox indeterminate checked={false} onChange={() => {}} label="Select all" />
                <Checkbox disabled label="Disabled" />
              </Row2>
              <Row2 label="Radio">
                <RadioGroup
                  name="ds-radio"
                  value={radio}
                  onChange={setRadio}
                  inline
                  options={[
                    { value: 'a', label: 'Cash' },
                    { value: 'b', label: 'Card' },
                    { value: 'c', label: 'Online' },
                  ]}
                />
              </Row2>
              <Row2 label="Switch">
                <Switch checked={on} onChange={setOn} label="Send SMS receipt" />
                <Switch checked={false} onChange={() => {}} label="Off" />
              </Row2>
              <Row2 label="Segmented">
                <SegmentedControl
                  options={[
                    { value: 'group', label: 'Group', icon: Users },
                    { value: 'individual', label: 'Individual', icon: User },
                  ]}
                  value={seg}
                  onChange={setSeg}
                />
                <SegmentedControl
                  options={[
                    { value: 'card', label: 'Cards', icon: LayoutGrid },
                    { value: 'list', label: 'List', icon: List },
                  ]}
                  value={view}
                  onChange={setView}
                  size="sm"
                />
              </Row2>
            </CardBody>
          </Card>
        </Section>

        <Section title="Status & badges">
          <Card>
            <CardBody className="divide-y divide-line/60 py-0">
              <Row2 label="StatusPill">
                {['Paid', 'Unpaid', 'Partial', 'Approved', 'Cancelled', 'Scheduled', 'Returned', 'Not Generated'].map((s) => (
                  <StatusPill key={s} status={s} />
                ))}
              </Row2>
              <Row2 label="Badge">
                <Badge>Neutral</Badge>
                <Badge tone="primary">Primary</Badge>
                <Badge tone="accent">Accent</Badge>
                <Badge tone="success" dot>Active</Badge>
                <Badge tone="warning" dot>Low stock</Badge>
                <Badge tone="danger" dot>Expired</Badge>
                <Badge tone="info" size="sm">v2</Badge>
              </Row2>
            </CardBody>
          </Card>
        </Section>

        <Section title="Overlays" note="Modal, confirm dialog and toasts — the three the app is missing entirely.">
          <Card>
            <CardBody className="flex flex-wrap gap-2">
              <Button onClick={() => setModal(true)}>Open modal</Button>
              <Button variant="secondary" onClick={() => setFormModal(true)}>Open form modal</Button>
              <Button
                variant="danger"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Delete patient PT000110?',
                    description: 'This removes the record and all linked visits. This cannot be undone.',
                    confirmLabel: 'Delete',
                    tone: 'danger',
                  });
                  if (ok) toast.success('Patient deleted', { action: { label: 'Undo', onClick: () => toast.info('Restored') } });
                  else toast.info('Cancelled');
                }}
              >
                Confirm dialog
              </Button>
              <Button variant="subtle" onClick={() => toast.success('Invoice saved')}>Toast: success</Button>
              <Button variant="subtle" onClick={() => toast.error('Could not reach the server', { description: 'ECONNREFUSED 127.0.0.1:4000' })}>Toast: error</Button>
              <Button variant="subtle" onClick={() => toast.warning('Stock is running low')}>Toast: warning</Button>
            </CardBody>
          </Card>
        </Section>

        <Section title="Tabs & menus">
          <Card>
            <CardHeader
              title="Patient 360"
              actions={
                <Menu trigger={<Button variant="secondary" size="sm">Actions</Button>}>
                  <MenuItem icon={Eye} onClick={() => toast.info('View')}>View details</MenuItem>
                  <MenuItem icon={Printer} onClick={() => toast.info('Print')}>Print</MenuItem>
                  <MenuItem icon={Trash2} tone="danger" onClick={() => toast.info('Delete')}>Delete</MenuItem>
                </Menu>
              }
            />
            <div className="px-5">
              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: 'overview', label: 'Overview' },
                  { value: 'visits', label: 'Visits', count: 12 },
                  { value: 'lab', label: 'Lab', count: 3 },
                  { value: 'billing', label: 'Billing' },
                ]}
              />
            </div>
            <CardBody>
              <p className="text-sm text-fg-muted">Panel content for “{tab}”.</p>
            </CardBody>
            <CardFooter>
              <Button variant="secondary">Cancel</Button>
              <Button>Save</Button>
            </CardFooter>
          </Card>
        </Section>

        <Section title="Data table" note="Sortable headers, column chooser, selection and the demo-parity range label.">
          <DataTable
            columns={columns}
            rows={ROWS}
            meta={{ page: 1, size: 10, total: 4, totalPages: 1 }}
            search={search}
            onSearch={setSearch}
            onPage={() => {}}
            onSize={() => {}}
            sort={sort}
            onSort={(key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))}
            columnChooser
            selectable
            selected={selected}
            onToggle={(id) => setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
            onToggleAll={(ids) => setSelected((p) => (p.size === ids.length ? new Set() : new Set(ids)))}
            toolbar={<Button size="sm"><Download className="h-4 w-4" /> Export</Button>}
            rowActions={() => (
              <>
                <IconButton label="View" size="sm"><Eye className="h-3.5 w-3.5" /></IconButton>
                <IconButton label="Edit" size="sm" tone="primary"><Pencil className="h-3.5 w-3.5" /></IconButton>
                <IconButton label="Delete" size="sm" tone="danger"><Trash2 className="h-3.5 w-3.5" /></IconButton>
              </>
            )}
          />
        </Section>

        <Section title="Empty & loading states">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <EmptyState
                title="No patients yet"
                description="Add the first patient to start building the registry."
                action={<Button size="sm">Add patient</Button>}
              />
            </Card>
            <Card>
              <CardBody className="space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <SkeletonText lines={4} />
              </CardBody>
            </Card>
          </div>
        </Section>

        <Section title="Elevation & radius">
          <div className="flex flex-wrap gap-4">
            {SHADOWS.map((s) => (
              <div
                key={s.name}
                className={`flex h-20 w-32 items-center justify-center rounded-lg bg-surface-1 text-sm text-fg-muted ${s.cls}`}
              >
                shadow-{s.name}
              </div>
            ))}
            {RADII.map((r) => (
              <div
                key={r.name}
                className={`flex h-20 w-32 items-center justify-center border border-line bg-surface-sunken text-sm text-fg-muted ${r.cls}`}
              >
                rounded-{r.name}
              </div>
            ))}
          </div>
        </Section>
      </main>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Blood component issue"
        description="Focus is trapped, Escape closes, body scroll is locked."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={() => { setModal(false); toast.success('Component issued'); }}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Patient" required><TextInput placeholder="Search by name, phone, or patient no…" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Blood group" required>
              <Select options={[{ value: 'a+', label: 'A+' }, { value: 'o-', label: 'O−' }]} />
            </Field>
            <Field label="Component" required>
              <Select placeholder="Select" options={[{ value: 'p', label: 'Plasma' }, { value: 'r', label: 'RBC' }]} />
            </Field>
          </div>
          <Checkbox label="Apply TPA" />
        </div>
      </Modal>

      <ModalForm
        open={formModal}
        onClose={() => setFormModal(false)}
        title="Add shift"
        size="lg"
        submitLabel="Save shift"
        onSubmit={() => { setFormModal(false); toast.success('Shift saved'); }}
        extraActions={<Button variant="secondary" onClick={() => toast.info('Saved & printed')}>Save & Print</Button>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shift name" required><TextInput placeholder="Night" /></Field>
          <Field label="Department"><Select placeholder="Select" options={[{ value: '1', label: 'Cardiology' }]} /></Field>
          <Field label="Start time" required><TextInput type="time" defaultValue="22:00" /></Field>
          <Field label="End time" required><TextInput type="time" defaultValue="06:00" /></Field>
          <Field label="Notes" className="sm:col-span-2"><TextArea /></Field>
        </div>
      </ModalForm>
    </div>
  );
}
