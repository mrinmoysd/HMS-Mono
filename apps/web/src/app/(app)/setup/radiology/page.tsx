'use client';

import { DiagnosticMastersPanel } from '@/components/setup/diagnostic-masters-panel';

export default function RadiologySetupPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Radiology</h1>
        <p className="text-sm text-fg-muted">Categories, parameters and units used by the radiology module</p>
      </div>

      <DiagnosticMastersPanel modality="radiology" />
    </div>
  );
}
