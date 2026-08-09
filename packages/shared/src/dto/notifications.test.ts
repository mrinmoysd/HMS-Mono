import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NOTIFICATION_EVENTS,
  SYSTEM_NOTIFICATION_EVENTS,
  notificationSettingSchema,
  placeholdersIn,
  renderTemplate,
  systemNotificationSettingSchema,
  unknownPlaceholders,
} from './notifications';

/**
 * The renderer is the piece G5 dispatches through, so a bug here reaches a
 * patient's phone. The failure that matters is silent: a mistyped placeholder
 * that renders as a hole in the sentence and is never noticed.
 */

test('resolves placeholders from the context', () => {
  const r = renderTemplate('Dear {{patient_name}}, bill {{bill_no}}.', {
    patient_name: 'Asha',
    bill_no: 'INV001',
  });
  assert.equal(r.text, 'Dear Asha, bill INV001.');
  assert.deepEqual(r.unresolved, []);
});

test('tolerates whitespace and case inside the braces', () => {
  const r = renderTemplate('Hi {{ Patient_Name }}', { patient_name: 'Asha' });
  assert.equal(r.text, 'Hi Asha');
  assert.deepEqual(r.unresolved, []);
});

test('REPORTS an unresolved placeholder rather than blanking it', () => {
  // A typo must be visible. Blanking it would ship "Dear , your report…" to a
  // patient with nobody the wiser.
  const r = renderTemplate('Dear {{patinet_name}}', {});
  assert.deepEqual(r.unresolved, ['patinet_name']);
  assert.equal(r.text, 'Dear {{patinet_name}}');
});

test('treats an explicitly empty value as resolved, not missing', () => {
  // "No middle name" is an answer; a missing key is a mistake. They must not
  // look the same to the caller.
  const r = renderTemplate('Hi {{middle_name}}!', { middle_name: '' });
  assert.equal(r.text, 'Hi !');
  assert.deepEqual(r.unresolved, []);
  assert.deepEqual(renderTemplate('Hi {{middle_name}}!', { middle_name: null }).unresolved, []);
});

test('reports each unresolved placeholder once', () => {
  const r = renderTemplate('{{a}} {{a}} {{b}}', {});
  assert.deepEqual(r.unresolved, ['a', 'b']);
});

test('leaves text with no placeholders untouched', () => {
  const r = renderTemplate('No placeholders here.', { unused: 'x' });
  assert.equal(r.text, 'No placeholders here.');
  assert.deepEqual(r.unresolved, []);
});

test('lists the placeholders a template uses', () => {
  assert.deepEqual(placeholdersIn('{{a}} then {{b}} then {{a}}'), ['a', 'b']);
});

test('flags placeholders the event cannot supply', () => {
  assert.deepEqual(unknownPlaceholders('{{patient_name}} {{stock_price}}', ['patient_name']), [
    'stock_price',
  ]);
  assert.deepEqual(unknownPlaceholders('{{patient_name}}', ['patient_name']), []);
});

test('every shipped default body only uses placeholders its event supplies', () => {
  // The defaults are what an admin sees first. If one referenced a placeholder
  // the event cannot fill, the very first preview would show a hole.
  for (const e of NOTIFICATION_EVENTS) {
    assert.deepEqual(
      unknownPlaceholders(e.defaultBody, e.placeholders),
      [],
      `${e.key} body references an unavailable placeholder`,
    );
    assert.deepEqual(unknownPlaceholders(e.defaultSubject, e.placeholders), [], `${e.key} subject`);
  }
  for (const e of SYSTEM_NOTIFICATION_EVENTS) {
    assert.deepEqual(unknownPlaceholders(e.defaultBody, e.placeholders), [], `${e.key} body`);
    assert.deepEqual(unknownPlaceholders(e.defaultSubject, e.placeholders), [], `${e.key} subject`);
  }
});

test('event keys are unique across both tables', () => {
  const keys = [...NOTIFICATION_EVENTS, ...SYSTEM_NOTIFICATION_EVENTS].map((e) => e.key);
  assert.equal(new Set(keys).size, keys.length);
});

test('both settings schemas parse an empty object', () => {
  // Same invariant as every other settings schema: a missing row is the
  // default, never a crash.
  assert.deepEqual(notificationSettingSchema.parse({}), { events: {} });
  assert.deepEqual(systemNotificationSettingSchema.parse({}), { events: {} });
});

test('an unknown channel is rejected', () => {
  const bad = notificationSettingSchema.safeParse({
    events: { opd_registered: { channels: ['pigeon'] } },
  });
  assert.equal(bad.success, false);
});
