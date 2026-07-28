'use client';

import { BloodProductPanel } from '@/components/setup/blood-product-panel';

export default function BloodBankSetupPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Blood Bank</h1>
        <p className="text-sm text-fg-muted">Blood products (component / blood group) used by the blood bank module</p>
      </div>

      <BloodProductPanel />
    </div>
  );
}
