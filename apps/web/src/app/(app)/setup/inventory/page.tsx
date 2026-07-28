'use client';

import { useState } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { SimpleCatalogPanel } from '@/components/setup/simple-catalog-panel';
import { ItemSupplierPanel } from '@/components/setup/item-supplier-panel';

type Section = 'item-category' | 'item-store' | 'supplier';

export default function InventorySetupPage() {
  const [section, setSection] = useState<Section>('item-category');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <p className="text-sm text-fg-muted">Item categories, stores and suppliers used by the inventory module</p>
      </div>

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
