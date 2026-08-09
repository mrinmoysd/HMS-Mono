import { z } from 'zod';

/**
 * Delivery channels and their providers — Setup ▸ Settings ▸ SMS / WhatsApp /
 * Email.
 *
 * One registry drives four things that must never disagree: the credential
 * form the admin fills in, which values get encrypted at rest, which get masked
 * on the way back out, and which arguments the dispatcher hands the gateway. A
 * second list would drift, and the failure mode of drift here is a hospital
 * that believes it is sending appointment reminders and is not.
 *
 * `comingSoon` is a real state, not a caption. Such a provider cannot be
 * enabled and cannot be made active — see `validateChannelSetting`. Letting an
 * admin select a gateway that silently drops every message is precisely the
 * failure this exists to prevent.
 */

export const CHANNELS = ['sms', 'whatsapp', 'email'] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_META: Record<Channel, { label: string; noun: string }> = {
  sms: { label: 'SMS Setting', noun: 'text message' },
  whatsapp: { label: 'WhatsApp Setting', noun: 'WhatsApp message' },
  email: { label: 'Email Setting', noun: 'email' },
};

export type CredentialFieldType = 'text' | 'password' | 'number' | 'select';

export interface CredentialField {
  key: string;
  label: string;
  type: CredentialFieldType;
  /** Encrypted at rest and masked on read. Never returned in the clear. */
  secret?: boolean;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: readonly { value: string; label: string }[];
  default?: string;
}

export interface ProviderDef {
  key: string;
  label: string;
  /** Configurable, but nothing will actually be delivered through it yet. */
  comingSoon?: boolean;
  /** One line under the tab heading: what the admin is looking at. */
  blurb: string;
  fields: readonly CredentialField[];
}

const SENDER_HELP = 'The number or ID your patients will see as the sender.';

export const PROVIDERS: Record<Channel, readonly ProviderDef[]> = {
  sms: [
    {
      key: 'twilio',
      label: 'Twilio',
      blurb: 'Sends through the Twilio Programmable Messaging API.',
      fields: [
        { key: 'accountSid', label: 'Account SID', type: 'text', required: true, placeholder: 'AC…' },
        { key: 'authToken', label: 'Auth Token', type: 'password', secret: true, required: true },
        { key: 'fromNumber', label: 'From Number', type: 'text', required: true, placeholder: '+14155550100', help: SENDER_HELP },
      ],
    },
    {
      key: 'clickatell',
      label: 'Clickatell',
      blurb: 'Sends through the Clickatell Platform REST API.',
      fields: [
        { key: 'apiKey', label: 'API Key', type: 'password', secret: true, required: true },
        { key: 'fromNumber', label: 'From Number', type: 'text', placeholder: 'Optional', help: SENDER_HELP },
      ],
    },
    {
      key: 'msg91',
      label: 'MSG91',
      blurb: 'Sends through the MSG91 v2 SMS API.',
      fields: [
        { key: 'authKey', label: 'Auth Key', type: 'password', secret: true, required: true },
        { key: 'senderId', label: 'Sender ID', type: 'text', required: true, placeholder: 'HOSPTL', help: 'Six-character DLT-registered sender ID.' },
        { key: 'route', label: 'Route', type: 'text', default: '4', help: '4 = transactional. Leave as-is unless MSG91 told you otherwise.' },
        { key: 'countryCode', label: 'Country Code', type: 'text', default: '91', help: 'Prefixed to numbers that do not already carry one.' },
      ],
    },
    {
      key: 'textlocal',
      label: 'Text Local',
      comingSoon: true,
      blurb: 'Credentials can be stored, but nothing is delivered through Text Local yet.',
      fields: [
        { key: 'apiKey', label: 'API Key', type: 'password', secret: true, required: true },
        { key: 'sender', label: 'Sender', type: 'text', required: true, help: SENDER_HELP },
      ],
    },
    {
      key: 'bulksms',
      label: 'Bulk SMS',
      comingSoon: true,
      blurb: 'Credentials can be stored, but nothing is delivered through Bulk SMS yet.',
      fields: [
        { key: 'username', label: 'Username', type: 'text', required: true },
        { key: 'password', label: 'Password', type: 'password', secret: true, required: true },
      ],
    },
  ],

  whatsapp: [
    {
      key: 'twilio_whatsapp',
      label: 'Twilio WhatsApp',
      blurb: 'Sends through Twilio’s WhatsApp sender.',
      fields: [
        { key: 'accountSid', label: 'Account SID', type: 'text', required: true, placeholder: 'AC…' },
        { key: 'authToken', label: 'Auth Token', type: 'password', secret: true, required: true },
        { key: 'fromNumber', label: 'From Number', type: 'text', required: true, placeholder: '+14155238886', help: 'The WhatsApp-enabled number on your Twilio account.' },
      ],
    },
    {
      key: 'meta_whatsapp',
      label: 'Meta WhatsApp',
      blurb: 'Sends through the WhatsApp Cloud API on Meta’s Graph endpoint.',
      fields: [
        { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', required: true, help: 'From WhatsApp Manager — not the phone number itself.' },
        { key: 'accessToken', label: 'Access Token', type: 'password', secret: true, required: true },
        { key: 'apiVersion', label: 'Graph API Version', type: 'text', default: 'v21.0' },
      ],
    },
  ],

  email: [
    {
      key: 'smtp',
      label: 'SMTP',
      blurb: 'Sends through your own mail server.',
      fields: [
        { key: 'host', label: 'SMTP Host', type: 'text', required: true, placeholder: 'smtp.example.com' },
        { key: 'port', label: 'Port', type: 'number', required: true, default: '587' },
        {
          key: 'encryption',
          label: 'Encryption',
          type: 'select',
          default: 'tls',
          options: [
            { value: 'tls', label: 'TLS / STARTTLS' },
            { value: 'ssl', label: 'SSL' },
            { value: 'none', label: 'None' },
          ],
          help: 'None sends your password in the clear — only for a mail server on the same host.',
        },
        { key: 'username', label: 'Username', type: 'text' },
        { key: 'password', label: 'Password', type: 'password', secret: true },
        { key: 'fromEmail', label: 'From Address', type: 'text', required: true, placeholder: 'no-reply@hospital.org' },
        { key: 'fromName', label: 'From Name', type: 'text' },
      ],
    },
    {
      key: 'sendgrid',
      label: 'SendGrid',
      blurb: 'Sends through the SendGrid v3 Mail Send API.',
      fields: [
        { key: 'apiKey', label: 'API Key', type: 'password', secret: true, required: true, placeholder: 'SG.…' },
        { key: 'fromEmail', label: 'From Address', type: 'text', required: true, help: 'Must be a verified sender on your SendGrid account.' },
        { key: 'fromName', label: 'From Name', type: 'text' },
      ],
    },
  ],
};

// ── Lookups ───────────────────────────────────────────────────────────

export function providersFor(channel: Channel): readonly ProviderDef[] {
  return PROVIDERS[channel];
}

export function findProvider(channel: Channel, key: string): ProviderDef | undefined {
  return PROVIDERS[channel].find((p) => p.key === key);
}

export function isChannel(value: string): value is Channel {
  return (CHANNELS as readonly string[]).includes(value);
}

/** Credential keys that must be encrypted at rest and masked on read. */
export function secretFieldKeys(channel: Channel, providerKey: string): string[] {
  return (findProvider(channel, providerKey)?.fields ?? []).filter((f) => f.secret).map((f) => f.key);
}

/** A provider's shipped defaults — what an untouched form starts from. */
export function defaultCredentials(channel: Channel, providerKey: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of findProvider(channel, providerKey)?.fields ?? []) out[f.key] = f.default ?? '';
  return out;
}

// ── Stored shape ──────────────────────────────────────────────────────

export const PROVIDER_STATUSES = ['enabled', 'disabled'] as const;
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];

export const providerConfigSchema = z.object({
  status: z.enum(PROVIDER_STATUSES).default('disabled'),
  credentials: z.record(z.string()).default({}),
});
export type ProviderConfig = z.infer<typeof providerConfigSchema>;

export const channelSettingSchema = z.object({
  /** Null means the channel is configured but nothing is sending. */
  activeProvider: z.string().nullable().default(null),
  providers: z.record(providerConfigSchema).default({}),
});
export type ChannelSettingInput = z.infer<typeof channelSettingSchema>;

export interface ChannelSettingDto extends ChannelSettingInput {
  channel: Channel;
  /** False when SETTINGS_ENCRYPTION_KEY is absent — credentials cannot be stored. */
  secretsConfigured: boolean;
}

// ── Validation ────────────────────────────────────────────────────────

/**
 * Everything that makes a channel configuration a lie, in one place, so the
 * screen and the endpoint reject exactly the same states.
 *
 * The rules that matter are the last two: a channel whose active provider is
 * disabled or half-configured looks configured on the screen while delivering
 * nothing. That is worse than an unconfigured channel, which at least admits it.
 */
export function validateChannelSetting(channel: Channel, input: ChannelSettingInput): string[] {
  const problems: string[] = [];

  for (const [key, cfg] of Object.entries(input.providers)) {
    const def = findProvider(channel, key);
    if (!def) {
      problems.push(`${key}: not a provider for ${channel}`);
      continue;
    }
    if (def.comingSoon && cfg.status === 'enabled') {
      problems.push(`${def.label} cannot be enabled — it is not implemented yet`);
    }
    for (const f of def.fields) {
      if (f.type === 'select' && f.options) {
        const v = cfg.credentials[f.key];
        if (v && !f.options.some((o) => o.value === v)) {
          problems.push(`${def.label} ${f.label}: ${v} is not one of the allowed values`);
        }
      }
    }
  }

  const active = input.activeProvider;
  if (active) {
    const def = findProvider(channel, active);
    if (!def) {
      problems.push(`${active} cannot be the active provider — it is not a provider for ${channel}`);
      return problems;
    }
    if (def.comingSoon) {
      problems.push(`${def.label} cannot be the active provider — it is not implemented yet`);
    }
    const cfg = input.providers[active];
    if (!cfg || cfg.status !== 'enabled') {
      problems.push(`${def.label} is the active provider but is not enabled`);
    }
    const missing = def.fields
      .filter((f) => f.required && !(cfg?.credentials[f.key] ?? '').trim())
      .map((f) => f.label);
    if (missing.length) {
      problems.push(`${def.label} is the active provider but is missing: ${missing.join(', ')}`);
    }
  }

  return problems;
}

/** A one-line answer to "is this channel actually going to deliver anything?" */
export function channelIsLive(channel: Channel, input: ChannelSettingInput): boolean {
  return !!input.activeProvider && validateChannelSetting(channel, input).length === 0;
}

// ── Test send ─────────────────────────────────────────────────────────

export const channelTestSchema = z.object({
  /** A phone number for sms/whatsapp, an email address for email. */
  to: z.string().trim().min(1, 'A destination is required'),
  message: z.string().trim().min(1).default('Test message from your hospital management system.'),
});
export type ChannelTestInput = z.infer<typeof channelTestSchema>;

export interface ChannelTestResult {
  ok: boolean;
  provider: string;
  /** Gateway response detail on success, or the reason it failed. */
  detail: string;
}
