import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Encryption for settings marked `isSecret` — gateway credentials, API keys,
 * SMTP passwords.
 *
 * AES-256-GCM. The stored string is `v1.<iv>.<tag>.<ciphertext>`, all base64url.
 * GCM is authenticated, so a tampered row fails to decrypt rather than
 * returning attacker-chosen plaintext, and the version prefix means a future
 * algorithm change can migrate rows lazily instead of all at once.
 *
 * **The key is not derived from anything.** It comes from
 * SETTINGS_ENCRYPTION_KEY and nowhere else. Deriving it from, say, the JWT
 * secret would tie two unrelated rotations together: rotating the JWT secret
 * would silently make every stored credential undecryptable.
 *
 * The key is optional at boot, deliberately. The API already runs in production
 * without it; making it required would refuse to start an otherwise healthy
 * system the moment this code deploys. Instead everything non-secret works, and
 * only reading or writing a credential fails — with an error that says exactly
 * what to do. `isConfigured()` lets the UI say so up front rather than letting
 * an admin fill in a form that cannot be saved.
 */
@Injectable()
export class SettingsCrypto {
  private readonly key: Buffer | null;

  constructor(config: ConfigService) {
    const raw = config.get<string>('SETTINGS_ENCRYPTION_KEY');
    this.key = raw ? SettingsCrypto.parseKey(raw) : null;
  }

  /** Accepts base64 or hex; must decode to exactly 32 bytes for AES-256. */
  private static parseKey(raw: string): Buffer {
    const trimmed = raw.trim();
    const buf = /^[0-9a-fA-F]{64}$/.test(trimmed)
      ? Buffer.from(trimmed, 'hex')
      : Buffer.from(trimmed, 'base64');
    if (buf.length !== 32) {
      throw new Error(
        `SETTINGS_ENCRYPTION_KEY must decode to 32 bytes for AES-256, got ${buf.length}. ` +
          'Generate one with:  openssl rand -base64 32',
      );
    }
    return buf;
  }

  isConfigured(): boolean {
    return this.key !== null;
  }

  private require(): Buffer {
    if (!this.key) {
      throw new ServiceUnavailableException(
        'Secret settings are not available: SETTINGS_ENCRYPTION_KEY is not set. ' +
          'Generate one with `openssl rand -base64 32` and add it to the API environment.',
      );
    }
    return this.key;
  }

  encrypt(plaintext: string): string {
    const key = this.require();
    const iv = randomBytes(12); // 96-bit nonce, the GCM standard
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return ['v1', b64(iv), b64(cipher.getAuthTag()), b64(enc)].join('.');
  }

  decrypt(stored: string): string {
    const key = this.require();
    const [version, iv, tag, data] = stored.split('.');
    if (version !== 'v1' || !iv || !tag || !data) {
      throw new Error('Stored secret is not in the expected v1 format');
    }
    const decipher = createDecipheriv('aes-256-gcm', key, unb64(iv));
    decipher.setAuthTag(unb64(tag));
    return Buffer.concat([decipher.update(unb64(data)), decipher.final()]).toString('utf8');
  }

  /**
   * What the API returns instead of a credential: first two and last two
   * characters, the middle replaced by bullets — the same shape the reference
   * shows (`sk••••LL`), enough for an admin to recognise which key is stored
   * without the value being readable or reconstructable.
   *
   * Short values are masked completely; revealing 4 of 6 characters would be
   * worse than revealing none.
   */
  static mask(plaintext: string): string {
    if (plaintext.length <= 8) return '•'.repeat(8);
    return `${plaintext.slice(0, 2)}${'•'.repeat(8)}${plaintext.slice(-2)}`;
  }

  /**
   * True when a submitted value is a mask rather than a new secret.
   *
   * The form round-trips whatever the API sent, so an admin who edits one field
   * of a gateway and saves would otherwise overwrite the other fields with
   * their own masks — destroying working credentials with a value that cannot
   * be recovered. Masked writes are ignored instead.
   */
  static isMask(value: string): boolean {
    return value.includes('•');
  }
}

const b64 = (b: Buffer) => b.toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url');
