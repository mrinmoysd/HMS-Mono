import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEATURE_GROUPS } from './features';
import {
  MODULE_TOGGLES,
  PROTECTED_MODULES,
  UNBUILT_MODULES,
  isToggleableModule,
  moduleEnabled,
  moduleOfFeature,
  sanitiseDisabled,
  sidebarModuleEnabled,
  togglesForModule,
} from './module-toggles';
import { moduleSettingSchema } from '../dto/settings';

test('every feature group appears exactly once in the Modules list', () => {
  assert.equal(MODULE_TOGGLES.length, FEATURE_GROUPS.length);
  assert.equal(new Set(MODULE_TOGGLES.map((r) => r.key)).size, FEATURE_GROUPS.length);
});

test('the five unbuilt groups render as coming soon, not toggleable', () => {
  assert.deepEqual(
    [...UNBUILT_MODULES].sort(),
    ['calendar_todo', 'chat', 'survey', 'two_factor', 'whatsapp'],
  );
  for (const key of UNBUILT_MODULES) {
    const row = MODULE_TOGGLES.find((r) => r.key === key)!;
    assert.equal(row.toggleable, false, `${key} must not be toggleable`);
    assert.equal(row.reason, 'coming_soon');
  }
});

test('the lockout modules are never toggleable', () => {
  for (const key of PROTECTED_MODULES) {
    assert.equal(isToggleableModule(key), false, `${key} must be protected`);
    assert.equal(MODULE_TOGGLES.find((r) => r.key === key)!.reason, 'protected');
  }
});

test('a feature key resolves to its module by prefix', () => {
  assert.equal(moduleOfFeature('opd.opd_patient'), 'opd');
  assert.equal(moduleOfFeature('human_resource.staff'), 'human_resource');
  // A bare key with no dot is its own module rather than an empty string.
  assert.equal(moduleOfFeature('dashboard'), 'dashboard');
});

test('the two multi-group modules map to all of their groups', () => {
  assert.deepEqual([...togglesForModule('finance')].sort(), ['expense', 'income']);
  assert.deepEqual([...togglesForModule('setup')].sort(), ['hospital_charges', 'system_settings']);
});

test('a multi-group sidebar module stays visible while any group is on', () => {
  assert.equal(sidebarModuleEnabled(['income'], 'finance'), true);
  assert.equal(sidebarModuleEnabled(['income', 'expense'], 'finance'), false);
});

test('an unknown module is treated as enabled rather than hidden', () => {
  assert.equal(moduleEnabled(['opd'], 'something_new'), true);
  assert.equal(sidebarModuleEnabled([], 'patient'), true);
});

test('sanitising a stored list drops protected and unknown keys', () => {
  // A row hand-edited to disable Settings must not be honoured — that is the
  // lockout the protected list exists to prevent.
  assert.deepEqual(
    sanitiseDisabled(['opd', 'system_settings', 'dashboard', 'nonsense', 'opd']),
    ['opd'],
  );
});

test('a write that would disable a protected or unbuilt module is rejected', () => {
  assert.equal(moduleSettingSchema.safeParse({ disabled: ['opd'] }).success, true);
  assert.equal(moduleSettingSchema.safeParse({ disabled: ['system_settings'] }).success, false);
  assert.equal(moduleSettingSchema.safeParse({ disabled: ['dashboard'] }).success, false);
  // Coming-soon modules are not toggleable either — there is nothing to turn off.
  assert.equal(moduleSettingSchema.safeParse({ disabled: ['chat'] }).success, false);
});

test('the default is everything enabled', () => {
  assert.deepEqual(moduleSettingSchema.parse({}), { disabled: [] });
});
