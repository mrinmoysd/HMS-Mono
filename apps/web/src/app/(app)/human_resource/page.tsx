'use client';

import { useState } from 'react';
import { StaffDirectory } from '@/components/hr/staff-directory';
import { StaffForm } from '@/components/hr/staff-form';
import { StaffDetails } from '@/components/hr/staff-details';
import { StaffAttendance } from '@/components/hr/staff-attendance';
import { LeavesView } from '@/components/hr/leaves-view';
import { PayrollView } from '@/components/hr/payroll-view';

type View =
  | { name: 'directory' }
  | { name: 'add' }
  | { name: 'edit'; userId: string }
  | { name: 'details'; userId: string }
  | { name: 'attendance' }
  | { name: 'leaves'; mode: 'my' | 'approve' }
  | { name: 'payroll' };

export default function HumanResourcePage() {
  const [view, setView] = useState<View>({ name: 'directory' });
  const back = () => setView({ name: 'directory' });

  switch (view.name) {
    case 'add':
      return <StaffForm userId={null} onClose={back} />;
    case 'edit':
      return <StaffForm userId={view.userId} onClose={() => setView({ name: 'details', userId: view.userId })} />;
    case 'details':
      return <StaffDetails userId={view.userId} onBack={back} onEdit={() => setView({ name: 'edit', userId: view.userId })} />;
    case 'attendance':
      return <StaffAttendance onBack={back} />;
    case 'leaves':
      return <LeavesView mode={view.mode} onBack={back} onSwitch={(mode) => setView({ name: 'leaves', mode })} />;
    case 'payroll':
      return <PayrollView onBack={back} />;
    default:
      return (
        <StaffDirectory
          onAdd={() => setView({ name: 'add' })}
          onShow={(userId) => setView({ name: 'details', userId })}
          onEdit={(userId) => setView({ name: 'edit', userId })}
          onAttendance={() => setView({ name: 'attendance' })}
          onPayroll={() => setView({ name: 'payroll' })}
          onLeaves={() => setView({ name: 'leaves', mode: 'my' })}
        />
      );
  }
}
