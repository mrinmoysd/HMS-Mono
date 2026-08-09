import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import {
  channelSettingSchema,
  defaultCredentials,
  findProvider,
  providersFor,
  secretFieldKeys,
  validateChannelSetting,
  type Channel,
  type ChannelSettingDto,
  type ChannelSettingInput,
  type ChannelTestResult,
  type ProviderConfig,
} from '@smart-hospital/shared';
import { SettingsService } from '../settings.service';
import { SettingsCrypto } from '../settings.crypto';
import { senderFor, ProviderError, type Message } from './providers';
import type { RequestUser } from '../../common/types/request-user';

export const channelSettingKey = (channel: Channel) => `channel_${channel}`;

/**
 * Storage and delivery for the three message channels.
 *
 * Credentials are encrypted per-field on the way in and never come back out in
 * the clear — reads return `SettingsCrypto.mask`, which is enough to recognise
 * which key is stored and not enough to use it. There is deliberately no
 * "reveal" endpoint: a credential that can be read back through the API is a
 * credential that leaves the hospital the moment one admin account is phished.
 */
@Injectable()
export class ChannelsService {
  private readonly log = new Logger(ChannelsService.name);
  /** 30s, matching the other settings caches — see ModuleAccessService. */
  private readonly cache = new Map<string, { at: number; value: ChannelSettingInput }>();
  private static readonly TTL_MS = 30_000;

  constructor(
    private readonly settings: SettingsService,
    private readonly crypto: SettingsCrypto,
  ) {}

  /** The stored row, credentials still encrypted. */
  private async raw(branchId: string, channel: Channel): Promise<ChannelSettingInput> {
    const hit = this.cache.get(`${branchId}:${channel}`);
    if (hit && Date.now() - hit.at < ChannelsService.TTL_MS) return hit.value;
    const value = await this.settings.get(branchId, channelSettingKey(channel), channelSettingSchema);
    this.cache.set(`${branchId}:${channel}`, { at: Date.now(), value });
    return value;
  }

  invalidate(branchId: string, channel: Channel): void {
    this.cache.delete(`${branchId}:${channel}`);
  }

  /**
   * What the screen gets: every provider present (so the form has all its
   * tabs), defaults filled in, secrets masked.
   */
  async view(branchId: string, channel: Channel): Promise<ChannelSettingDto> {
    const stored = await this.raw(branchId, channel);
    const providers: Record<string, ProviderConfig> = {};

    for (const def of providersFor(channel)) {
      const saved = stored.providers[def.key];
      const credentials = { ...defaultCredentials(channel, def.key), ...(saved?.credentials ?? {}) };
      for (const key of secretFieldKeys(channel, def.key)) {
        const value = credentials[key];
        if (!value) continue;
        credentials[key] = SettingsCrypto.mask(this.tryDecrypt(value));
      }
      providers[def.key] = { status: saved?.status ?? 'disabled', credentials };
    }

    return {
      channel,
      activeProvider: stored.activeProvider,
      providers,
      secretsConfigured: this.settings.secretsConfigured(),
    };
  }

  /**
   * Save, merging masked values back to what is already stored.
   *
   * The form round-trips whatever the API sent it, so a mask arriving here
   * means "unchanged", not "set this field to bullets". Without this, editing
   * the From Number of a working gateway would overwrite its auth token with a
   * mask and destroy a credential that cannot be recovered.
   */
  async save(actor: RequestUser, channel: Channel, input: ChannelSettingInput): Promise<ChannelSettingDto> {
    const stored = await this.raw(actor.branchId, channel);
    const next: ChannelSettingInput = { activeProvider: input.activeProvider, providers: {} };
    const plain: Record<string, Record<string, string>> = {};

    for (const [key, cfg] of Object.entries(input.providers)) {
      const def = findProvider(channel, key);
      if (!def) continue; // validated below; skipping keeps junk out of storage
      const allowed = new Set(def.fields.map((f) => f.key));
      const secrets = new Set(secretFieldKeys(channel, key));
      const prev = stored.providers[key]?.credentials ?? {};
      const outStored: Record<string, string> = {};
      const outPlain: Record<string, string> = {};

      for (const [fk, rawValue] of Object.entries(cfg.credentials)) {
        if (!allowed.has(fk)) continue; // an unknown field is not silently kept
        const value = rawValue.trim();
        if (!secrets.has(fk)) {
          outStored[fk] = value;
          outPlain[fk] = value;
          continue;
        }
        if (SettingsCrypto.isMask(value)) {
          // Unchanged: carry the stored ciphertext forward untouched.
          if (prev[fk]) {
            outStored[fk] = prev[fk]!;
            outPlain[fk] = this.tryDecrypt(prev[fk]!);
          }
          continue;
        }
        if (!value) continue; // cleared
        outStored[fk] = this.crypto.encrypt(value);
        outPlain[fk] = value;
      }

      next.providers[key] = { status: cfg.status, credentials: outStored };
      plain[key] = outPlain;
    }

    // Validation runs against the *decrypted* view, because "is the active
    // provider missing a required credential" is a question about the real
    // values — a ciphertext is non-empty even when the plaintext was cleared.
    const problems = validateChannelSetting(channel, {
      activeProvider: next.activeProvider,
      providers: Object.fromEntries(
        Object.entries(next.providers).map(([k, v]) => [k, { status: v.status, credentials: plain[k] ?? {} }]),
      ),
    });
    if (problems.length) throw new UnprocessableEntityException(problems.join(' · '));

    await this.settings.set(actor, channelSettingKey(channel), channelSettingSchema, next, {
      isSecret: true,
      preEncrypted: true,
    });
    this.invalidate(actor.branchId, channel);
    return this.view(actor.branchId, channel);
  }

  // ── Delivery ────────────────────────────────────────────────────────

  /** The active provider and its decrypted credentials, or null if not live. */
  private async active(branchId: string, channel: Channel): Promise<{ key: string; creds: Record<string, string> } | null> {
    const stored = await this.raw(branchId, channel);
    const key = stored.activeProvider;
    if (!key) return null;
    const cfg = stored.providers[key];
    if (!cfg || cfg.status !== 'enabled') return null;
    const creds: Record<string, string> = { ...defaultCredentials(channel, key) };
    const secrets = new Set(secretFieldKeys(channel, key));
    for (const [k, v] of Object.entries(cfg.credentials)) {
      creds[k] = v && secrets.has(k) ? this.tryDecrypt(v) : v;
    }
    return { key, creds };
  }

  /**
   * Send one message. Returns a result rather than throwing, because every
   * caller — a test button, an appointment reminder — needs to record the
   * outcome, and an unconfigured channel is a normal state, not an exception.
   */
  async send(branchId: string, channel: Channel, msg: Message): Promise<ChannelTestResult> {
    const active = await this.active(branchId, channel);
    if (!active) {
      return { ok: false, provider: '—', detail: `No enabled ${channel} provider is active. Configure one in Settings.` };
    }
    const send = senderFor(channel, active.key);
    if (!send) {
      // Only reachable if the shared registry and the sender table disagree,
      // which channels.spec.ts exists to prevent.
      return { ok: false, provider: active.key, detail: `${active.key} cannot deliver — it is not implemented.` };
    }
    try {
      const detail = await send(active.creds, msg);
      return { ok: true, provider: active.key, detail };
    } catch (e) {
      const detail =
        e instanceof ProviderError ? e.message
        : e instanceof Error && e.name === 'TimeoutError' ? `${active.key}: the gateway did not respond within 15s`
        : e instanceof Error ? `${active.key}: ${e.message}`
        : `${active.key}: send failed`;
      // Logged without the message body: it may carry patient information.
      this.log.warn(`${channel} send failed via ${active.key}`);
      return { ok: false, provider: active.key, detail };
    }
  }

  /** True when the channel would actually deliver something right now. */
  async isLive(branchId: string, channel: Channel): Promise<boolean> {
    const active = await this.active(branchId, channel);
    return !!active && !!senderFor(channel, active.key);
  }

  /**
   * A credential encrypted under a key that is now gone must not take the
   * settings screen down — the admin needs to reach the form to re-enter it.
   * The value becomes empty, which reads on screen as "not configured" and
   * fails validation the moment they try to make that provider active.
   */
  private tryDecrypt(stored: string): string {
    try {
      return this.crypto.decrypt(stored);
    } catch {
      return '';
    }
  }
}
