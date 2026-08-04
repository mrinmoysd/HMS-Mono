import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_BITS,
  FEATURES,
  FEATURE_GROUPS,
  GRANT_ROLE_ORDER,
  featureGrantsFor,
  getFeature,
} from './features';

/**
 * The transcription checksum.
 *
 * features.ts is 332 hand-copied rows of hex. A single mistyped digit would be
 * invisible on review and would silently mis-grant a permission. Every number
 * asserted here comes from docs/ROLE_PERMISSION_PARITY.md §1 and §5, which were
 * captured independently of §6 — so they cross-check the table rather than
 * restate it. If one of these fails, the table is wrong, not the test.
 */

/** §5, transposed: per group, [total, ...view counts in GRANT_ROLE_ORDER]. */
const VIEW_COUNTS: Record<string, number[]> = {
  //                      total  AD  AC  DR  PH  PA  RA  RE  NU
  dashboard: /*        */ [12, 12, 12, 3, 3, 2, 3, 7, 2],
  billing: /*          */ [18, 18, 16, 17, 2, 2, 2, 7, 0],
  appointment: /*      */ [9, 9, 5, 7, 0, 0, 0, 9, 0],
  opd: /*              */ [22, 22, 12, 18, 1, 3, 4, 12, 13],
  ipd: /*              */ [30, 30, 18, 23, 1, 4, 5, 11, 15],
  pharmacy: /*         */ [15, 15, 7, 4, 12, 0, 0, 4, 0],
  pathology: /*        */ [9, 9, 4, 4, 0, 9, 0, 2, 0],
  radiology: /*        */ [9, 9, 4, 5, 0, 0, 9, 2, 0],
  blood_bank: /*       */ [8, 8, 6, 5, 1, 8, 0, 5, 0],
  ambulance: /*        */ [4, 4, 4, 2, 0, 0, 0, 4, 0],
  front_office: /*     */ [6, 6, 0, 0, 0, 0, 0, 6, 0],
  birth_death: /*      */ [4, 4, 0, 4, 0, 0, 0, 2, 0],
  human_resource: /*   */ [12, 12, 5, 2, 2, 2, 2, 2, 2],
  duty_roster: /*      */ [4, 4, 0, 0, 0, 0, 0, 0, 0],
  annual_calendar: /*  */ [1, 1, 0, 0, 0, 0, 0, 0, 0],
  referral: /*         */ [4, 4, 4, 0, 0, 0, 0, 0, 0],
  tpa: /*              */ [2, 2, 2, 2, 0, 0, 0, 2, 0],
  income: /*           */ [2, 2, 2, 0, 0, 0, 0, 0, 0],
  expense: /*          */ [2, 2, 2, 0, 0, 0, 0, 0, 0],
  messaging: /*        */ [3, 3, 2, 2, 2, 2, 2, 2, 2],
  inventory: /*        */ [6, 6, 6, 0, 0, 0, 0, 2, 0],
  download_center: /*  */ [5, 5, 5, 5, 5, 5, 5, 5, 5],
  certificate: /*      */ [6, 6, 0, 4, 0, 0, 0, 0, 0],
  front_cms: /*        */ [7, 7, 0, 0, 0, 0, 0, 0, 0],
  live_consultation: /**/ [3, 3, 1, 2, 1, 1, 1, 1, 1],
  reports: /*          */ [47, 47, 26, 18, 2, 5, 1, 17, 4],
  system_settings: /*  */ [24, 24, 3, 3, 1, 1, 1, 1, 1],
  patient: /*          */ [3, 3, 2, 2, 1, 1, 1, 1, 1],
  hospital_charges: /* */ [5, 5, 5, 3, 5, 0, 5, 0, 0],
  chat: /*             */ [1, 1, 1, 1, 1, 1, 1, 1, 1],
  calendar_todo: /*    */ [1, 1, 1, 1, 1, 1, 1, 1, 1],
  survey: /*           */ [2, 2, 0, 0, 0, 0, 0, 0, 0],
  whatsapp: /*         */ [1, 1, 0, 0, 0, 0, 0, 0, 0],
  two_factor: /*       */ [2, 2, 0, 0, 0, 0, 0, 0, 0],
  qr_attendance: /*    */ [2, 2, 0, 2, 0, 0, 0, 0, 0],
  multi_branch: /*     */ [40, 40, 0, 0, 0, 0, 0, 0, 0],
};

const popcount = (n: number) => [1, 2, 4, 8].filter((b) => n & b).length;
/** Rows whose view checkbox the editor actually renders. */
const viewable = (fs: typeof FEATURES) => fs.filter((f) => f.actions.includes('view'));

// ── Table shape (spec §1) ────────────────────────────────────────────────────

test('the table has 36 groups and 332 feature rows', () => {
  assert.equal(FEATURE_GROUPS.length, 36);
  assert.equal(FEATURES.length, 332);
});

test('331 rows expose a view toggle', () => {
  // §1 says 331 and names Apply Leave as the exception, but Apply Leave is
  // `bbbbbbbb` and `b` includes view. The row without view is Staff Timeline,
  // `aaa00000`. The count is right; the prose names the wrong row.
  assert.equal(viewable(FEATURES).length, 331);
  const noView = FEATURES.filter((f) => !f.actions.includes('view'));
  assert.deepEqual(noView.map((f) => f.key), ['human_resource.staff_timeline']);
});

test('the editor renders 751 checkboxes', () => {
  assert.equal(
    FEATURES.reduce((n, f) => n + f.actions.length, 0),
    751,
  );
});

test('every feature key is unique', () => {
  assert.equal(new Set(FEATURES.map((f) => f.key)).size, FEATURES.length);
});

test('the duplicated Reports row is kept, not deduped', () => {
  // §6 lists "Payroll Report" twice. Dropping it would make Reports 46 and
  // break §5's count of 47, so both survive with distinct keys.
  const dupes = FEATURES.filter((f) => f.group === 'reports' && f.label === 'Payroll Report');
  assert.equal(dupes.length, 2);
  assert.deepEqual(dupes.map((f) => f.key), ['reports.payroll_report', 'reports.payroll_report_2']);
});

// ── Per-group view counts (spec §5) ──────────────────────────────────────────

test('§5 covers every group in the table', () => {
  assert.deepEqual(
    Object.keys(VIEW_COUNTS).sort(),
    FEATURE_GROUPS.map((g) => g.key).sort(),
  );
});

test('every group matches its §5 row, total and per-role', () => {
  const wrong: string[] = [];
  for (const group of FEATURE_GROUPS) {
    const [total, ...perRole] = VIEW_COUNTS[group.key];
    const got = viewable(group.features).length;
    if (got !== total) wrong.push(`${group.label}: total ${got}, §5 says ${total}`);

    GRANT_ROLE_ORDER.forEach((role, i) => {
      const n = group.features.filter((f) => f.grants[i] & ACTION_BITS.view).length;
      if (n !== perRole[i]) wrong.push(`${group.label}/${role}: ${n} views, §5 says ${perRole[i]}`);
    });
  }
  // Report every mismatch at once — a mistyped digit usually breaks two cells,
  // and seeing both together identifies the row far faster than one at a time.
  assert.deepEqual(wrong, []);
});

// ── Internal consistency ─────────────────────────────────────────────────────

test('Admin holds view on all 331 rendered view toggles', () => {
  assert.equal(FEATURES.filter((f) => f.grants[0] & ACTION_BITS.view).length, 331);
});

test('no role holds a toggle Admin does not', () => {
  // This is why deriving `actions` from Admin's mask is sound, and it is a
  // second, independent check on the hex: a typo adding a bit for some other
  // role surfaces here.
  const wrong = FEATURES.filter((f) => f.grants.reduce((a, b) => a | b, 0) !== f.grants[0]);
  assert.deepEqual(wrong.map((f) => f.key), []);
});

test('each feature exposes exactly the toggles Admin holds', () => {
  const wrong = FEATURES.filter((f) => f.actions.length !== popcount(f.grants[0]));
  assert.deepEqual(wrong.map((f) => f.key), []);
});

test('no role is granted an action its feature does not expose', () => {
  for (const f of FEATURES) {
    const exposed = f.actions.reduce((m, a) => m | ACTION_BITS[a], 0);
    for (const g of f.grants) assert.equal(g & ~exposed, 0, `${f.key}: grant ${g} exceeds ${exposed}`);
  }
});

// ── featureGrantsFor ─────────────────────────────────────────────────────────

test('super_admin holds every toggle', () => {
  assert.equal(featureGrantsFor('super_admin').length, 751);
});

test('patient gets nothing here — its grants live in roles.ts', () => {
  assert.deepEqual(featureGrantsFor('patient'), []);
});

test('a nurse may write nurse notes but may not register a patient', () => {
  // The concrete case this whole phase exists for: under the module-level
  // matrix the pair was inexpressible, because both sit under opd/ipd.
  const nurse = new Set(featureGrantsFor('nurse'));
  assert.equal(nurse.has('ipd.nurse_note:add'), true);
  assert.equal(nurse.has('ipd.nurse_note:edit'), true);
  assert.equal(nurse.has('opd.opd_patient:add'), false);
  assert.equal(nurse.has('ipd.ipd_patients:add'), false);
});

test('each diagnostic role is scoped to its own modality', () => {
  const patho = new Set(featureGrantsFor('pathologist'));
  assert.equal(patho.has('pathology.pathology_test:view'), true);
  assert.equal(patho.has('radiology.radiology_test:view'), false);

  const radio = new Set(featureGrantsFor('radiologist'));
  assert.equal(radio.has('radiology.radiology_test:view'), true);
  assert.equal(radio.has('pathology.pathology_test:view'), false);
});

test('Multi Branch belongs to Admin alone', () => {
  for (const role of GRANT_ROLE_ORDER) {
    const held = featureGrantsFor(role).filter((k) => k.startsWith('multi_branch.'));
    assert.equal(held.length, role === 'admin' ? 40 : 0, `${role} holds ${held.length}`);
  }
});

test('Apply Leave is granted to every role — view, add and delete', () => {
  for (const role of GRANT_ROLE_ORDER) {
    const held = featureGrantsFor(role)
      .filter((k) => k.startsWith('human_resource.apply_leave:'))
      .sort();
    assert.deepEqual(held, [
      'human_resource.apply_leave:add',
      'human_resource.apply_leave:delete',
      'human_resource.apply_leave:view',
    ], `for ${role}`);
  }
});

test('Staff Timeline is the one row with no view toggle', () => {
  const f = getFeature('human_resource.staff_timeline')!;
  assert.deepEqual([...f.actions], ['add', 'delete']);
  // Admin, Accountant and Doctor hold it; nobody else does.
  for (const role of GRANT_ROLE_ORDER) {
    const held = featureGrantsFor(role).filter((k) => k.startsWith('human_resource.staff_timeline:'));
    const expected = ['admin', 'accountant', 'doctor'].includes(role) ? 2 : 0;
    assert.equal(held.length, expected, `${role} holds ${held.length}`);
  }
});

// ── Group → module mapping ───────────────────────────────────────────────────

test('exactly the five known module absences are unmapped', () => {
  // Parity doc Part II §D. When R4 lands those modules, this list shrinks.
  const unmapped = FEATURE_GROUPS.filter((g) => g.module === null).map((g) => g.key).sort();
  assert.deepEqual(unmapped, ['calendar_todo', 'chat', 'survey', 'two_factor', 'whatsapp']);
});

test('Income and Expense both map onto the single finance module', () => {
  const byKey = Object.fromEntries(FEATURE_GROUPS.map((g) => [g.key, g.module]));
  assert.equal(byKey.income, 'finance');
  assert.equal(byKey.expense, 'finance');
});

test('every feature key resolves back to its definition', () => {
  for (const f of FEATURES) assert.equal(getFeature(f.key), f);
});
