'use client';

import { Download, ChevronDown, Copy, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { Menu, MenuItem } from '@/components/ui/menu';
import { copyTable, exportCsv, exportExcel, printTable, type ExportTable } from '@/lib/export';

/** Reusable Copy / Excel / CSV / PDF / Print export cluster for any list toolbar (Phase C7). */
export function ExportMenu({ table }: { table: () => ExportTable }) {
  return (
    <Menu
      trigger={
        <span className="flex h-8 items-center gap-1 rounded-sm border border-border px-3 text-sm hover:bg-border/40">
          <Download className="h-4 w-4" /> Export <ChevronDown className="h-3.5 w-3.5" />
        </span>
      }
    >
      <MenuItem icon={Copy} onClick={() => copyTable(table())}>Copy</MenuItem>
      <MenuItem icon={FileSpreadsheet} onClick={() => exportExcel(table())}>Excel</MenuItem>
      <MenuItem icon={FileText} onClick={() => exportCsv(table())}>CSV</MenuItem>
      <MenuItem icon={FileText} onClick={() => printTable(table())}>PDF</MenuItem>
      <MenuItem icon={Printer} onClick={() => printTable(table())}>Print</MenuItem>
    </Menu>
  );
}
