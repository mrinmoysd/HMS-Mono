'use client';

import { useState } from 'react';
import { AlertTriangle, Database, Download, HardDriveDownload, Info, Trash2 } from 'lucide-react';
import { backupsToPrune, formatBytes, type BackupFileDto } from '@smart-hospital/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Field, TextInput } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import {
  useBackups,
  useCreateBackup,
  useDeleteBackup,
  useSaveBackupRetention,
} from '@/lib/hooks/use-settings';

export default function BackupPage() {
  const { data, isLoading, error } = useBackups();
  const create = useCreateBackup();
  const remove = useDeleteBackup();
  const saveRetention = useSaveBackupRetention();
  const toast = useToast();
  const confirm = useConfirm();

  const [keepLast, setKeepLast] = useState<string>('');
  const [downloading, setDownloading] = useState<string | null>(null);

  // Super Admin only — a dump is every patient record in one file.
  if (error) {
    return (
      <div className="space-y-4 pb-4">
        <PageHeader title="Backup" description="Database backups for this hospital." />
        <div role="alert" className="rounded-md border border-border bg-surface p-4 text-sm">
          <p className="font-medium">This screen is restricted to Super Admin.</p>
          <p className="mt-1 text-fg-muted">
            A backup contains every patient record in the system, so taking one off-site is limited
            to the top account rather than any administrator.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;

  const pending = keepLast === '' ? data.keepLast : Number(keepLast);
  const wouldPrune = backupsToPrune(data.files, Number.isFinite(pending) ? pending : data.keepLast);

  async function onCreate() {
    try {
      const made = await create.mutateAsync();
      toast.success(`Backup taken — ${formatBytes(made.sizeBytes)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Backup failed');
    }
  }

  async function onDownload(f: BackupFileDto) {
    setDownloading(f.name);
    try {
      await api.download(`/settings/backups/${encodeURIComponent(f.name)}/download`, f.name);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloading(null);
    }
  }

  async function onDelete(f: BackupFileDto) {
    const ok = await confirm({
      title: 'Delete this backup?',
      description:
        f.source === 'pre-deploy'
          ? `${f.name} was taken automatically before a deploy. It is the rollback point for that release.`
          : `${f.name} cannot be recovered once deleted.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(f.name);
      toast.success('Backup deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete');
    }
  }

  async function onSaveRetention() {
    const n = Number(keepLast);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      toast.error('Keep between 1 and 100 backups');
      return;
    }
    try {
      await saveRetention.mutateAsync({ keepLast: n });
      toast.success('Retention saved');
      setKeepLast('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Backup"
        description="Take a copy of the hospital database, download it, and keep the last few."
      />

      {/*
        The reason there is no Restore button. Said plainly on the screen rather
        than only in a commit message, because the person looking for it is
        entitled to know it was a decision and where to go instead.
      */}
      <div className="flex items-start gap-2 rounded-md border border-border bg-bg p-3 text-sm text-fg-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <strong>Restoring is deliberately not a button here.</strong> A restore replaces every
          record in the hospital by executing the contents of a file, which is the one thing this
          product refuses to do over the web — the same reason there is no in-app updater. Restores
          are run on the server against a downloaded file; the steps are in{' '}
          <code className="font-mono text-xs">docs/RUNBOOK.md</code>.
        </span>
      </div>

      {!data.configured && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>{data.blockedReason}</span>
        </div>
      )}

      {data.configured && !data.canCreate && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Backups cannot be taken on this deployment:</p>
            <p className="mt-0.5">{data.blockedReason}</p>
          </div>
        </div>
      )}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-fg-muted" />
          <div>
            <p className="text-sm font-medium">
              {data.files.length} backup{data.files.length === 1 ? '' : 's'} · {formatBytes(data.totalBytes)}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">
              Keeping the last {data.keepLast} manual backups. Pre-deploy copies are never removed
              automatically.
            </p>
          </div>
        </div>
        <Button onClick={onCreate} disabled={create.isPending || !data.canCreate}>
          <HardDriveDownload className="mr-1.5 h-4 w-4" />
          {create.isPending ? 'Taking backup…' : 'Create backup'}
        </Button>
      </section>

      <section className="rounded-md border border-border bg-surface">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-3">
          <div className="w-40">
            <Field label="Keep last" hint="Manual backups only">
              <TextInput
                type="number"
                value={keepLast === '' ? String(data.keepLast) : keepLast}
                onChange={(e) => setKeepLast(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            {wouldPrune.length > 0 && (
              <span className="text-xs text-warning">
                Saving this removes {wouldPrune.length} older backup
                {wouldPrune.length === 1 ? '' : 's'}.
              </span>
            )}
            <Button variant="secondary" onClick={onSaveRetention} disabled={saveRetention.isPending || keepLast === ''}>
              Save retention
            </Button>
          </div>
        </div>

        {data.files.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-fg-muted">
            No backups yet. Taking one before a risky change is the cheapest insurance here.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {data.files.map((f) => (
              <li key={f.name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="flex items-center gap-2 font-mono text-sm">
                    {f.name}
                    {f.source === 'pre-deploy' && <Badge tone="neutral">Pre-deploy</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {formatDateTime(f.createdAt)} · {formatBytes(f.sizeBytes)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onDownload(f)} disabled={downloading === f.name}>
                    <Download className="mr-1 h-3.5 w-3.5" />
                    {downloading === f.name ? 'Downloading…' : 'Download'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(f)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}
