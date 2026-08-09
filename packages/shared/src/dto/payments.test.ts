import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PAYMENT_GATEWAYS,
  computeProcessingFee,
  defaultGatewayCredentials,
  findGateway,
  gatewaySecretKeys,
  modeWarnings,
  paymentSettingSchema,
  paymentsAreLive,
  validatePaymentSetting,
  type PaymentSettingInput,
} from './payments';

function goodRazorpay(): PaymentSettingInput {
  return {
    activeGateway: 'razorpay',
    gateways: {
      razorpay: {
        status: 'enabled',
        mode: 'test',
        feePercent: 2,
        feeFixed: 0,
        credentials: { keyId: 'rzp_test_abc', keySecret: 'shh', currency: 'INR' },
      },
    },
  };
}

test('gateway keys are unique', () => {
  const keys = PAYMENT_GATEWAYS.map((g) => g.key);
  assert.equal(new Set(keys).size, keys.length);
});

test('every gateway requires something and encrypts something', () => {
  for (const g of PAYMENT_GATEWAYS) {
    assert.ok(g.fields.some((f) => f.required), `${g.key} requires nothing`);
    assert.ok(gatewaySecretKeys(g.key).length > 0, `${g.key} encrypts nothing`);
  }
});

test('every secret field is a password input', () => {
  for (const g of PAYMENT_GATEWAYS) {
    for (const f of g.fields) if (f.secret) assert.equal(f.type, 'password', `${g.key}/${f.key}`);
  }
});

test('at least one gateway is actually implemented', () => {
  assert.ok(PAYMENT_GATEWAYS.some((g) => !g.comingSoon));
});

test('every gateway declares at least one currency', () => {
  for (const g of PAYMENT_GATEWAYS) assert.ok(g.currencies.length > 0, g.key);
});

test('the schema parses an empty object into no online payments', () => {
  const parsed = paymentSettingSchema.parse({});
  assert.equal(parsed.activeGateway, null);
  assert.deepEqual(parsed.gateways, {});
  assert.equal(paymentsAreLive(parsed), false);
});

test('a gateway config defaults to disabled, test mode, no fee', () => {
  const parsed = paymentSettingSchema.parse({ gateways: { razorpay: {} } });
  const g = parsed.gateways.razorpay!;
  assert.equal(g.status, 'disabled');
  assert.equal(g.mode, 'test');
  assert.equal(g.feePercent, 0);
  assert.equal(g.feeFixed, 0);
});

test('defaultGatewayCredentials covers every field', () => {
  const c = defaultGatewayCredentials('razorpay');
  assert.deepEqual(Object.keys(c).sort(), findGateway('razorpay')!.fields.map((f) => f.key).sort());
  assert.equal(c.currency, 'INR');
});

test('a fully configured active gateway validates and is live', () => {
  assert.deepEqual(validatePaymentSetting(goodRazorpay()), []);
  assert.equal(paymentsAreLive(goodRazorpay()), true);
});

test('the active gateway must be enabled', () => {
  const s = goodRazorpay();
  s.gateways.razorpay!.status = 'disabled';
  assert.match(validatePaymentSetting(s)[0]!, /is not enabled/);
  assert.equal(paymentsAreLive(s), false);
});

test('the active gateway must have every required credential', () => {
  const s = goodRazorpay();
  s.gateways.razorpay!.credentials.keySecret = '  ';
  assert.match(validatePaymentSetting(s)[0]!, /missing: Key Secret/);
});

test('a coming-soon gateway cannot be enabled or made active', () => {
  const s: PaymentSettingInput = {
    activeGateway: 'paytm',
    gateways: { paytm: { status: 'enabled', mode: 'test', feePercent: 0, feeFixed: 0, credentials: { merchantId: 'm', merchantKey: 'k' } } },
  };
  const problems = validatePaymentSetting(s);
  assert.ok(problems.some((p) => /cannot be enabled/.test(p)));
  assert.ok(problems.some((p) => /cannot be the active gateway/.test(p)));
});

test('a fee that would consume the whole payment is rejected', () => {
  const s = goodRazorpay();
  s.gateways.razorpay!.feePercent = 100;
  assert.ok(validatePaymentSetting(s).some((p) => /consume the whole payment/.test(p)));
});

// ── Mode warnings ───────────────────────────────────────────────────

test('a live gateway holding a test key is warned about', () => {
  const s = goodRazorpay();
  s.gateways.razorpay!.mode = 'live';
  const w = modeWarnings(s);
  assert.equal(w.length, 1, w.join(' · '));
  assert.match(w[0]!, /set to Live but Key ID looks like a test key/);
});

test('a test gateway holding a live key is warned about', () => {
  const s = goodRazorpay();
  s.gateways.razorpay!.credentials.keyId = 'rzp_live_abc';
  assert.match(modeWarnings(s)[0]!, /set to Test but Key ID looks like a live key/);
});

test('a matching mode and key produces no warning', () => {
  assert.deepEqual(modeWarnings(goodRazorpay()), []);
});

test('mode warnings never block a save', () => {
  // They are advisory: the same config that warns must still validate.
  const s = goodRazorpay();
  s.gateways.razorpay!.mode = 'live';
  assert.ok(modeWarnings(s).length > 0);
  assert.deepEqual(validatePaymentSetting(s), []);
});

// ── Processing fee ──────────────────────────────────────────────────

test('the processing fee combines percentage and flat amount', () => {
  assert.equal(computeProcessingFee(1000, { feePercent: 2, feeFixed: 3 }), 23);
});

test('the processing fee rounds to two decimals', () => {
  assert.equal(computeProcessingFee(999.99, { feePercent: 2.36, feeFixed: 0 }), 23.6);
});

test('the processing fee never exceeds the payment', () => {
  assert.equal(computeProcessingFee(100, { feePercent: 90, feeFixed: 50 }), 100);
});

test('a zero or negative amount has no fee', () => {
  assert.equal(computeProcessingFee(0, { feePercent: 5, feeFixed: 2 }), 0);
  assert.equal(computeProcessingFee(-10, { feePercent: 5, feeFixed: 2 }), 0);
});
