import { SETTINGS_SCHEMAS } from '@smart-hospital/shared';

/**
 * The invariant that makes a fresh install work.
 *
 * SettingsService.get reads a missing row as `schema.parse({})`. A schema with
 * a field that has no default therefore throws on first read instead of
 * showing an empty form — which is what General Setting did the first time it
 * ran, 422ing on a GET. Adding a required field without a default is easy and
 * the failure only appears on a database that has never saved that setting, so
 * it is worth a test rather than a comment.
 */
describe('settings registry', () => {
  it.each(Object.keys(SETTINGS_SCHEMAS))('%s parses an empty object', (key) => {
    const schema = SETTINGS_SCHEMAS[key as keyof typeof SETTINGS_SCHEMAS];
    expect(() => schema.parse({})).not.toThrow();
  });

  it('still refuses a blank value on write', () => {
    // The default covers "never configured", not "cleared by an admin".
    expect(() => SETTINGS_SCHEMAS.general.parse({ hospitalName: '' })).toThrow();
  });
});
