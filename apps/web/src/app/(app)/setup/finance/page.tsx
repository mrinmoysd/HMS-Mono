'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useState } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { SimpleCatalogPanel } from '@/components/setup/simple-catalog-panel';

type Section = 'income-head' | 'expense-head';

export default function FinanceSetupPage() {
  const [section, setSection] = useState<Section>('income-head');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Finance"
        description={<>Income and expense heads used by the finance ledger</>}
        backHref="/setup"
        backLabel="Back to Setup"
      />

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
