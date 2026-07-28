'use client';

import { useState } from 'react';
import { StockView } from '@/components/inventory/stock-view';
import { ItemView } from '@/components/inventory/item-view';
import { IssueView } from '@/components/inventory/issue-view';

type View = 'stock' | 'item' | 'issue';

export default function InventoryPage() {
  const [view, setView] = useState<View>('stock');
  if (view === 'item') return <ItemView onBack={() => setView('stock')} />;
  if (view === 'issue') return <IssueView onBack={() => setView('stock')} />;
  return <StockView onShowItems={() => setView('item')} onShowIssues={() => setView('issue')} />;
}
