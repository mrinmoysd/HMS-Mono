import { z } from 'zod';

/**
 * Setup ▸ Settings ▸ Backup.
 *
 * **Restore is deliberately not here.** Restoring means executing a supplied
 * SQL script against the live database, which is the same shape as the Addons
 * and System Update screens the parity plan already refuses: content that
 * arrives over HTTP and gets run. One phished administrator would be able to
 * replace every record in the hospital, or worse. Restoring stays a server-side
 * operation with a runbook — see docs/RUNBOOK.md.
 *
 * What is here is the half that is genuinely useful and does not execute
 * anything: take a dump, see what exists, download it, delete it.
 */

export const BACKUP_SOURCES = ['manual', 'pre-deploy'] as const;
export type BackupSource = (typeof BACKUP_SOURCES)[number];

export interface BackupFileDto {
  name: string;
  sizeBytes: number;
  createdAt: string;
  /** `pre-deploy` files are the deploy script's safety net, not ours. */
  source: BackupSource;
}

export interface BackupListDto {
  files: BackupFileDto[];
  /** False when BACKUP_DIR is unset — the screen says so rather than failing. */
  configured: boolean;
  /** False when pg_dump is missing or cannot talk to this server version. */
  canCreate: boolean;
  /** Why not, when `canCreate` is false. */
  blockedReason: string | null;
  keepLast: number;
  totalBytes: number;
}

/**
 * How many **manual** backups to keep. Pre-deploy files are never pruned
 * automatically: they are the deploy's own rollback point, and deleting
 * somebody else's safety net without being asked is not this feature's job.
 */
export const backupSettingSchema = z.object({
  keepLast: z.coerce.number().int().min(1).max(100).default(10),
});
export type BackupSettingInput = z.infer<typeof backupSettingSchema>;

/**
 * The only shape a backup file name may take.
 *
 * Every endpoint that touches a file by name checks this first. The name
 * arrives in a URL, so without it `../../etc/passwd` is a download and
 * `../../../app/dist/main.js` is a delete. Anchored, no dots except the
 * extension, no separators — and the service still resolves the path and
 * confirms it landed inside the backup directory, because one guard in front
 * of the filesystem is never enough.
 */
export const BACKUP_NAME_RE = /^(manual|pre-deploy)-\d{8}-\d{6}\.sql\.gz$/;

export function isSafeBackupName(name: string): boolean {
  return BACKUP_NAME_RE.test(name);
}

/** The source encoded in a valid name, or null if the name is not one of ours. */
export function backupSourceOf(name: string): BackupSource | null {
  if (!isSafeBackupName(name)) return null;
  return name.startsWith('pre-deploy-') ? 'pre-deploy' : 'manual';
}

/** `manual-20260810-221403.sql.gz` for a backup taken now. */
export function backupFileName(at: Date, source: BackupSource = 'manual'): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  const stamp =
    `${at.getUTCFullYear()}${p(at.getUTCMonth() + 1)}${p(at.getUTCDate())}` +
    `-${p(at.getUTCHours())}${p(at.getUTCMinutes())}${p(at.getUTCSeconds())}`;
  return `${source}-${stamp}.sql.gz`;
}

/** Human size for a list that mixes a few KB with a few hundred MB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

/**
 * Which files a prune would remove, newest kept first.
 *
 * Pure so the screen can say "creating this will delete the oldest two" before
 * anybody presses the button, and so the rule is testable without a filesystem.
 */
export function backupsToPrune(files: BackupFileDto[], keepLast: number): BackupFileDto[] {
  const manual = files
    .filter((f) => f.source === 'manual')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return manual.slice(Math.max(0, keepLast));
}
