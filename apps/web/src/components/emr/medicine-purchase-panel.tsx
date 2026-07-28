'use client';

import { useState } from 'react';
import { Plus, Eye } from 'lucide-react';
import type { MedicinePurchaseDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { ExportMenu } from '@/components/ui/export-menu';
import type { ExportTable } from '@/lib/export';
import { useMedicinePurchases } from '@/lib/hooks/use-departments';
import { useAbility } from '@/lib/auth-store';
import { PurchaseMedicineForm } from './purchase-medicine-form';
import { PurchaseDetailsModal } from './purchase-details-modal';

/** Medicine Purchase List tab: purchase history + Add/Details actions. TPA rate scheduling opens per-batch from the details modal in a follow-up click. */
export function MedicinePurchasePanel() {
  const ability = useAbility();
  const canAdd = ability.can('pharmacy', 'add');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, error } = useMedicinePurchases({ search, page, size });

  function exportTable(): ExportTable {
    const rows = data?.data ?? [];
    return {
      title: 'Medicine Purchase List',
      filename: 'medicine-purchases',
      headers: ['Purchase No', 'Purchase Date', 'Bill No', 'Supplier', 'Total', 'Discount', 'Tax', 'Net Amount'],
      rows: rows.map((p) => [
        p.purchaseNo, new Date(p.purchaseDate).toLocaleString(), p.billNo ?? '', p.supplierName ?? '',
        p.total.toFixed(2), p.discount.toFixed(2), p.tax.toFixed(2), p.netAmount.toFixed(2),
      ]),
    };
  }

  const columns: Column<MedicinePurchaseDto>[] = [
    { key: 'purchaseNo', header: 'Pharmacy Purchase No', className: 'font-medium' },
    { key: 'purchaseDate', header: 'Purchase Date', render: (p) => new Date(p.purchaseDate).toLocaleString() },
    { key: 'billNo', header: 'Bill No', render: (p) => p.billNo ?? '—' },
    { key: 'supplierName', header: 'Supplier Name', render: (p) => p.supplierName ?? '—' },
    { key: 'total', header: 'Total ($)', className: 'tabular', render: (p) => p.total.toFixed(2) },
    { key: 'discount', header: 'Discount ($)', className: 'tabular', render: (p) => p.discount.toFixed(2) },
    { key: 'tax', header: 'Tax ($)', className: 'tabular', render: (p) => p.tax.toFixed(2) },
    { key: 'netAmount', header: 'Net Amount ($)', className: 'tabular', render: (p) => p.netAmount.toFixed(2) },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        meta={data?.meta}
        loading={isLoading}
        error={error ? 'Failed to load purchases' : undefined}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        onPage={setPage}
        onSize={(s) => { setSize(s); setPage(1); }}
        toolbar={
          <>
            <ExportMenu table={exportTable} />
            {canAdd && (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> Purchase Medicine
              </Button>
            )}
          </>
        }
        rowActions={(p) => (
          <button onClick={() => setDetailId(p.id)} aria-label="Details" title="Details" className="flex h-7 items-center gap-1 rounded-sm px-2 text-xs text-fg-muted hover:bg-primary/10 hover:text-primary">
            <Eye className="h-4 w-4" /> Details
          </button>
        )}
      />

      <PurchaseMedicineForm open={open} onClose={() => setOpen(false)} />
      <PurchaseDetailsModal id={detailId} open={!!detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
