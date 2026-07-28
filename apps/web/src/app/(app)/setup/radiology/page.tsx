'use client';

import { PageHeader } from '@/components/ui/page-header';
import { DiagnosticMastersPanel } from '@/components/setup/diagnostic-masters-panel';

export default function RadiologySetupPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Radiology"
        description={<>Categories, parameters and units used by the radiology module</>}
        backHref="/setup"
        backLabel="Back to Setup"
      />

      <DiagnosticMastersPanel modality="radiology" />
    </div>
  );
}
