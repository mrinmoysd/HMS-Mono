'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, Save, Search } from 'lucide-react';
import { ATTENDANCE_STATUSES } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { useAttendanceGrid, useSaveAttendance, useStaffRoles } from '@/lib/hooks/use-hr';

const STATUS_LABELS: Record<string, string> = {
  present: 'Present', late: 'Late', absent: 'Absent', half_day: 'Half Day', holiday: 'Holiday', half_day_second_shift: 'Half Day Second Shift',
};

interface Row { status: string; inTime: string; outTime: string; note: string }

export function StaffAttendance({ onBack }: { onBack: () => void }) {
  const roles = useStaffRoles();
  const [role, setRole] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [query, setQuery] = useState({ role: '', date: new Date().toISOString().slice(0, 10) });
  const grid = useAttendanceGrid(query.date, query.role || undefined);
  const save = useSaveAttendance();

  const [rows, setRows] = useState<Record<string, Row>>({});

  useEffect(() => {
    if (grid.data) {
      const next: Record<string, Row> = {};
      for (const r of grid.data) next[r.staffUserId] = { status: r.status, inTime: r.inTime ?? '', outTime: r.outTime ?? '', note: r.note ?? '' };
      setRows(next);
    }
  }, [grid.data]);

  function setRow(id: string, patch: Partial<Row>) { setRows((p) => ({ ...p, [id]: { ...p[id], ...patch } })); }
  function bulkSet(status: string) { setRows((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { ...v, status }]))); }

  async function saveAll() {
    await save.mutateAsync({
      date: new Date(query.date),
      rows: Object.entries(rows).map(([staffUserId, r]) => ({ staffUserId, status: r.status as never, inTime: r.inTime, outTime: r.outTime, note: r.note })),
    });
  }

  const staff = grid.data ?? [];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /> Staff Directory</button>
      <h1 className="text-2xl font-semibold">Staff Attendance</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface p-4">
        <div className="w-56"><Field label="Role"><Select value={role} onChange={(e) => setRole(e.target.value)} placeholder="Select" options={(roles.data ?? []).map((r) => ({ value: r.slug, label: r.label }))} /></Field></div>
        <div className="w-52"><Field label="Attendance Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field></div>
        <Button onClick={() => setQuery({ role, date })}><Search className="h-4 w-4" /> Search</Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium">Set Attendance For All Staff As</span>
          {ATTENDANCE_STATUSES.map((st) => (
            <button key={st} onClick={() => bulkSet(st)} className="rounded-sm border border-border px-2 py-1 text-xs hover:border-primary hover:text-primary">{STATUS_LABELS[st]}</button>
          ))}
        </div>
        <Button onClick={saveAll} loading={save.isPending}><Save className="h-4 w-4" /> Save Attendance</Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              {['#', 'Staff ID', 'Name', 'Role', 'Staff Attendance', 'Source', 'Entry Time', 'Exit Time', 'Note'].map((c) => <th key={c} className="px-3 py-2.5 font-semibold">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {staff.map((r, i) => {
              const row = rows[r.staffUserId] ?? { status: 'present', inTime: '', outTime: '', note: '' };
              return (
                <tr key={r.staffUserId} className="border-b border-border/60 last:border-0 align-top">
                  <td className="px-3 py-3">{i + 1}</td>
                  <td className="px-3 py-3">{r.staffNo ?? '—'}</td>
                  <td className="px-3 py-3 font-medium">{r.staffName}</td>
                  <td className="px-3 py-3">{r.roleLabel}</td>
                  <td className="px-3 py-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {ATTENDANCE_STATUSES.map((st) => (
                        <label key={st} className="flex items-center gap-1.5 text-xs">
                          <input type="radio" name={`att-${r.staffUserId}`} checked={row.status === st} onChange={() => setRow(r.staffUserId, { status: st })} />
                          {STATUS_LABELS[st]}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-fg-muted">{r.id ? (r.method === 'manual' ? 'Manual' : r.method.toUpperCase()) : 'N/A'}</td>
                  <td className="px-3 py-3"><TextInput type="time" value={row.inTime} onChange={(e) => setRow(r.staffUserId, { inTime: e.target.value })} className="w-28" /></td>
                  <td className="px-3 py-3"><TextInput type="time" value={row.outTime} onChange={(e) => setRow(r.staffUserId, { outTime: e.target.value })} className="w-28" /></td>
                  <td className="px-3 py-3"><TextInput value={row.note} onChange={(e) => setRow(r.staffUserId, { note: e.target.value })} className="w-40" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {grid.isLoading && <p className="py-8 text-center text-sm text-fg-muted">Loading…</p>}
        {!grid.isLoading && staff.length === 0 && <p className="py-8 text-center text-sm text-fg-muted">No staff found</p>}
      </div>
    </div>
  );
}
