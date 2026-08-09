import { createTransport } from 'nodemailer';
import type { Channel } from '@smart-hospital/shared';

/**
 * One send function per provider.
 *
 * Each takes decrypted credentials and a message, and either returns a short
 * identifier the gateway gave back or throws with a reason a hospital admin can
 * act on. They are deliberately plain functions, not Nest providers: nothing
 * here touches the database or the request, which is what makes the test-send
 * endpoint and the real dispatch path provably identical.
 *
 * Every call is bounded by a timeout. A gateway that accepts the connection and
 * then hangs would otherwise hold a request open until the reverse proxy gives
 * up, and the admin would be told nothing at all.
 */

const TIMEOUT_MS = 15_000;

export type Credentials = Record<string, string>;

export interface Message {
  to: string;
  body: string;
  /** Email only; ignored by SMS and WhatsApp. */
  subject?: string;
}

export type SendFn = (creds: Credentials, msg: Message) => Promise<string>;

/**
 * A failure the admin can do something about. The provider label and the
 * gateway's own words are both preserved — "Twilio rejected it: 21608 unverified
 * number" tells them where to go; "send failed" does not.
 */
export class ProviderError extends Error {
  constructor(provider: string, detail: string) {
    super(`${provider}: ${detail}`);
    this.name = 'ProviderError';
  }
}

/** Read a response body without letting a huge or unreadable one mask the status. */
async function detailOf(res: Response): Promise<string> {
  let text: string;
  try {
    text = (await res.text()).slice(0, 500);
  } catch {
    return `HTTP ${res.status}`;
  }
  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    const m = json.message ?? json.error ?? (json.errors as unknown[] | undefined)?.[0];
    if (typeof m === 'string') return `HTTP ${res.status} — ${m}`;
    if (m && typeof m === 'object' && 'message' in m) return `HTTP ${res.status} — ${String((m as { message: unknown }).message)}`;
  } catch {
    /* not JSON; fall through to the raw text */
  }
  return text ? `HTTP ${res.status} — ${text}` : `HTTP ${res.status}`;
}

function post(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

// ── SMS ───────────────────────────────────────────────────────────────

/** Twilio Programmable Messaging. Also serves WhatsApp with prefixed numbers. */
async function twilioSend(creds: Credentials, msg: Message, whatsapp: boolean): Promise<string> {
  const label = whatsapp ? 'Twilio WhatsApp' : 'Twilio';
  const sid = creds.accountSid ?? '';
  const prefix = whatsapp ? 'whatsapp:' : '';
  const form = new URLSearchParams({
    To: `${prefix}${msg.to}`,
    From: `${prefix}${creds.fromNumber ?? ''}`,
    Body: msg.body,
  });
  const res = await post(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${creds.authToken ?? ''}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  if (!res.ok) throw new ProviderError(label, await detailOf(res));
  const json = (await res.json()) as { sid?: string };
  return json.sid ?? 'accepted';
}

const sendTwilioSms: SendFn = (c, m) => twilioSend(c, m, false);
const sendTwilioWhatsapp: SendFn = (c, m) => twilioSend(c, m, true);

const sendClickatell: SendFn = async (creds, msg) => {
  const res = await post('https://platform.clickatell.com/messages', {
    method: 'POST',
    headers: { Authorization: creds.apiKey ?? '', 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      messages: [{ channel: 'sms', to: msg.to, content: msg.body, ...(creds.fromNumber ? { from: creds.fromNumber } : {}) }],
    }),
  });
  if (!res.ok) throw new ProviderError('Clickatell', await detailOf(res));
  const json = (await res.json()) as { messages?: { apiMessageId?: string; accepted?: boolean; error?: string }[] };
  const first = json.messages?.[0];
  // Clickatell answers 202 for the batch and reports per-message rejections
  // inside it, so a 2xx alone does not mean the message was accepted.
  if (first && first.accepted === false) throw new ProviderError('Clickatell', first.error ?? 'message not accepted');
  return first?.apiMessageId ?? 'accepted';
};

const sendMsg91: SendFn = async (creds, msg) => {
  const cc = (creds.countryCode ?? '91').replace(/\D/g, '');
  const digits = msg.to.replace(/\D/g, '');
  const mobile = digits.length > 10 ? digits : `${cc}${digits}`;
  const res = await post('https://api.msg91.com/api/v2/sendsms', {
    method: 'POST',
    headers: { authkey: creds.authKey ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: creds.senderId ?? '',
      route: creds.route || '4',
      country: cc,
      sms: [{ message: msg.body, to: [mobile] }],
    }),
  });
  if (!res.ok) throw new ProviderError('MSG91', await detailOf(res));
  const json = (await res.json()) as { type?: string; message?: string };
  if (json.type && json.type !== 'success') throw new ProviderError('MSG91', json.message ?? json.type);
  return json.message ?? 'accepted';
};

// ── WhatsApp ──────────────────────────────────────────────────────────

const sendMetaWhatsapp: SendFn = async (creds, msg) => {
  const version = creds.apiVersion || 'v21.0';
  const res = await post(
    `https://graph.facebook.com/${version}/${encodeURIComponent(creds.phoneNumberId ?? '')}/messages`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${creds.accessToken ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: msg.to.replace(/[^\d]/g, ''),
        type: 'text',
        text: { body: msg.body },
      }),
    },
  );
  if (!res.ok) throw new ProviderError('Meta WhatsApp', await detailOf(res));
  const json = (await res.json()) as { messages?: { id?: string }[] };
  return json.messages?.[0]?.id ?? 'accepted';
};

// ── Email ─────────────────────────────────────────────────────────────

const sendSmtp: SendFn = async (creds, msg) => {
  const port = Number(creds.port || 587);
  const transport = createTransport({
    host: creds.host,
    port,
    // `secure` means implicit TLS on connect (465). STARTTLS upgrades an
    // already-open connection and must NOT set it, or the handshake never
    // completes and the send hangs until the socket times out.
    secure: creds.encryption === 'ssl',
    ignoreTLS: creds.encryption === 'none',
    ...(creds.username ? { auth: { user: creds.username, pass: creds.password ?? '' } } : {}),
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });
  try {
    const info = await transport.sendMail({
      from: creds.fromName ? `"${creds.fromName}" <${creds.fromEmail}>` : creds.fromEmail,
      to: msg.to,
      subject: msg.subject ?? '(no subject)',
      text: msg.body,
    });
    return info.messageId ?? 'sent';
  } catch (e) {
    throw new ProviderError('SMTP', e instanceof Error ? e.message : String(e));
  } finally {
    transport.close();
  }
};

const sendSendgrid: SendFn = async (creds, msg) => {
  const res = await post('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${creds.apiKey ?? ''}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: msg.to }] }],
      from: { email: creds.fromEmail, ...(creds.fromName ? { name: creds.fromName } : {}) },
      subject: msg.subject ?? '(no subject)',
      content: [{ type: 'text/plain', value: msg.body }],
    }),
  });
  // SendGrid answers 202 with an empty body on success.
  if (!res.ok) throw new ProviderError('SendGrid', await detailOf(res));
  return res.headers.get('x-message-id') ?? 'accepted';
};

// ── Registry ──────────────────────────────────────────────────────────

/**
 * The providers that actually deliver. A key absent here is `comingSoon` in the
 * shared registry — `channels.spec.ts` asserts the two agree, so neither can
 * drift into promising delivery the other cannot perform.
 */
export const SENDERS: Record<Channel, Record<string, SendFn>> = {
  sms: { twilio: sendTwilioSms, clickatell: sendClickatell, msg91: sendMsg91 },
  whatsapp: { twilio_whatsapp: sendTwilioWhatsapp, meta_whatsapp: sendMetaWhatsapp },
  email: { smtp: sendSmtp, sendgrid: sendSendgrid },
};

export function senderFor(channel: Channel, provider: string): SendFn | undefined {
  return SENDERS[channel][provider];
}
