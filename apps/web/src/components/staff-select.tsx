'use client';

import { Select } from '@/components/ui/field';
import { useStaff } from '@/lib/hooks/use-hr';

/** Dropdown of all staff (by user id) for roster/payroll/leave forms. */
export function StaffSelect({ value, onChange }: { value: string; onChange: (userId: string) => void }) {
  const { data } = useStaff(undefined, { size: 200 });
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Select staff…"
      options={(data?.data ?? []).map((s) => ({ value: s.userId, label: `${s.name} (${s.roleLabel})` }))}
    />
  );
}
