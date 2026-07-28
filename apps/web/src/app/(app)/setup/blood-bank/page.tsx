'use client';

import { PageHeader } from '@/components/ui/page-header';
import { BloodProductPanel } from '@/components/setup/blood-product-panel';

export default function BloodBankSetupPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Blood Bank"
        description={<>Blood products (component / blood group) used by the blood bank module</>}
        backHref="/setup"
        backLabel="Back to Setup"
      />

      <BloodProductPanel />
    </div>
  );
}
