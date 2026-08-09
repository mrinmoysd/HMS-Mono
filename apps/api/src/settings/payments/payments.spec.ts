import { createHmac } from 'crypto';
import { PAYMENT_GATEWAYS } from '@smart-hospital/shared';
import { ADAPTERS, adapterFor, razorpaySignature, safeEqualHex } from './gateways';

describe('payment gateway registry', () => {
  it('has an adapter for every gateway that is not marked coming soon', () => {
    for (const g of PAYMENT_GATEWAYS) {
      if (g.comingSoon) continue;
      expect(adapterFor(g.key)).toBeDefined();
    }
  });

  it('has no adapter for a gateway marked coming soon', () => {
    // A coming-soon gateway that could take money would be the worst possible
    // version of that label.
    for (const g of PAYMENT_GATEWAYS) {
      if (!g.comingSoon) continue;
      expect(adapterFor(g.key)).toBeUndefined();
    }
  });

  it('defines no adapter the shared registry does not list', () => {
    const known = new Set(PAYMENT_GATEWAYS.map((g) => g.key));
    for (const key of Object.keys(ADAPTERS)) expect(known.has(key)).toBe(true);
  });

  it('reports an unknown gateway as having no adapter', () => {
    expect(adapterFor('definitely_not_a_gateway')).toBeUndefined();
  });
});

describe('razorpaySignature', () => {
  const SECRET = 'test_secret_key';
  const ORDER = 'order_ABC123';
  const PAYMENT = 'pay_XYZ789';

  it('matches an independently computed HMAC-SHA256 of order|payment', () => {
    const expected = createHmac('sha256', SECRET).update(`${ORDER}|${PAYMENT}`).digest('hex');
    expect(razorpaySignature(SECRET, ORDER, PAYMENT)).toBe(expected);
  });

  it('is a 64-character hex digest', () => {
    expect(razorpaySignature(SECRET, ORDER, PAYMENT)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when the order id changes', () => {
    expect(razorpaySignature(SECRET, 'order_OTHER', PAYMENT)).not.toBe(razorpaySignature(SECRET, ORDER, PAYMENT));
  });

  it('changes when the payment id changes', () => {
    // Without this, a signature from one payment would validate another
    // against the same order.
    expect(razorpaySignature(SECRET, ORDER, 'pay_OTHER')).not.toBe(razorpaySignature(SECRET, ORDER, PAYMENT));
  });

  it('changes when the secret changes', () => {
    expect(razorpaySignature('other_secret', ORDER, PAYMENT)).not.toBe(razorpaySignature(SECRET, ORDER, PAYMENT));
  });

  it('does not collide when the separator is moved between the two ids', () => {
    // `a|bc` and `ab|c` must not hash alike, or an attacker could shift the
    // boundary to reuse a signature across a different id pair.
    expect(razorpaySignature(SECRET, 'a', 'bc')).not.toBe(razorpaySignature(SECRET, 'ab', 'c'));
  });
});

describe('safeEqualHex', () => {
  const A = 'a'.repeat(64);

  it('accepts identical digests', () => {
    expect(safeEqualHex(A, A)).toBe(true);
  });

  it('rejects a digest differing in one character', () => {
    expect(safeEqualHex(A, 'b' + A.slice(1))).toBe(false);
  });

  it('rejects a digest of a different length', () => {
    expect(safeEqualHex(A, A.slice(0, 32))).toBe(false);
  });

  it('rejects an empty signature', () => {
    // The common shape of a forged request: omit the field entirely.
    expect(safeEqualHex(A, '')).toBe(false);
  });

  it('rejects non-hex input rather than throwing', () => {
    expect(safeEqualHex(A, 'z'.repeat(64))).toBe(false);
  });

  it('rejects a valid signature for a different payment', () => {
    const real = razorpaySignature('s', 'order_1', 'pay_1');
    const other = razorpaySignature('s', 'order_1', 'pay_2');
    expect(safeEqualHex(real, other)).toBe(false);
  });
});
