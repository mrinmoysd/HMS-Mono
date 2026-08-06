import { SettingsCrypto } from './settings.crypto';

/**
 * The one file in the settings work with a real security cost to getting wrong:
 * these values are gateway credentials.
 */
const withKey = (key?: string) =>
  new SettingsCrypto({ get: () => key } as never);

// 32 bytes, base64.
const KEY = Buffer.alloc(32, 7).toString('base64');

describe('SettingsCrypto', () => {
  it('round-trips a secret', () => {
    const c = withKey(KEY);
    const secret = 'sk_live_51ABCDEFghijklmnop';
    expect(c.decrypt(c.encrypt(secret))).toBe(secret);
  });

  it('produces a different ciphertext every time', () => {
    // A fresh IV per encryption. Without it, equal secrets produce equal
    // ciphertext and the table leaks which branches share a gateway key.
    const c = withKey(KEY);
    expect(c.encrypt('same')).not.toBe(c.encrypt('same'));
  });

  it('refuses to decrypt tampered ciphertext', () => {
    // GCM is authenticated: flipping a byte must fail loudly rather than
    // returning attacker-influenced plaintext.
    const c = withKey(KEY);
    const enc = c.encrypt('sk_live_secret_value');
    const [v, iv, tag, data] = enc.split('.');
    const flipped = [v, iv, tag, data!.slice(0, -2) + (data!.slice(-2) === 'AA' ? 'AB' : 'AA')].join('.');
    expect(() => c.decrypt(flipped)).toThrow();
  });

  it('rejects a key that is not 32 bytes', () => {
    expect(() => withKey(Buffer.alloc(16, 1).toString('base64'))).toThrow(/32 bytes/);
  });

  it('accepts hex as well as base64', () => {
    const c = withKey(Buffer.alloc(32, 3).toString('hex'));
    expect(c.decrypt(c.encrypt('x'))).toBe('x');
  });

  it('reports not-configured instead of throwing at boot', () => {
    const c = withKey(undefined);
    expect(c.isConfigured()).toBe(false);
    expect(() => c.encrypt('x')).toThrow(/SETTINGS_ENCRYPTION_KEY/);
  });

  describe('mask', () => {
    it('shows the ends only', () => {
      expect(SettingsCrypto.mask('sk_live_ABCDEFGH_LL')).toBe('sk••••••••LL');
    });

    it('masks a short value completely', () => {
      // Revealing 4 of 6 characters would be worse than revealing none.
      expect(SettingsCrypto.mask('abc123')).toBe('••••••••');
      expect(SettingsCrypto.mask('abc123')).not.toContain('a');
    });

    it('recognises its own output, so a re-save cannot destroy a credential', () => {
      const masked = SettingsCrypto.mask('sk_live_ABCDEFGH_LL');
      expect(SettingsCrypto.isMask(masked)).toBe(true);
      expect(SettingsCrypto.isMask('sk_live_a_real_new_key')).toBe(false);
    });
  });
});
