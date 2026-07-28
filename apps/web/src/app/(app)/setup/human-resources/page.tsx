'use client';

import { useState } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { SimpleCatalogPanel } from '@/components/setup/simple-catalog-panel';
import { LeaveTypePanel } from '@/components/setup/leave-type-panel';

type Section = 'department' | 'designation' | 'leave-type' | 'specialization';

export default function HumanResourcesSetupPage() {
  const [section, setSection] = useState<Section>('department');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Human Resources</h1>
        <p className="text-sm text-fg-muted">Departments, designations, leave types and specialists used across staff records</p>
      </div>

      <Tabs
        tabs={[
          { value: 'department', label: 'Department' },
          { value: 'designation', label: 'Designation' },
          { value: 'leave-type', label: 'Leave Type' },
          { value: 'specialization', label: 'Specialist' },
        ]}
        value={section}
        onChange={(s) => setSection(s as Section)}
      />

      {section === 'department' && <SimpleCatalogPanel catalog="department" label="Department" />}
      {section === 'designation' && <SimpleCatalogPanel catalog="designation" label="Designation" />}
      {section === 'leave-type' && <LeaveTypePanel />}
      {section === 'specialization' && <SimpleCatalogPanel catalog="specialization" label="Specialist" />}
    </div>
  );
}
