import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHANNELS,
  PROVIDERS,
  channelIsLive,
  channelSettingSchema,
  defaultCredentials,
  findProvider,
  isChannel,
  providersFor,
  secretFieldKeys,
  validateChannelSetting,
  type ChannelSettingInput,
} from './channels';

/** A configuration that should pass cleanly, so each test can spoil one thing. */
function goodTwilio(): ChannelSettingInput {
  return {
    activeProvider: 'twilio',
    providers: {
      twilio: {
        status: 'enabled',
        credentials: { accountSid: 'ACxxx', authToken: 'secret', fromNumber: '+14155550100' },
      },
    },
  };
}

test('every channel has at least one provider that is not coming soon', () => {
  for (const c of CHANNELS) {
    const usable = providersFor(c).filter((p) => !p.comingSoon);
    assert.ok(usable.length > 0, `${c} has no implemented provider`);
  }
});

test('provider keys are unique within a channel', () => {
  for (const c of CHANNELS) {
    const keys = providersFor(c).map((p) => p.key);
    assert.equal(new Set(keys).size, keys.length, `${c} has duplicate provider keys`);
  }
});

test('every provider has at least one required field', () => {
  for (const c of CHANNELS) {
    for (const p of providersFor(c)) {
      assert.ok(
        p.fields.some((f) => f.required),
        `${c}/${p.key} requires nothing — it would validate while empty`,
      );
    }
  }
});

test('every secret field is a password input', () => {
  for (const c of CHANNELS) {
    for (const p of providersFor(c)) {
      for (const f of p.fields) {
        if (f.secret) assert.equal(f.type, 'password', `${c}/${p.key}/${f.key}`);
      }
    }
  }
});

test('every provider stores at least one secret', () => {
  // A provider with nothing encrypted means credentials sitting in plaintext.
  for (const c of CHANNELS) {
    for (const p of providersFor(c)) {
      assert.ok(secretFieldKeys(c, p.key).length > 0, `${c}/${p.key} encrypts nothing`);
    }
  }
});

test('select fields declare their options', () => {
  for (const c of CHANNELS) {
    for (const p of providersFor(c)) {
      for (const f of p.fields) {
        if (f.type === 'select') assert.ok(f.options?.length, `${c}/${p.key}/${f.key}`);
        if (f.type === 'select' && f.default) {
          assert.ok(f.options!.some((o) => o.value === f.default), `${c}/${p.key}/${f.key} default is not an option`);
        }
      }
    }
  }
});

test('the schema parses an empty object into an unconfigured channel', () => {
  const parsed = channelSettingSchema.parse({});
  assert.equal(parsed.activeProvider, null);
  assert.deepEqual(parsed.providers, {});
});

test('defaultCredentials covers every field of the provider', () => {
  const smtp = defaultCredentials('email', 'smtp');
  assert.deepEqual(Object.keys(smtp).sort(), findProvider('email', 'smtp')!.fields.map((f) => f.key).sort());
  assert.equal(smtp.port, '587');
  assert.equal(smtp.encryption, 'tls');
});

test('a fully configured active provider validates', () => {
  assert.deepEqual(validateChannelSetting('sms', goodTwilio()), []);
  assert.equal(channelIsLive('sms', goodTwilio()), true);
});

test('an unconfigured channel is valid but not live', () => {
  const empty = channelSettingSchema.parse({});
  assert.deepEqual(validateChannelSetting('sms', empty), []);
  assert.equal(channelIsLive('sms', empty), false);
});

test('the active provider must be enabled', () => {
  const s = goodTwilio();
  s.providers.twilio!.status = 'disabled';
  const problems = validateChannelSetting('sms', s);
  assert.equal(problems.length, 1);
  assert.match(problems[0]!, /is not enabled/);
  assert.equal(channelIsLive('sms', s), false);
});

test('the active provider must have every required credential', () => {
  const s = goodTwilio();
  s.providers.twilio!.credentials.fromNumber = '   ';
  const problems = validateChannelSetting('sms', s);
  assert.equal(problems.length, 1);
  assert.match(problems[0]!, /missing: From Number/);
});

test('a coming-soon provider cannot be enabled or made active', () => {
  const s: ChannelSettingInput = {
    activeProvider: 'textlocal',
    providers: { textlocal: { status: 'enabled', credentials: { apiKey: 'k', sender: 'HOSP' } } },
  };
  const problems = validateChannelSetting('sms', s);
  assert.equal(problems.length, 2, problems.join(' · '));
  assert.ok(problems.some((p) => /cannot be enabled/.test(p)));
  assert.ok(problems.some((p) => /cannot be the active provider/.test(p)));
});

test('a provider from another channel is rejected', () => {
  const s: ChannelSettingInput = {
    activeProvider: 'smtp',
    providers: { smtp: { status: 'enabled', credentials: {} } },
  };
  const problems = validateChannelSetting('sms', s);
  assert.ok(problems.some((p) => /not a provider for sms/.test(p)));
});

test('a select field rejects a value outside its options', () => {
  const s: ChannelSettingInput = {
    activeProvider: null,
    providers: { smtp: { status: 'disabled', credentials: { encryption: 'rot13' } } },
  };
  const problems = validateChannelSetting('email', s);
  assert.equal(problems.length, 1);
  assert.match(problems[0]!, /rot13 is not one of the allowed values/);
});

test('isChannel gates unknown strings', () => {
  assert.equal(isChannel('sms'), true);
  assert.equal(isChannel('pigeon'), false);
});

test('PROVIDERS covers exactly the declared channels', () => {
  assert.deepEqual(Object.keys(PROVIDERS).sort(), [...CHANNELS].sort());
});
