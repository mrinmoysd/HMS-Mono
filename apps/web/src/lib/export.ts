/**
 * Dependency-free table export cluster (Copy / CSV / Excel / PDF / Print),
 * matching the demo's list toolbar. Rows are plain string matrices.
 */

export interface ExportTable {
  title: string;
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** Copy as TSV so it pastes straight into a spreadsheet. */
export async function copyTable({ headers, rows }: ExportTable): Promise<void> {
  const tsv = [headers, ...rows].map((r) => r.join('\t')).join('\n');
  await navigator.clipboard.writeText(tsv);
}

export function exportCsv({ headers, rows, filename }: ExportTable): void {
  const csv = [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`);
}

/** An HTML-table workbook — opens natively in Excel without a heavy dependency. */
export function exportExcel({ title, headers, rows, filename }: ExportTable): void {
  const thead = `<tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const tbody = rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`).join('');
  const html = `<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><table border="1">${thead}${tbody}</table></body></html>`;
  download(new Blob([html], { type: 'application/vnd.ms-excel' }), `${filename}.xls`);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Open a print window; the user can Print or "Save as PDF" from the dialog. */
export function printTable({ title, headers, rows }: ExportTable): void {
  const w = window.open('', '_blank');
  if (!w) return;
  const thead = `<tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const tbody = rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`).join('');
  w.document.write(`<html><head><title>${escapeHtml(title)}</title>
    <style>
      body{font-family:Inter,system-ui,sans-serif;padding:24px;color:#0f172a}
      h1{font-size:18px;margin:0 0 16px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
      th{background:#f1f5f9}
    </style></head>
    <body><h1>${escapeHtml(title)}</h1><table><thead>${thead}</thead><tbody>${tbody}</tbody></table></body></html>`);
  w.document.close();
  w.focus();
  w.print();
}
