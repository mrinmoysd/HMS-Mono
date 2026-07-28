'use client';

import { PageHeader } from '@/components/ui/page-header';
import { DiagnosticMastersPanel } from '@/components/setup/diagnostic-masters-panel';

export default function PathologySetupPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Pathology"
        description={<>Categories, parameters and units used by the pathology module</>}
        backHref="/setup"
        backLabel="Back to Setup"
      />

      <DiagnosticMastersPanel modality="pathology" />
    </div>
  );
}
