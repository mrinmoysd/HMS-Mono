/** ISO date → "dd-mm-yyyy" (demo list format). */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getUTCFullYear()}`;
}

/** "Name (9002)" label used across the Duty Roster selects/lists. */
export function staffLabel(name: string, staffNo: string | null | undefined): string {
  return staffNo ? `${name} (${staffNo})` : name;
}
