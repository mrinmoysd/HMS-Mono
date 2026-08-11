import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  backupFileName,
  backupSettingSchema,
  backupSourceOf,
  backupsToPrune,
  isSafeBackupName,
  type BackupFileDto,
  type BackupListDto,
  type BackupSettingInput,
} from '@smart-hospital/shared';
import { SettingsService } from '../settings.service';
import { AuditService } from '../../common/audit/audit.service';
import type { RequestUser } from '../../common/types/request-user';

export const BACKUP_SETTING_KEY = 'backup';

/** A dump of a hospital database should never take longer than this. */
const DUMP_TIMEOUT_MS = 10 * 60 * 1000;

interface Dsn {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

/**
 * Database backups: take one, list them, download one, delete one.
 *
 * There is no restore. See the note at the top of dto/backup.ts — restoring
 * means executing supplied SQL, which is the surface the parity plan already
 * refuses for Addons and System Update.
 *
 * Two things this file is careful about, because both are one mistake away
 * from being serious:
 *
 * 1. **File names arrive in URLs.** Every path is built from a name that
 *    passed `isSafeBackupName`, and then re-checked with `path.resolve` to
 *    confirm it landed inside the backup directory. Either guard alone would
 *    probably do; neither alone is worth betting the filesystem on.
 *
 * 2. **`pg_dump` is spawned, never shelled.** Arguments go as an array and the
 *    password goes through the environment, so a database name or password
 *    containing a quote or a semicolon is data rather than syntax.
 */
@Injectable()
export class BackupService {
  private readonly log = new Logger(BackupService.name);
  private readonly dir: string | null;
  private readonly dsn: Dsn | null;
  /** One dump at a time — two concurrent pg_dumps help nobody. */
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {
    const dir = config.get<string>('BACKUP_DIR');
    this.dir = dir ? path.resolve(dir) : null;
    this.dsn = BackupService.parseDsn(config.get<string>('DATABASE_URL') ?? '');
  }

  private static parseDsn(url: string): Dsn | null {
    try {
      const u = new URL(url);
      if (!u.protocol.startsWith('postgres')) return null;
      return {
        host: u.hostname || 'localhost',
        port: u.port || '5432',
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        database: decodeURIComponent(u.pathname.replace(/^\//, '')),
      };
    } catch {
      return null;
    }
  }

  // ── Reading ─────────────────────────────────────────────────────────

  async list(branchId: string): Promise<BackupListDto> {
    const { keepLast } = await this.setting(branchId);
    if (!this.dir) {
      return {
        files: [],
        configured: false,
        canCreate: false,
        blockedReason:
          'BACKUP_DIR is not set on this deployment, so backups cannot be written or listed.',
        keepLast,
        totalBytes: 0,
      };
    }

    const files = await this.readDir();
    const blocked = await this.dumpBlockedReason();
    return {
      files,
      configured: true,
      canCreate: blocked === null,
      blockedReason: blocked,
      keepLast,
      totalBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),
    };
  }

  /**
   * The directory is the source of truth, not a table.
   *
   * The deploy script writes `pre-deploy-*.gz` here without going through the
   * API at all, so a table would be missing exactly the backups somebody looks
   * for after a bad release. Anything not matching our naming is ignored
   * rather than shown, so a stray file cannot be downloaded through this.
   */
  private async readDir(): Promise<BackupFileDto[]> {
    if (!this.dir) return [];
    let names: string[];
    try {
      names = await fs.readdir(this.dir);
    } catch {
      return [];
    }

    const out: BackupFileDto[] = [];
    for (const name of names) {
      const source = backupSourceOf(name);
      if (!source) continue;
      try {
        const stat = await fs.stat(path.join(this.dir, name));
        if (!stat.isFile()) continue;
        out.push({ name, source, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() });
      } catch {
        // Vanished between readdir and stat; not an error worth surfacing.
      }
    }
    return out.sort((a, b) => b.name.localeCompare(a.name));
  }

  /**
   * A path inside the backup directory, or a refusal.
   *
   * Belt and braces: the name must match the shared pattern, and the resolved
   * path must still sit inside the directory afterwards.
   */
  private resolveSafe(name: string): string {
    if (!this.dir) throw new ServiceUnavailableException('BACKUP_DIR is not set on this deployment.');
    if (!isSafeBackupName(name)) throw new BadRequestException('Not a valid backup file name.');
    const full = path.resolve(this.dir, name);
    if (path.dirname(full) !== this.dir) {
      this.log.warn(`Rejected backup path outside the backup directory: ${name}`);
      throw new BadRequestException('Not a valid backup file name.');
    }
    return full;
  }

  async fileFor(name: string): Promise<{ path: string; size: number }> {
    const full = this.resolveSafe(name);
    try {
      const stat = await fs.stat(full);
      if (!stat.isFile()) throw new Error('not a file');
      return { path: full, size: stat.size };
    } catch {
      throw new NotFoundException('Backup not found');
    }
  }

  // ── Writing ─────────────────────────────────────────────────────────

  /** Why a dump cannot be taken right now, or null. */
  private async dumpBlockedReason(): Promise<string | null> {
    if (!this.dir) return 'BACKUP_DIR is not set on this deployment.';
    if (!this.dsn) return 'DATABASE_URL could not be read.';
    try {
      await fs.mkdir(this.dir, { recursive: true });
      await fs.access(this.dir, fs.constants.W_OK);
    } catch {
      return `The backup directory is not writable by the API process (${this.dir}).`;
    }
    const version = await this.pgDumpVersion();
    if (!version) return 'pg_dump is not installed on this server.';
    return null;
  }

  private pgDumpVersion(): Promise<string | null> {
    return new Promise((resolve) => {
      const child = spawn('pg_dump', ['--version']);
      let out = '';
      child.stdout.on('data', (c) => (out += String(c)));
      child.on('error', () => resolve(null));
      child.on('close', (code) => resolve(code === 0 ? out.trim() : null));
    });
  }

  async create(actor: RequestUser, branchId: string): Promise<BackupFileDto> {
    const blocked = await this.dumpBlockedReason();
    if (blocked) throw new ServiceUnavailableException(blocked);
    if (this.running) throw new BadRequestException('A backup is already running.');

    this.running = true;
    const name = backupFileName(new Date(), 'manual');
    const finalPath = this.resolveSafe(name);
    // Written under a temp name and renamed on success, so a failed or
    // truncated dump never sits in the list looking like something you could
    // restore from.
    const tempPath = `${finalPath}.part`;

    try {
      await this.runDump(tempPath);
      await fs.rename(tempPath, finalPath);
    } catch (e) {
      await fs.rm(tempPath, { force: true }).catch(() => undefined);
      const detail = e instanceof Error ? e.message : 'pg_dump failed';
      this.log.error(`Backup failed: ${detail}`);
      throw new InternalServerErrorException(detail);
    } finally {
      this.running = false;
    }

    const stat = await fs.stat(finalPath);
    await this.audit.record({
      branchId,
      userId: actor.id,
      action: 'backup_create',
      entity: 'backup',
      entityId: name,
      after: { name, sizeBytes: stat.size },
    });

    await this.prune(actor, branchId);
    return { name, source: 'manual', sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
  }

  private async runDump(target: string): Promise<void> {
    const dsn = this.dsn!;
    // Arguments as an array and no shell: a database name containing a quote
    // or a semicolon is a value here, not syntax.
    const args = [
      '--host', dsn.host,
      '--port', dsn.port,
      '--username', dsn.user,
      '--no-password',
      '--no-owner',
      '--no-privileges',
      '--format=plain',
      dsn.database,
    ];

    const child = spawn('pg_dump', args, {
      env: { ...process.env, PGPASSWORD: dsn.password },
    });

    let stderr = '';
    child.stderr.on('data', (c) => {
      // Bounded: a version mismatch repeats its complaint for every table.
      if (stderr.length < 4000) stderr += String(c);
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, DUMP_TIMEOUT_MS);

    // Both halves are awaited, and this is the whole point of the rewrite that
    // replaced the first version of this method.
    //
    //   `exited`   — pg_dump finished, and with what code.
    //   `written`  — the gzip stream actually flushed every byte to disk.
    //
    // Resolving on the process alone renames a file that is still being
    // written: the dump looks complete, `stat` reports a size short of the
    // truth, and a large enough database could be renamed mid-write and sit in
    // the list as a backup nobody can restore from. Caught by comparing the
    // size reported at creation against the bytes that came back on download.
    const written = pipeline(child.stdout, createGzip(), createWriteStream(target));
    const exited = new Promise<number>((resolve, reject) => {
      child.on('error', (err) => reject(new Error(`pg_dump could not be started: ${err.message}`)));
      child.on('close', (code) => resolve(code ?? -1));
    });

    try {
      const [code] = await Promise.all([exited, written]);
      if (code === 0) return;
      if (timedOut) throw new Error(`pg_dump timed out after ${DUMP_TIMEOUT_MS / 60000} minutes.`);
      // The most common real failure is a pg_dump older than the server — it
      // refuses rather than producing a partial dump, and the operator needs
      // to read that sentence to know what to install.
      const first = stderr.split('\n').find((l) => l.trim().length > 0) ?? '';
      throw new Error(first ? `pg_dump failed: ${first.trim()}` : `pg_dump exited with code ${code}.`);
    } finally {
      clearTimeout(timer);
      // If the write side failed, `Promise.all` came back while pg_dump was
      // still going. Nothing is reading its output any more, so leaving it
      // running just holds a connection open against the live database.
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }
  }

  /**
   * A download leaves the building with every patient record in it. That is
   * worth its own audit line, separate from the backup being created.
   */
  async recordDownload(actor: RequestUser, branchId: string, name: string): Promise<void> {
    await this.audit.record({
      branchId,
      userId: actor.id,
      action: 'backup_download',
      entity: 'backup',
      entityId: name,
      after: { name },
    });
  }

  async remove(actor: RequestUser, branchId: string, name: string): Promise<void> {
    const { path: full } = await this.fileFor(name);
    await fs.rm(full);
    await this.audit.record({
      branchId,
      userId: actor.id,
      action: 'backup_delete',
      entity: 'backup',
      entityId: name,
      after: { name },
    });
  }

  /** Trim manual backups past the retention limit. Pre-deploy files are left. */
  private async prune(actor: RequestUser, branchId: string): Promise<void> {
    const { keepLast } = await this.setting(branchId);
    const doomed = backupsToPrune(await this.readDir(), keepLast);
    for (const f of doomed) {
      try {
        await fs.rm(this.resolveSafe(f.name));
        await this.audit.record({
          branchId,
          userId: actor.id,
          action: 'backup_prune',
          entity: 'backup',
          entityId: f.name,
          after: { name: f.name, keepLast },
        });
      } catch {
        this.log.warn(`Could not prune ${f.name}`);
      }
    }
  }

  // ── Retention setting ───────────────────────────────────────────────

  setting(branchId: string): Promise<BackupSettingInput> {
    return this.settings.get(branchId, BACKUP_SETTING_KEY, backupSettingSchema);
  }

  async saveSetting(actor: RequestUser, input: BackupSettingInput): Promise<BackupSettingInput> {
    return this.settings.set(actor, BACKUP_SETTING_KEY, backupSettingSchema, input);
  }
}
