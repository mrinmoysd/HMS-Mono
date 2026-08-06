import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENERAL_SETTING_DEFAULT } from '@smart-hospital/shared';
import { setHospitalSettings } from './hospital-settings';
import { amount, currencySymbol, formatDate, formatDateTime, formatTime, money } from './format';

/**
 * These formatters are the only thing making Setup ▸ Settings ▸ General mean
 * anything — before them the date, time and currency fields were stored and
 * ignored. The risk is silent: a wrong pattern still renders *a* date, so a
 * regression here looks fine until someone reads a bill.
 */
const withSettings = (over: Partial<typeof GENERAL_SETTING_DEFAULT>) =>
  setHospitalSettings({ ...GENERAL_SETTING_DEFAULT, ...over });

// A fixed instant: 2026-03-09T18:45:00Z. In Asia/Kolkata (+05:30) that is
// 10 March 2026, 00:15 — deliberately a different calendar day from UTC, so a
// formatter that ignores the time zone fails this test rather than passing by
// coincidence.
const T = new Date('2026-03-09T18:45:00Z');

test('renders each configured date pattern', () => {
  withSettings({ timeZone: 'UTC', dateFormat: 'dd/mm/yyyy' });
  assert.equal(formatDate(T), '09/03/2026');
  withSettings({ timeZone: 'UTC', dateFormat: 'mm/dd/yyyy' });
  assert.equal(formatDate(T), '03/09/2026');
  withSettings({ timeZone: 'UTC', dateFormat: 'yyyy-mm-dd' });
  assert.equal(formatDate(T), '2026-03-09');
  withSettings({ timeZone: 'UTC', dateFormat: 'dd-mm-yyyy' });
  assert.equal(formatDate(T), '09-03-2026');
});

test('applies the configured time zone, including across a day boundary', () => {
  withSettings({ timeZone: 'Asia/Kolkata', dateFormat: 'yyyy-mm-dd' });
  assert.equal(formatDate(T), '2026-03-10', 'IST is the next calendar day');
  withSettings({ timeZone: 'UTC', dateFormat: 'yyyy-mm-dd' });
  assert.equal(formatDate(T), '2026-03-09');
});

test('honours 12 and 24 hour time', () => {
  withSettings({ timeZone: 'UTC', timeFormat: '24 Hour' });
  assert.equal(formatTime(T), '18:45');
  withSettings({ timeZone: 'UTC', timeFormat: '12 Hour' });
  assert.match(formatTime(T), /^06:45\s?pm$/i);
});

test('combines date and time in the configured formats', () => {
  withSettings({ timeZone: 'UTC', dateFormat: 'yyyy-mm-dd', timeFormat: '24 Hour' });
  assert.equal(formatDateTime(T), '2026-03-09 18:45');
});

test('falls back to the viewer zone rather than throwing on a bad zone', () => {
  // A hand-edited or stale setting must not take down every screen that shows
  // a date; Intl throws on an unknown zone, so this is a real failure mode.
  withSettings({ timeZone: 'Not/AZone', dateFormat: 'yyyy-mm-dd' });
  assert.doesNotThrow(() => formatDate(T));
  assert.match(formatDate(T), /^\d{4}-\d{2}-\d{2}$/);
});

test('money uses the configured symbol and groups thousands', () => {
  withSettings({ currencySymbol: '₹' });
  assert.equal(money(1234567.5), '₹1,234,567.50');
  withSettings({ currencySymbol: '$' });
  assert.equal(money(0), '$0.00');
});

test('amount omits the symbol, for CSV and symbol-in-header columns', () => {
  withSettings({ currencySymbol: '₹' });
  assert.equal(amount(1234.5), '1234.50');
  assert.equal(currencySymbol(), '₹');
});

test('empty and unparseable values render as an em dash, never NaN', () => {
  withSettings({});
  for (const v of [null, undefined, '', 'not-a-date']) {
    assert.equal(formatDate(v as never), '—');
    assert.equal(formatDateTime(v as never), '—');
    assert.equal(formatTime(v as never), '—');
  }
  assert.equal(money(null), '—');
  assert.equal(money(Number.NaN), '—');
  assert.equal(amount(undefined), '—');
});
