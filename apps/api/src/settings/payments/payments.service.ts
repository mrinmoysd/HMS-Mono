import { BadRequestException, Injectable, Logger, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import {
  PAYMENT_GATEWAYS,
  computeProcessingFee,
  defaultGatewayCredentials,
  findGateway,
  gatewaySecretKeys,
  paymentSettingSchema,
  validatePaymentSetting,
  type GatewayConfig,
  type PaymentOrderDto,
  type PaymentSettingDto,
  type PaymentSettingInput,
  type PaymentVerifyInput,
} from '@smart-hospital/shared';
import { SettingsService } from '../settings.service';
import { SettingsCrypto } from '../settings.crypto';
import { adapterFor, GatewayError, type VerifyResult } from './gateways';
import type { RequestUser } from '../../common/types/request-user';

export const PAYMENT_SETTING_KEY = 'payment_gateways';

/**
 * Payment gateway configuration, and the two halves of an online payment.
 *
 * Storage follows ChannelsService exactly — per-field encryption, masked
 * reads, mask-preserving writes — because the same mistakes cost the same
 * thing. What differs is everything after `createOrder`: money is involved, so
 * nothing is recorded on a client's say-so.
 */
@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);
  private readonly cache = new Map<string, { at: number; value: PaymentSettingInput }>();
  private static readonly TTL_MS = 30_000;

  constructor(
    private readonly settings: SettingsService,
    private readonly crypto: SettingsCrypto,
  ) {}

  private async raw(branchId: string): Promise<PaymentSettingInput> {
    const hit = this.cache.get(branchId);
    if (hit && Date.now() - hit.at < PaymentsService.TTL_MS) return hit.value;
    const value = await this.settings.get(branchId, PAYMENT_SETTING_KEY, paymentSettingSchema);
    this.cache.set(branchId, { at: Date.now(), value });
    return value;
  }

  invalidate(branchId: string): void {
    this.cache.delete(branchId);
  }

  /** Every gateway, defaults filled in, secrets masked. */
  async view(branchId: string): Promise<PaymentSettingDto> {
    const stored = await this.raw(branchId);
    const gateways: Record<string, GatewayConfig> = {};

    for (const def of PAYMENT_GATEWAYS) {
      const saved = stored.gateways[def.key];
      const credentials = { ...defaultGatewayCredentials(def.key), ...(saved?.credentials ?? {}) };
      for (const key of gatewaySecretKeys(def.key)) {
        if (credentials[key]) credentials[key] = SettingsCrypto.mask(this.tryDecrypt(credentials[key]!));
      }
      gateways[def.key] = {
        status: saved?.status ?? 'disabled',
        mode: saved?.mode ?? 'test',
        feePercent: saved?.feePercent ?? 0,
        feeFixed: saved?.feeFixed ?? 0,
        credentials,
      };
    }

    return {
      activeGateway: stored.activeGateway,
      gateways,
      secretsConfigured: this.settings.secretsConfigured(),
    };
  }

  /** Save, treating a mask as "unchanged" so an edit cannot destroy a key. */
  async save(actor: RequestUser, input: PaymentSettingInput): Promise<PaymentSettingDto> {
    const stored = await this.raw(actor.branchId);
    const next: PaymentSettingInput = { activeGateway: input.activeGateway, gateways: {} };
    const plain: Record<string, Record<string, string>> = {};

    for (const [key, cfg] of Object.entries(input.gateways)) {
      const def = findGateway(key);
      if (!def) continue;
      const allowed = new Set(def.fields.map((f) => f.key));
      const secrets = new Set(gatewaySecretKeys(key));
      const prev = stored.gateways[key]?.credentials ?? {};
      const outStored: Record<string, string> = {};
      const outPlain: Record<string, string> = {};

      for (const [fk, rawValue] of Object.entries(cfg.credentials)) {
        if (!allowed.has(fk)) continue;
        const value = rawValue.trim();
        if (!secrets.has(fk)) {
          outStored[fk] = value;
          outPlain[fk] = value;
          continue;
        }
        if (SettingsCrypto.isMask(value)) {
          if (prev[fk]) {
            outStored[fk] = prev[fk]!;
            outPlain[fk] = this.tryDecrypt(prev[fk]!);
          }
          continue;
        }
        if (!value) continue;
        outStored[fk] = this.crypto.encrypt(value);
        outPlain[fk] = value;
      }

      next.gateways[key] = { ...cfg, credentials: outStored };
      plain[key] = outPlain;
    }

    // Validated against decrypted values: a ciphertext is non-empty even when
    // the plaintext behind it was cleared.
    const problems = validatePaymentSetting({
      activeGateway: next.activeGateway,
      gateways: Object.fromEntries(
        Object.entries(next.gateways).map(([k, v]) => [k, { ...v, credentials: plain[k] ?? {} }]),
      ),
    });
    if (problems.length) throw new UnprocessableEntityException(problems.join(' · '));

    await this.settings.set(actor, PAYMENT_SETTING_KEY, paymentSettingSchema, next, {
      isSecret: true,
      preEncrypted: true,
    });
    this.invalidate(actor.branchId);
    return this.view(actor.branchId);
  }

  // ── Online payment ──────────────────────────────────────────────────

  private async active(branchId: string): Promise<{ key: string; cfg: GatewayConfig; creds: Record<string, string> }> {
    const stored = await this.raw(branchId);
    const key = stored.activeGateway;
    if (!key) {
      throw new ServiceUnavailableException(
        'Online payment is not available: no payment gateway is configured. Settings ▸ Payment Methods.',
      );
    }
    const cfg = stored.gateways[key];
    if (!cfg || cfg.status !== 'enabled') {
      throw new ServiceUnavailableException(`Online payment is not available: ${key} is not enabled.`);
    }
    if (!adapterFor(key)) {
      throw new ServiceUnavailableException(`Online payment is not available: ${key} cannot take payments.`);
    }
    const creds: Record<string, string> = { ...defaultGatewayCredentials(key) };
    const secrets = new Set(gatewaySecretKeys(key));
    for (const [k, v] of Object.entries(cfg.credentials)) {
      creds[k] = v && secrets.has(k) ? this.tryDecrypt(v) : v;
    }
    return { key, cfg, creds };
  }

  /**
   * Step 1 — open an order at the gateway for a specific invoice.
   *
   * The invoice id is stamped into the gateway's own metadata here. That is
   * what makes step 2 able to refuse a payment raised against one invoice and
   * presented to settle another.
   */
  async createOrder(branchId: string, invoiceId: string, receipt: string, amount: number): Promise<PaymentOrderDto> {
    const { key, cfg, creds } = await this.active(branchId);
    const currency = creds.currency || 'INR';
    try {
      const order = await adapterFor(key)!.createOrder(creds, cfg.mode, { amount, currency, invoiceId, receipt });
      return { gateway: key, mode: cfg.mode, orderId: order.orderId, amount, currency, publicKey: order.publicKey };
    } catch (e) {
      throw this.asHttp(e, key);
    }
  }

  /**
   * Step 2 — confirm with the gateway that the order was paid.
   *
   * Returns what the *gateway* says was collected, never what the caller
   * claimed. The caller records that figure and nothing else.
   */
  async verifyOrder(branchId: string, invoiceId: string, input: PaymentVerifyInput): Promise<VerifyResult & { fee: number; gateway: string }> {
    const { key, cfg, creds } = await this.active(branchId);
    let result: VerifyResult;
    try {
      result = await adapterFor(key)!.verify(creds, cfg.mode, input);
    } catch (e) {
      throw this.asHttp(e, key);
    }

    if (result.invoiceId !== invoiceId) {
      // The order was opened against a different invoice. Recording it here
      // would settle a bill nobody paid.
      this.log.warn(`Payment verification rejected: order belongs to another invoice (branch ${branchId})`);
      throw new BadRequestException('This payment was raised for a different invoice.');
    }
    if (!(result.amount > 0)) {
      throw new BadRequestException('The gateway reports no amount was collected.');
    }

    return { ...result, gateway: key, fee: computeProcessingFee(result.amount, cfg) };
  }

  /** Whether the branch could take an online payment right now. */
  async isLive(branchId: string): Promise<boolean> {
    const stored = await this.raw(branchId);
    const key = stored.activeGateway;
    if (!key) return false;
    const cfg = stored.gateways[key];
    return !!cfg && cfg.status === 'enabled' && !!adapterFor(key);
  }

  private asHttp(e: unknown, gateway: string): Error {
    if (e instanceof GatewayError) return new BadRequestException(e.message);
    if (e instanceof Error && e.name === 'TimeoutError') {
      return new ServiceUnavailableException(`${gateway} did not respond in time. No payment was recorded.`);
    }
    this.log.warn(`${gateway} payment call failed`);
    return new BadRequestException(`${gateway}: the payment could not be completed.`);
  }

  private tryDecrypt(stored: string): string {
    try {
      return this.crypto.decrypt(stored);
    } catch {
      return '';
    }
  }
}
