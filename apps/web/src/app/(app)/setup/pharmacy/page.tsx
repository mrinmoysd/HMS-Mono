'use client';

import { useState } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { SimpleCatalogPanel } from '@/components/setup/simple-catalog-panel';
import { PharmaSupplierPanel } from '@/components/setup/pharma-supplier-panel';
import { MedicineDosagePanel } from '@/components/setup/medicine-dosage-panel';

type Section =
  | 'medicine-category'
  | 'pharma-company'
  | 'medicine-group'
  | 'medicine-dosage'
  | 'dosage-interval'
  | 'dosage-duration'
  | 'supplier'
  | 'pharma-unit';

export default function PharmacySetupPage() {
  const [section, setSection] = useState<Section>('medicine-category');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Pharmacy</h1>
        <p className="text-sm text-fg-muted">Categories, companies, dosages, suppliers and units used by the pharmacy module</p>
      </div>

      <Tabs
        tabs={[
          { value: 'medicine-category', label: 'Medicine Category' },
          { value: 'pharma-company', label: 'Company' },
          { value: 'medicine-group', label: 'Medicine Group' },
          { value: 'medicine-dosage', label: 'Medicine Dosage' },
          { value: 'dosage-interval', label: 'Dosage Interval' },
          { value: 'dosage-duration', label: 'Dosage Duration' },
          { value: 'supplier', label: 'Supplier' },
          { value: 'pharma-unit', label: 'Unit' },
        ]}
        value={section}
        onChange={(s) => setSection(s as Section)}
      />

      {section === 'medicine-category' && <SimpleCatalogPanel catalog="medicine-category" label="Medicine Category" />}
      {section === 'pharma-company' && <SimpleCatalogPanel catalog="pharma-company" label="Company" />}
      {section === 'medicine-group' && <SimpleCatalogPanel catalog="medicine-group" label="Medicine Group" />}
      {section === 'medicine-dosage' && <MedicineDosagePanel />}
      {section === 'dosage-interval' && <SimpleCatalogPanel catalog="dosage-interval" label="Dosage Interval" />}
      {section === 'dosage-duration' && <SimpleCatalogPanel catalog="dosage-duration" label="Dosage Duration" />}
      {section === 'supplier' && <PharmaSupplierPanel />}
      {section === 'pharma-unit' && <SimpleCatalogPanel catalog="pharma-unit" label="Unit" />}
    </div>
  );
}
