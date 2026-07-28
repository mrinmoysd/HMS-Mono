'use client';

import { useState } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { SimpleCatalogPanel } from '@/components/setup/simple-catalog-panel';

type Section = 'income-head' | 'expense-head';

export default function FinanceSetupPage() {
  const [section, setSection] = useState<Section>('income-head');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Finance</h1>
        <p className="text-sm text-fg-muted">Income and expense heads used by the finance ledger</p>
      </div>

      <Tabs
        tabs={[
          { value: 'income-head', label: 'Income Head' },
          { value: 'expense-head', label: 'Expense Head' },
        ]}
        value={section}
        onChange={(s) => setSection(s as Section)}
      />

      {section === 'income-head' && <SimpleCatalogPanel catalog="income-head" label="Income Head" />}
      {section === 'expense-head' && <SimpleCatalogPanel catalog="expense-head" label="Expense Head" />}
    </div>
  );
}
