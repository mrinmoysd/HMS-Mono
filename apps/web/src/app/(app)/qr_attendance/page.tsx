'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useState } from 'react';
import { QrCode, LogIn, LogOut } from 'lucide-react';
import type { AttendanceDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { StaffSelect } from '@/components/staff-select';
import { useAttendanceGrid, useMarkAttendance } from '@/lib/hooks/use-hr';

export default function QrAttendancePage() {
  const today = new Date().toISOString().slice(0, 10);
  const attendance = useAttendanceGrid(today, undefined);
  const mark = useMarkAttendance();
  const [staffUserId, setStaffUserId] = useState('');

  const cols: Column<AttendanceDto & { id: string }>[] = [
    { key: 'staffName', header: 'Staff', className: 'font-medium' },
    { key: 'inTime', header: 'In', render: (a) => a.inTime ?? '—' },
    { key: 'outTime', header: 'Out', render: (a) => a.outTime ?? '—' },
    { key: 'method', header: 'Method', render: (a) => a.method.toUpperCase() },
    { key: 'status', header: 'Status' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="QR Code Attendance" description="Staff self check-in / check-out" />

      {/* Kiosk card */}
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-md bg-primary/10 text-primary">
          <QrCode className="h-8 w-8" />
        </div>
        <p className="text-sm text-fg-muted">Scan your ID card QR / barcode — or select staff below</p>
        <div className="w-72"><StaffSelect value={staffUserId} onChange={setStaffUserId} /></div>
        <div className="flex gap-3">
          <Button disabled={!staffUserId} loading={mark.isPending}
            onClick={() => mark.mutate({ staffUserId, action: 'in', method: 'qr' })}>
            <LogIn className="h-4 w-4" /> Check In
          </Button>
          <Button variant="secondary" disabled={!staffUserId} loading={mark.isPending}
            onClick={() => mark.mutate({ staffUserId, action: 'out', method: 'qr' })}>
            <LogOut className="h-4 w-4" /> Check Out
          </Button>
        </div>
      </div>

      <h2 className="text-sm font-semibold">Today&apos;s Attendance</h2>
      <DataTable columns={cols} rows={(attendance.data ?? []).filter((a) => a.id).map((a) => ({ ...a, id: a.id as string }))} loading={attendance.isLoading}
        search="" onSearch={() => {}} onPage={() => {}} onSize={() => {}} />
    </div>
  );
}
