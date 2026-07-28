'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, ClipboardList, Search, Users } from 'lucide-react';
import type { DutyRosterRowDto } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Field, Select } from '@/components/ui/field';
import { ExportMenu } from '@/components/ui/export-menu';
import { useStaff } from '@/lib/hooks/use-hr';
import { useAllRosterPeriods, useDutyRosterDaily } from '@/lib/hooks/use-duty-roster';
import { ShiftView } from '@/components/duty-roster/shift-view';
import { RosterView } from '@/components/duty-roster/roster-view';
import { AssignView } from '@/components/duty-roster/assign-view';
import { fmtDate, staffLabel } from '@/components/duty-roster/util';

type View = 'main' | 'shift' | 'roster' | 'assign';

export default function DutyRosterPage() {
  const [view, setView] = useState<View>('main');
  const back = () => setView('main');

  if (view === 'shift') return <ShiftView onBack={back} />;
  if (view === 'roster') return <RosterView onBack={back} />;
  if (view === 'assign') return <AssignView onBack={back} />;
  return <MainList onNavigate={setView} />;
}

function MainList({ onNavigate }: { onNavigate: (v: View) => void }) {
  const periods = useAllRosterPeriods();
  const staff = useStaff(undefined, { size: 200 });

  const [rosterId, setRosterId] = useState('');
  const [staffUserId, setStaffUserId] = useState('');
  const [query, setQuery] = useState<{ rosterId: string; staffUserId: string } | null>(null);

  const daily = useDutyRosterDaily(query?.rosterId, query?.staffUserId || undefined, !!query);
  const rows = daily.data ?? [];

  const periodOptions = useMemo(
    () => (periods.data ?? []).map((p) => ({ value: p.id, label: `${p.shiftName} (${fmtDate(p.startDate)} - ${fmtDate(p.endDate)})` })),
    [periods.data],
  );

  function search() {
    if (!rosterId) return;
    setQuery({ rosterId, staffUserId });
  }

  const cols: { header: string; render: (r: DutyRosterRowDto) => React.ReactNode; className?: string }[] = [
    { header: 'Staff', render: (r) => staffLabel(r.staffName, r.staffNo), className: 'font-medium' },
    { header: 'Date', render: (r) => fmtDate(r.date) },
    { header: 'Shift Start', render: (r) => r.shiftStartLabel || '—' },
    { header: 'Shift End', render: (r) => r.shiftEndLabel || '—' },
    { header: 'Shift Hour', render: (r) => r.shiftHour },
    { header: 'Shift', render: (r) => r.shiftName },
    { header: 'Department', render: (r) => r.departmentName ?? '—' },
    { header: 'Floor', render: (r) => r.floorName ?? '—' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Duty Roster"
        actions={
          <>
            <Button variant="secondary" onClick={() => onNavigate('shift')}><CalendarClock className="h-4 w-4" /> Shift</Button>
            <Button variant="secondary" onClick={() => onNavigate('roster')}><ClipboardList className="h-4 w-4" /> Roster</Button>
            <Button variant="secondary" onClick={() => onNavigate('assign')}><Users className="h-4 w-4" /> Assign Roster</Button>
          </>
        }
      />

      <div className="rounded-md border border-border bg-surface p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-80"><Field label="Time Duration" required><Select value={rosterId} onChange={(e) => setRosterId(e.target.value)} placeholder="Select" options={periodOptions} /></Field></div>
          <div className="w-full sm:w-72"><Field label="Staff"><Select value={staffUserId} onChange={(e) => setStaffUserId(e.target.value)} placeholder="Select" options={(staff.data?.data ?? []).map((s) => ({ value: s.userId, label: staffLabel(s.name, s.staffNo) }))} /></Field></div>
          <Button onClick={search} disabled={!rosterId}><Search className="h-4 w-4" /> Search</Button>
        </div>

        <div className="mt-5 flex justify-end">
          <ExportMenu table={() => ({ title: 'Duty Roster', filename: 'duty-roster', headers: cols.map((c) => c.header), rows: rows.map((r) => [staffLabel(r.staffName, r.staffNo), fmtDate(r.date), r.shiftStartLabel, r.shiftEndLabel, r.shiftHour, r.shiftName, r.departmentName ?? '', r.floorName ?? '']) })} />
        </div>

        <div className="mt-2 overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-fg-muted">
                {cols.map((c) => <th key={c.header} className="px-3 py-2.5 font-semibold">{c.header}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.staffUserId}-${r.date}-${i}`} className="border-b border-border/60 last:border-0">
                  {cols.map((c) => <td key={c.header} className={`px-3 py-2.5 ${c.className ?? ''}`}>{c.render(r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {daily.isLoading && <p className="py-8 text-center text-sm text-fg-muted">Loading…</p>}
          {!daily.isLoading && rows.length === 0 && <p className="py-10 text-center text-sm text-danger">No Record Found</p>}
        </div>
      </div>
    </div>
  );
}
