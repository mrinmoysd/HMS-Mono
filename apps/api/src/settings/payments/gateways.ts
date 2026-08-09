import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Payment gateway adapters: open an order, then confirm one was actually paid.
 *
 * Two rules hold for every gateway here, and they are the entire reason this
 * file is separate from the settings screen:
 *
 * 1. **The browser is never the source of truth for "this was paid."** Verify
 *    re-reads the order from the gateway over a server-to-server call. A
 *    checkout callback is an assertion by an untrusted client; the gateway's
 *    own record is evidence.
 *
 * 2. **The amount comes back from the gateway, never from the request.** We
 *    record what the gateway says was collected. A client that reports a
 *    larger figure than it paid cannot move the number we write down.
 *
 * The invoice the order belongs to is stamped into the gateway's own metadata
 * at creation and read back at verification, so a payment for one invoice
 * cannot be redirected to settle another.
 */

const TIMEOUT_MS = 20_000;

export type Credentials = Record<string, string>;
export type GatewayMode = 'test' | 'live';

export interface OrderRequest {
  amount: number;
  currency: string;
  invoiceId: string;
  /** Shown on the gateway's own dashboard, to make reconciliation possible. */
  receipt: string;
}

export interface OrderResult {
  orderId: string;
  publicKey: string;
}

export interface VerifyRequest {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface VerifyResult {
  /** The amount the gateway confirms it collected, in major units. */
  amount: number;
  currency: string;
  /** The invoice stamped on the order when it was created. */
  invoiceId: string;
  /** The gateway's payment identifier, stored as the payment reference. */
  reference: string;
}

export class GatewayError extends Error {
  constructor(gateway: string, detail: string) {
    super(`${gateway}: ${detail}`);
    this.name = 'GatewayError';
  }
}

export interface GatewayAdapter {
  createOrder(creds: Credentials, mode: GatewayMode, req: OrderRequest): Promise<OrderResult>;
  verify(creds: Credentials, mode: GatewayMode, req: VerifyRequest): Promise<VerifyResult>;
}

function request(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

async function detailOf(res: Response): Promise<string> {
  let text: string;
  try {
    text = (await res.text()).slice(0, 500);
  } catch {
    return `HTTP ${res.status}`;
  }
  try {
    const j = JSON.parse(text) as Record<string, any>;
    const m = j.error?.description ?? j.error?.message ?? j.message ?? j.error;
    if (typeof m === 'string') return `HTTP ${res.status} — ${m}`;
  } catch {
    /* not JSON */
  }
  return text ? `HTTP ${res.status} — ${text}` : `HTTP ${res.status}`;
}

/**
 * Constant-time comparison of two hex digests.
 *
 * A plain `===` on a signature leaks, through timing, how many leading bytes
 * an attacker got right — which turns forging one into a few thousand guesses
 * instead of an impossible search.
 */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Razorpay's documented signature: HMAC-SHA256 of `order_id|payment_id` keyed
 * with the account's key secret. Exported so it can be tested against known
 * vectors without touching the network.
 */
export function razorpaySignature(keySecret: string, orderId: string, paymentId: string): string {
  return createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
}

/** Minor units (paise/cents), which is what these gateways transact in. */
function toMinor(amount: number): number {
  return Math.round(amount * 100);
}
function fromMinor(minor: number): number {
  return Math.round(minor) / 100;
}

// ── Razorpay ──────────────────────────────────────────────────────────

const razorpay: GatewayAdapter = {
  async createOrder(creds, _mode, req) {
    // Razorpay has no separate host for test mode — the key prefix decides it.
    const res = await request('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: toMinor(req.amount),
        currency: req.currency,
        receipt: req.receipt,
        notes: { invoiceId: req.invoiceId },
      }),
    });
    if (!res.ok) throw new GatewayError('Razorpay', await detailOf(res));
    const json = (await res.json()) as { id?: string };
    if (!json.id) throw new GatewayError('Razorpay', 'order was created without an id');
    return { orderId: json.id, publicKey: creds.keyId ?? '' };
  },

  async verify(creds, _mode, req) {
    const expected = razorpaySignature(creds.keySecret ?? '', req.orderId, req.paymentId);
    if (!safeEqualHex(expected, req.signature)) {
      throw new GatewayError('Razorpay', 'signature does not match — the payment was not verified');
    }
    // The signature proves the ids were issued together; it says nothing about
    // whether the money arrived. Only the gateway's own record does.
    const res = await request(`https://api.razorpay.com/v1/orders/${encodeURIComponent(req.orderId)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64')}` },
    });
    if (!res.ok) throw new GatewayError('Razorpay', await detailOf(res));
    const order = (await res.json()) as {
      status?: string;
      amount_paid?: number;
      currency?: string;
      notes?: Record<string, string>;
    };
    if (order.status !== 'paid') {
      throw new GatewayError('Razorpay', `order is ${order.status ?? 'in an unknown state'}, not paid`);
    }
    return {
      amount: fromMinor(order.amount_paid ?? 0),
      currency: order.currency ?? creds.currency ?? 'INR',
      invoiceId: order.notes?.invoiceId ?? '',
      reference: req.paymentId,
    };
  },
};

// ── Stripe ────────────────────────────────────────────────────────────

const stripe: GatewayAdapter = {
  async createOrder(creds, _mode, req) {
    const form = new URLSearchParams({
      amount: String(toMinor(req.amount)),
      currency: (req.currency || 'INR').toLowerCase(),
      'metadata[invoiceId]': req.invoiceId,
      description: req.receipt,
    });
    form.append('automatic_payment_methods[enabled]', 'true');
    const res = await request('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.secretKey ?? ''}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    if (!res.ok) throw new GatewayError('Stripe', await detailOf(res));
    const json = (await res.json()) as { id?: string };
    if (!json.id) throw new GatewayError('Stripe', 'intent was created without an id');
    return { orderId: json.id, publicKey: creds.publishableKey ?? '' };
  },

  async verify(creds, _mode, req) {
    // Stripe issues no callback signature for this flow; the intent's own
    // status is the authority, so it is read directly.
    const res = await request(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(req.orderId)}`, {
      headers: { Authorization: `Bearer ${creds.secretKey ?? ''}` },
    });
    if (!res.ok) throw new GatewayError('Stripe', await detailOf(res));
    const intent = (await res.json()) as {
      status?: string;
      amount_received?: number;
      currency?: string;
      metadata?: Record<string, string>;
      latest_charge?: string;
      id?: string;
    };
    if (intent.status !== 'succeeded') {
      throw new GatewayError('Stripe', `payment intent is ${intent.status ?? 'in an unknown state'}, not succeeded`);
    }
    return {
      amount: fromMinor(intent.amount_received ?? 0),
      currency: (intent.currency ?? creds.currency ?? 'INR').toUpperCase(),
      invoiceId: intent.metadata?.invoiceId ?? '',
      reference: intent.latest_charge ?? intent.id ?? req.orderId,
    };
  },
};

// ── PayPal ────────────────────────────────────────────────────────────

const paypalHost = (mode: GatewayMode) =>
  mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

async function paypalToken(creds: Credentials, mode: GatewayMode): Promise<string> {
  const res = await request(`${paypalHost(mode)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new GatewayError('PayPal', await detailOf(res));
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new GatewayError('PayPal', 'no access token returned');
  return json.access_token;
}

const paypal: GatewayAdapter = {
  async createOrder(creds, mode, req) {
    const token = await paypalToken(creds, mode);
    const res = await request(`${paypalHost(mode)}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            // custom_id is what survives back to the capture response, so it
            // carries the invoice rather than a note nobody can read later.
            custom_id: req.invoiceId,
            invoice_id: req.receipt,
            amount: { currency_code: req.currency || 'USD', value: req.amount.toFixed(2) },
          },
        ],
      }),
    });
    if (!res.ok) throw new GatewayError('PayPal', await detailOf(res));
    const json = (await res.json()) as { id?: string };
    if (!json.id) throw new GatewayError('PayPal', 'order was created without an id');
    return { orderId: json.id, publicKey: creds.clientId ?? '' };
  },

  async verify(creds, mode, req) {
    const token = await paypalToken(creds, mode);
    // Capture is idempotent by order id: a replayed callback answers
    // ORDER_ALREADY_CAPTURED rather than taking the money twice.
    const res = await request(`${paypalHost(mode)}/v2/checkout/orders/${encodeURIComponent(req.orderId)}/capture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const body = (await res.json().catch(() => ({}))) as {
      status?: string;
      purchase_units?: {
        custom_id?: string;
        payments?: { captures?: { id?: string; status?: string; amount?: { value?: string; currency_code?: string } }[] };
      }[];
    };
    if (!res.ok) {
      throw new GatewayError('PayPal', `capture failed — HTTP ${res.status}`);
    }
    const unit = body.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    if (body.status !== 'COMPLETED' || capture?.status !== 'COMPLETED') {
      throw new GatewayError('PayPal', `order is ${body.status ?? 'in an unknown state'}, not completed`);
    }
    return {
      amount: Number(capture.amount?.value ?? 0),
      currency: capture.amount?.currency_code ?? creds.currency ?? 'USD',
      invoiceId: unit?.custom_id ?? '',
      reference: capture.id ?? req.orderId,
    };
  },
};

// ── Registry ──────────────────────────────────────────────────────────

/**
 * Gateways that can actually take money. A key absent here is `comingSoon` in
 * the shared registry; payments.spec.ts asserts the two agree, so neither can
 * drift into offering a gateway that would accept a patient's card details and
 * do nothing with them.
 */
export const ADAPTERS: Record<string, GatewayAdapter> = { razorpay, stripe, paypal };

export function adapterFor(gateway: string): GatewayAdapter | undefined {
  return ADAPTERS[gateway];
}
