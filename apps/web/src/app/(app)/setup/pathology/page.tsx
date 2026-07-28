'use client';

import { DiagnosticMastersPanel } from '@/components/setup/diagnostic-masters-panel';

export default function PathologySetupPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Pathology</h1>
        <p className="text-sm text-fg-muted">Categories, parameters and units used by the pathology module</p>
      </div>

      <DiagnosticMastersPanel modality="pathology" />
    </div>
  );
}
