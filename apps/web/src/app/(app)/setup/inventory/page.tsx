'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useState } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { SimpleCatalogPanel } from '@/components/setup/simple-catalog-panel';
import { ItemSupplierPanel } from '@/components/setup/item-supplier-panel';

type Section = 'item-category' | 'item-store' | 'supplier';

export default function InventorySetupPage() {
  const [section, setSection] = useState<Section>('item-category');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory"
        description={<>Item categories, stores and suppliers used by the inventory module</>}
        backHref="/setup"
        backLabel="Back to Setup"
      />

      <Tabs
        tabs={[
          { value: 'item-category', label: 'Item Category' },
          { value: 'item-store', label: 'Item Store' },
          { value: 'supplier', label: 'Supplier' },
        ]}
        value={section}
        onChange={(s) => setSection(s as Section)}
      />

      {section === 'item-category' && <SimpleCatalogPanel catalog="item-category" label="Item Category" />}
      {section === 'item-store' && <SimpleCatalogPanel catalog="item-store" label="Item Store" />}
      {section === 'supplier' && <ItemSupplierPanel />}
    </div>
  );
}
