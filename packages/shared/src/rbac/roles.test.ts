import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODULES } from './modules';
import { ACTIONS, ROLES, defaultGrantsFor } from './roles';
import { Ability, grantsToPermissionKeys } from './ability';

test('super_admin & admin get every module with all four actions', () => {
  for (const role of ['super_admin', 'admin'] as const) {
    const grants = defaultGrantsFor(role);
    assert.equal(grants.length, MODULES.length);
    assert.ok(grants.every((g) => g.view && g.add && g.edit && g.delete));
    // 29 modules × 4 actions = 116 permission keys
    assert.equal(grantsToPermissionKeys(grants).length, MODULES.length * ACTIONS.length);
  }
});

test('nurse is the most restricted role and cannot access billing', () => {
  const ability = new Ability(grantsToPermissionKeys(defaultGrantsFor('nurse')));
  assert.ok(ability.canAccess('dashboard'));
  assert.ok(ability.canAccess('opd'));
  assert.ok(ability.can('opd', 'edit')); // nurse owns OPD/IPD workflow
  assert.ok(!ability.canAccess('billing')); // FRD §2.31.2 — Nurse has no Billing
  assert.ok(!ability.canAccess('pharmacy'));
});

test('operational roles never get delete by default', () => {
  for (const role of ['doctor', 'pharmacist', 'accountant', 'receptionist', 'nurse'] as const) {
    const grants = defaultGrantsFor(role);
    assert.ok(grants.every((g) => g.delete === false), `${role} should have no delete grants`);
  }
});

test('doctor can access clinical modules but not front office', () => {
  const ability = new Ability(grantsToPermissionKeys(defaultGrantsFor('doctor')));
  assert.ok(ability.can('opd', 'add'));
  assert.ok(ability.can('pathology', 'edit'));
  assert.ok(ability.canAccess('qr_attendance'));
  assert.ok(!ability.canAccess('front_office')); // FRD: Doctor has no Front Office
  assert.ok(!ability.canAccess('pharmacy')); // FRD: Doctor has no Pharmacy sidebar item
});

test('patient portal role is view-scoped with booking rights', () => {
  const ability = new Ability(grantsToPermissionKeys(defaultGrantsFor('patient')));
  assert.ok(ability.can('appointment', 'add')); // can book
  assert.ok(ability.can('billing', 'view'));
  assert.ok(!ability.can('billing', 'edit'));
  assert.ok(!ability.canAccess('setup'));
});

test('every role only references known modules', () => {
  const known = new Set<string>(MODULES);
  for (const role of ROLES) {
    for (const g of defaultGrantsFor(role)) {
      assert.ok(known.has(g.module), `unknown module ${g.module} in role ${role}`);
    }
  }
});
