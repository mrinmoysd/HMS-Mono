import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODULES } from './modules';
import { Ability, deriveModulePermissions, grantsToPermissionKeys } from './ability';
import { FEATURE_GROUPS, featureGrantsFor } from './features';
import { defaultGrantsFor } from './roles';
import { GRANT_ROLE_ORDER } from './features';

// ── The rollup ───────────────────────────────────────────────────────────────

test('every module is covered by at least one feature group', () => {
  // If a module had no group, deriveModulePermissions would silently drop it
  // and every call site guarding it would fail closed after R1.
  const covered = new Set(FEATURE_GROUPS.map((g) => g.module).filter(Boolean));
  const missing = MODULES.filter((m) => !covered.has(m));
  assert.deepEqual(missing, []);
});

test('super_admin rolls up to every toggle that exists — 102, not 116', () => {
  // Not MODULES × 4. Five modules have no write toggle anywhere in the spec:
  // Dashboard widgets, Reports and Multi Branch are view-only throughout,
  // Billing has no edit or delete on any feature, and QR Attendance is
  // view-only. A bit that does not exist cannot be rolled up.
  //
  // Checked when this landed: no controller guards any of those 14 absent
  // (module, action) pairs, so nothing fails closed when R1 migrates. If a
  // future call site needs one, the feature table is what has to change.
  const derived = deriveModulePermissions(featureGrantsFor('super_admin'));
  assert.equal(derived.length, 102);

  const held = new Set(derived);
  const writeless = MODULES.filter((m) => !['view', 'add', 'edit', 'delete'].every((a) => held.has(`${m}:${a}`)));
  assert.deepEqual(writeless, ['dashboard', 'billing', 'multi_branch', 'qr_attendance', 'reports']);
});

test('the rollup ORs across groups sharing a module', () => {
  // income + expense → finance, system_settings + hospital_charges → setup.
  // Pharmacist holds nothing in system_settings but full CRUD in hospital
  // charges, so setup must still open.
  const pharmacist = new Set(deriveModulePermissions(featureGrantsFor('pharmacist')));
  assert.equal(pharmacist.has('setup:edit'), true);

  const accountant = new Set(deriveModulePermissions(featureGrantsFor('accountant')));
  assert.equal(accountant.has('finance:add'), true);
});

test('groups with no module contribute nothing', () => {
  // Chat, Calendar To Do, Survey, Whatsapp, 2FA — until R4 lands them.
  const nurse = deriveModulePermissions(featureGrantsFor('nurse'));
  assert.equal(nurse.some((k) => k.startsWith('chat:')), false);
});

// ── Why the rollup must not be persisted ─────────────────────────────────────

test('the rollup over-grants delete on encounter modules', () => {
  // Not a bug in the rollup — an inherent limit of it, and the reason R1
  // (migrate call sites to feature keys) must precede any reseed of
  // role_permission from this derivation.
  //
  // A nurse may delete an OPD Timeline entry, an OPD Medication row and a
  // Nurse Note. OR those together and the module gate reads `opd:delete` /
  // `ipd:delete` — which is what guards DELETE /opd/:id, the whole visit.
  // On the encounter row itself the nurse holds view and nothing else.
  const features = featureGrantsFor('nurse');
  const rolled = new Set(deriveModulePermissions(features));
  const held = new Set(features);

  assert.equal(rolled.has('opd:delete'), true, 'rollup grants module-level delete');
  assert.equal(rolled.has('ipd:delete'), true);
  assert.equal(held.has('opd.opd_patient:delete'), false, 'but not on the encounter');
  assert.equal(held.has('ipd.ipd_patients:delete'), false);

  // The precise check disagrees with the coarse one. That gap is the whole
  // point of the migration, and it is why persisting the rollup would be a
  // privilege escalation rather than a refactor.
  const ability = new Ability([...rolled], features);
  assert.equal(ability.can('opd', 'delete'), true);
  assert.equal(ability.canFeature('opd.opd_patient', 'delete'), false);
});

test('the derived matrix differs from the hand-written one — deliberately', () => {
  // roles.ts was written from our own PERMISSION_MATRIX; features.ts is the
  // reference spec. They disagree for every role. Recording the fact here so
  // that swapping one for the other is always a conscious act with a diff to
  // review, never an accident.
  const differing = GRANT_ROLE_ORDER.filter((role) => {
    const derived = new Set(deriveModulePermissions(featureGrantsFor(role)));
    const current = new Set(grantsToPermissionKeys(defaultGrantsFor(role)));
    return derived.size !== current.size || [...derived].some((k) => !current.has(k));
  });
  assert.deepEqual([...differing], [...GRANT_ROLE_ORDER]);
});

// ── Ability ──────────────────────────────────────────────────────────────────

test('the existing single-argument constructor still works', () => {
  const a = new Ability(grantsToPermissionKeys(defaultGrantsFor('nurse')));
  assert.equal(a.can('opd', 'view'), true);
  assert.equal(a.can('billing', 'view'), false);
});

test('canFeature is exact when features are present', () => {
  const a = Ability.forRole('nurse');
  assert.equal(a.canFeature('ipd.nurse_note', 'add'), true);
  assert.equal(a.canFeature('opd.opd_patient', 'add'), false);
});

test('canFeature falls back to the module when no features are carried', () => {
  // A token minted before R0.4 has module keys only. Failing closed here would
  // lock out every live session the moment the API deploys.
  const legacy = new Ability(grantsToPermissionKeys(defaultGrantsFor('doctor')));
  assert.equal(legacy.canFeature('opd.opd_patient', 'view'), true);
  assert.equal(legacy.canFeature('front_cms.pages', 'view'), false);
});

test('canFeature rejects an unknown key rather than opening', () => {
  const legacy = new Ability(grantsToPermissionKeys(defaultGrantsFor('admin')));
  assert.equal(legacy.canFeature('nope.not_a_feature', 'view'), false);
});

test('a feature in an unmapped group is denied under the fallback', () => {
  const legacy = new Ability(grantsToPermissionKeys(defaultGrantsFor('admin')));
  assert.equal(legacy.canFeature('chat.chat', 'view'), false);
});

test('forRole builds both levels consistently', () => {
  const a = Ability.forRole('pathologist');
  assert.equal(a.canAccess('pathology'), true);
  assert.equal(a.canFeature('pathology.pathology_test', 'view'), true);
  assert.equal(a.canFeature('radiology.radiology_test', 'view'), false);
  assert.equal(a.featureKeys().length, featureGrantsFor('pathologist').length);
});
