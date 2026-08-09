import { z } from 'zod';
import type { CredentialField } from './channels';

/**
 * Payment gateways — Setup ▸ Settings ▸ Payment Methods.
 *
 * The same registry-driven shape as the message channels, with two differences
 * that only matter when money is involved:
 *
 * 1. **Test vs Live is explicit and per-gateway.** Every gateway here has
 *    separate sandbox and production credentials, and the single most expensive
 *    configuration mistake in this screen is a hospital that believes it is
 *    taking real payments through a sandbox key — every patient sees "paid",
 *    no money arrives, and nobody notices until reconciliation. So the mode is
 *    a stored field, shown on the screen, and carried into the order call.
 *
 * 2. **A processing fee is recorded, not invented.** The gateway keeps a cut;
 *    the hospital needs it visible to reconcile a settlement against an
 *    invoice. It is descriptive — we do not add it to what the patient pays.
 */

export const PAYMENT_GATEWAY_MODES = ['test', 'live'] as const;
export type PaymentGatewayMode = (typeof PAYMENT_GATEWAY_MODES)[number];

export interface PaymentGatewayDef {
  key: string;
  label: string;
  comingSoon?: boolean;
  blurb: string;
  /** Currencies the gateway can be pointed at, for the admin's information. */
  currencies: readonly string[];
  /** Credentials for the sandbox and for production, kept apart. */
  fields: readonly CredentialField[];
}

const KEY_ID = 'Both a test and a live key exist — make sure this one matches the Mode above.';

export const PAYMENT_GATEWAYS: readonly PaymentGatewayDef[] = [
  {
    key: 'razorpay',
    label: 'Razorpay',
    blurb: 'Creates a Razorpay Order and verifies the signature before any payment is recorded.',
    currencies: ['INR'],
    fields: [
      { key: 'keyId', label: 'Key ID', type: 'text', required: true, placeholder: 'rzp_test_… / rzp_live_…', help: KEY_ID },
      { key: 'keySecret', label: 'Key Secret', type: 'password', secret: true, required: true },
      { key: 'currency', label: 'Currency', type: 'text', default: 'INR' },
    ],
  },
  {
    key: 'stripe',
    label: 'Stripe',
    blurb: 'Creates a PaymentIntent and confirms it succeeded before any payment is recorded.',
    currencies: ['INR', 'USD', 'GBP', 'EUR'],
    fields: [
      { key: 'publishableKey', label: 'Publishable Key', type: 'text', required: true, placeholder: 'pk_test_… / pk_live_…' },
      { key: 'secretKey', label: 'Secret Key', type: 'password', secret: true, required: true, placeholder: 'sk_test_… / sk_live_…', help: KEY_ID },
      { key: 'currency', label: 'Currency', type: 'text', default: 'INR' },
    ],
  },
  {
    key: 'paypal',
    label: 'PayPal',
    blurb: 'Creates a PayPal Order and captures it before any payment is recorded.',
    currencies: ['USD', 'GBP', 'EUR'],
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', secret: true, required: true, help: KEY_ID },
      { key: 'currency', label: 'Currency', type: 'text', default: 'USD' },
    ],
  },
  {
    key: 'payu',
    label: 'PayU',
    comingSoon: true,
    blurb: 'Credentials can be stored, but no payment can be taken through PayU yet.',
    currencies: ['INR'],
    fields: [
      { key: 'merchantKey', label: 'Merchant Key', type: 'text', required: true },
      { key: 'merchantSalt', label: 'Merchant Salt', type: 'password', secret: true, required: true },
    ],
  },
  {
    key: 'ccavenue',
    label: 'CCAvenue',
    comingSoon: true,
    blurb: 'Credentials can be stored, but no payment can be taken through CCAvenue yet.',
    currencies: ['INR'],
    fields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text', required: true },
      { key: 'accessCode', label: 'Access Code', type: 'text', required: true },
      { key: 'workingKey', label: 'Working Key', type: 'password', secret: true, required: true },
    ],
  },
  {
    key: 'instamojo',
    label: 'InstaMojo',
    comingSoon: true,
    blurb: 'Credentials can be stored, but no payment can be taken through InstaMojo yet.',
    currencies: ['INR'],
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'text', required: true },
      { key: 'authToken', label: 'Auth Token', type: 'password', secret: true, required: true },
    ],
  },
  {
    key: 'paytm',
    label: 'Paytm',
    comingSoon: true,
    blurb: 'Credentials can be stored, but no payment can be taken through Paytm yet.',
    currencies: ['INR'],
    fields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text', required: true },
      { key: 'merchantKey', label: 'Merchant Key', type: 'password', secret: true, required: true },
    ],
  },
];

export function findGateway(key: string): PaymentGatewayDef | undefined {
  return PAYMENT_GATEWAYS.find((g) => g.key === key);
}

export function gatewaySecretKeys(key: string): string[] {
  return (findGateway(key)?.fields ?? []).filter((f) => f.secret).map((f) => f.key);
}

export function defaultGatewayCredentials(key: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of findGateway(key)?.fields ?? []) out[f.key] = f.default ?? '';
  return out;
}

// ── Stored shape ──────────────────────────────────────────────────────

export const gatewayConfigSchema = z.object({
  status: z.enum(['enabled', 'disabled']).default('disabled'),
  mode: z.enum(PAYMENT_GATEWAY_MODES).default('test'),
  /** Percentage the gateway keeps, e.g. 2 for 2%. Recorded, not charged on. */
  feePercent: z.coerce.number().min(0).max(100).default(0),
  /** Flat amount the gateway keeps per transaction, in the branch currency. */
  feeFixed: z.coerce.number().min(0).default(0),
  credentials: z.record(z.string()).default({}),
});
export type GatewayConfig = z.infer<typeof gatewayConfigSchema>;

export const paymentSettingSchema = z.object({
  /** Null means no online payment is possible — the honest default. */
  activeGateway: z.string().nullable().default(null),
  gateways: z.record(gatewayConfigSchema).default({}),
});
export type PaymentSettingInput = z.infer<typeof paymentSettingSchema>;

export interface PaymentSettingDto extends PaymentSettingInput {
  secretsConfigured: boolean;
}

// ── Validation ────────────────────────────────────────────────────────

/**
 * Every state in which this screen would be lying about taking money.
 *
 * Shared by the screen and the endpoint so both refuse identically.
 */
export function validatePaymentSetting(input: PaymentSettingInput): string[] {
  const problems: string[] = [];

  for (const [key, cfg] of Object.entries(input.gateways)) {
    const def = findGateway(key);
    if (!def) {
      problems.push(`${key}: not a payment gateway`);
      continue;
    }
    if (def.comingSoon && cfg.status === 'enabled') {
      problems.push(`${def.label} cannot be enabled — it is not implemented yet`);
    }
    if (cfg.feePercent >= 100) {
      problems.push(`${def.label} processing fee of ${cfg.feePercent}% would consume the whole payment`);
    }
  }

  const active = input.activeGateway;
  if (!active) return problems;

  const def = findGateway(active);
  if (!def) {
    problems.push(`${active} cannot be the active gateway — it is not a payment gateway`);
    return problems;
  }
  if (def.comingSoon) {
    problems.push(`${def.label} cannot be the active gateway — it is not implemented yet`);
  }
  const cfg = input.gateways[active];
  if (!cfg || cfg.status !== 'enabled') {
    problems.push(`${def.label} is the active gateway but is not enabled`);
  }
  const missing = def.fields
    .filter((f) => f.required && !(cfg?.credentials[f.key] ?? '').trim())
    .map((f) => f.label);
  if (missing.length) {
    problems.push(`${def.label} is the active gateway but is missing: ${missing.join(', ')}`);
  }

  return problems;
}

/**
 * A live gateway holding what look like sandbox keys, or the reverse.
 *
 * Separate from `validatePaymentSetting` because it cannot be certain — key
 * prefixes are a convention, not a contract — so it warns rather than blocking
 * the save. Silence would be worse: this is the mistake that takes a month of
 * "paid" invoices to notice.
 */
export function modeWarnings(input: PaymentSettingInput): string[] {
  const out: string[] = [];
  for (const [key, cfg] of Object.entries(input.gateways)) {
    const def = findGateway(key);
    if (!def) continue;
    for (const f of def.fields) {
      const value = (cfg.credentials[f.key] ?? '').trim();
      if (!value) continue;
      const looksTest = /(^|_)test(_|$)|^sk_test|^pk_test|^rzp_test/i.test(value);
      const looksLive = /(^|_)live(_|$)|^sk_live|^pk_live|^rzp_live/i.test(value);
      if (cfg.mode === 'live' && looksTest) {
        out.push(`${def.label} is set to Live but ${f.label} looks like a test key`);
      }
      if (cfg.mode === 'test' && looksLive) {
        out.push(`${def.label} is set to Test but ${f.label} looks like a live key`);
      }
    }
  }
  return [...new Set(out)];
}

/** True when an online payment could actually be taken right now. */
export function paymentsAreLive(input: PaymentSettingInput): boolean {
  return !!input.activeGateway && validatePaymentSetting(input).length === 0;
}

/**
 * What the gateway keeps from a payment of `amount`, rounded to two decimals.
 *
 * Recorded against the payment so a settlement can be reconciled against an
 * invoice. It is never added to what the patient is asked for — the hospital
 * absorbs it, which is what the reference does and what the fee schedules of
 * these gateways assume.
 */
export function computeProcessingFee(amount: number, cfg: Pick<GatewayConfig, 'feePercent' | 'feeFixed'>): number {
  if (amount <= 0) return 0;
  const fee = (amount * cfg.feePercent) / 100 + cfg.feeFixed;
  return Math.round(Math.min(fee, amount) * 100) / 100;
}

// ── Online payment flow ───────────────────────────────────────────────

/** Step 1: the patient asks to pay an invoice; we open an order at the gateway. */
export const paymentOrderSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than zero'),
});
export type PaymentOrderInput = z.infer<typeof paymentOrderSchema>;

export interface PaymentOrderDto {
  gateway: string;
  mode: PaymentGatewayMode;
  /** The gateway's own order/intent id, to hand to its checkout widget. */
  orderId: string;
  amount: number;
  currency: string;
  /** The publishable/client identifier the browser needs. Never the secret. */
  publicKey: string;
}

/**
 * Step 2: the checkout reports success. Nothing is recorded until the fields
 * here are verified against the gateway — the browser is not a trusted source
 * for "this was paid".
 */
export const paymentVerifySchema = z.object({
  orderId: z.string().trim().min(1),
  /** Razorpay/PayPal payment id; unused by Stripe, which verifies the intent. */
  paymentId: z.string().trim().default(''),
  /** Razorpay HMAC signature; empty for gateways that verify by lookup. */
  signature: z.string().trim().default(''),
});
export type PaymentVerifyInput = z.infer<typeof paymentVerifySchema>;
