import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attendanceSettingProblems,
  attendanceSettingSchema,
  classifyArrival,
  roleIsConfigured,
  toMinutes,
  type AttendanceSettingInput,
} from './attendance-setting';

/** A nurse ladder: present ≤09:00, late ≤09:30, half day ≤12:00, second shift ≤14:00. */
function withNurse(over: Partial<AttendanceSettingInput> = {}): AttendanceSettingInput {
  return attendanceSettingSchema.parse({
    biometricEnabled: true,
    roles: {
      nurse: {
        presentUntil: '09:00',
        lateUntil: '09:30',
        halfDayUntil: '12:00',
        halfDaySecondShiftUntil: '14:00',
      },
    },
    ...over,
  });
}

// ── toMinutes ───────────────────────────────────────────────────────

test('toMinutes converts a 24-hour time', () => {
  assert.equal(toMinutes('00:00'), 0);
  assert.equal(toMinutes('09:30'), 570);
  assert.equal(toMinutes('23:59'), 1439);
});

test('toMinutes rejects anything that is not HH:MM', () => {
  for (const bad of ['', '9:30', '24:00', '09:60', 'noon', '09-30', '0930']) {
    assert.equal(toMinutes(bad), null, bad);
  }
});

test('toMinutes tolerates surrounding whitespace', () => {
  assert.equal(toMinutes('  08:15 '), 495);
});

// ── The ladder ──────────────────────────────────────────────────────

test('an early arrival is present', () => {
  assert.equal(classifyArrival(withNurse(), 'nurse', '07:45'), 'present');
});

test('each band returns its own status', () => {
  const s = withNurse();
  assert.equal(classifyArrival(s, 'nurse', '09:15'), 'late');
  assert.equal(classifyArrival(s, 'nurse', '11:00'), 'half_day');
  assert.equal(classifyArrival(s, 'nurse', '13:00'), 'half_day_second_shift');
});

test('every threshold is inclusive — exactly on time earns the better status', () => {
  // The rule nobody would defend out loud is one that marks 09:00:00 late
  // against a 09:00 boundary.
  const s = withNurse();
  assert.equal(classifyArrival(s, 'nurse', '09:00'), 'present');
  assert.equal(classifyArrival(s, 'nurse', '09:30'), 'late');
  assert.equal(classifyArrival(s, 'nurse', '12:00'), 'half_day');
  assert.equal(classifyArrival(s, 'nurse', '14:00'), 'half_day_second_shift');
});

test('one minute past a threshold drops to the next band', () => {
  const s = withNurse();
  assert.equal(classifyArrival(s, 'nurse', '09:01'), 'late');
  assert.equal(classifyArrival(s, 'nurse', '09:31'), 'half_day');
  assert.equal(classifyArrival(s, 'nurse', '12:01'), 'half_day_second_shift');
});

test('past every band falls to the configured outcome', () => {
  assert.equal(classifyArrival(withNurse(), 'nurse', '15:00'), 'absent');
  assert.equal(classifyArrival(withNurse({ afterLastBand: 'half_day' }), 'nurse', '15:00'), 'half_day');
});

test('midnight and one-minute-to-midnight are handled', () => {
  const s = withNurse();
  assert.equal(classifyArrival(s, 'nurse', '00:00'), 'present');
  assert.equal(classifyArrival(s, 'nurse', '23:59'), 'absent');
});

// ── Null means "leave it alone" ─────────────────────────────────────

test('an unconfigured role classifies nothing', () => {
  // The property that stops this shipping as a silent mass-absence event.
  assert.equal(classifyArrival(withNurse(), 'doctor', '11:00'), null);
});

test('a role present but entirely blank classifies nothing', () => {
  const s = attendanceSettingSchema.parse({
    roles: { doctor: { presentUntil: '', lateUntil: '', halfDayUntil: '', halfDaySecondShiftUntil: '' } },
  });
  assert.equal(classifyArrival(s, 'doctor', '11:00'), null);
  assert.equal(roleIsConfigured(s, 'doctor'), false);
});

test('an unreadable arrival time classifies nothing', () => {
  assert.equal(classifyArrival(withNurse(), 'nurse', ''), null);
  assert.equal(classifyArrival(withNurse(), 'nurse', 'half past nine'), null);
});

test('a default (empty) setting classifies nothing for anyone', () => {
  const empty = attendanceSettingSchema.parse({});
  assert.equal(empty.biometricEnabled, false);
  assert.equal(classifyArrival(empty, 'nurse', '09:00'), null);
});

// ── Partly configured ladders ───────────────────────────────────────

test('a single threshold still classifies, falling through past it', () => {
  const s = attendanceSettingSchema.parse({ roles: { porter: { presentUntil: '09:00' } } });
  assert.equal(classifyArrival(s, 'porter', '08:00'), 'present');
  assert.equal(classifyArrival(s, 'porter', '09:01'), 'absent');
});

test('a gap in the middle of the ladder is skipped, not treated as zero', () => {
  // Late is blank: 09:01 must not fall into a band that was never set.
  const s = attendanceSettingSchema.parse({
    roles: { porter: { presentUntil: '09:00', lateUntil: '', halfDayUntil: '12:00' } },
  });
  assert.equal(classifyArrival(s, 'porter', '09:01'), 'half_day');
  assert.equal(classifyArrival(s, 'porter', '12:01'), 'absent');
});

// ── Validation ──────────────────────────────────────────────────────

test('a well-ordered ladder has no problems', () => {
  assert.deepEqual(attendanceSettingProblems(withNurse()), []);
});

test('a ladder that runs backwards is reported', () => {
  const s = attendanceSettingSchema.parse({
    roles: { nurse: { presentUntil: '10:00', lateUntil: '09:00' } },
  });
  const problems = attendanceSettingProblems(s);
  assert.equal(problems.length, 1);
  assert.match(problems[0]!, /Late \(09:00\) must be later than Present \(10:00\)/);
});

test('two thresholds at the same time are reported', () => {
  // Equal bounds make the second band unreachable, which is a typo not a plan.
  const s = attendanceSettingSchema.parse({
    roles: { nurse: { presentUntil: '09:00', lateUntil: '09:00' } },
  });
  assert.match(attendanceSettingProblems(s)[0]!, /must be later than/);
});

test('ordering is checked against the previous CONFIGURED band, not the previous field', () => {
  // Late blank, half day earlier than present: the comparison must reach past
  // the blank rather than silently passing.
  const s = attendanceSettingSchema.parse({
    roles: { nurse: { presentUntil: '10:00', lateUntil: '', halfDayUntil: '09:00' } },
  });
  assert.match(attendanceSettingProblems(s)[0]!, /Half Day \(09:00\) must be later than Present \(10:00\)/);
});

test('problems are reported per role', () => {
  const s = attendanceSettingSchema.parse({
    roles: {
      nurse: { presentUntil: '10:00', lateUntil: '09:00' },
      porter: { presentUntil: '10:00', lateUntil: '09:00' },
    },
  });
  assert.equal(attendanceSettingProblems(s).length, 2);
});

// ── Schema ──────────────────────────────────────────────────────────

test('the schema rejects a malformed time', () => {
  assert.equal(attendanceSettingSchema.safeParse({ roles: { nurse: { presentUntil: '25:00' } } }).success, false);
  assert.equal(attendanceSettingSchema.safeParse({ roles: { nurse: { presentUntil: '9:00' } } }).success, false);
});

test('the schema accepts a blank time as "not configured"', () => {
  assert.equal(attendanceSettingSchema.safeParse({ roles: { nurse: { presentUntil: '' } } }).success, true);
});

test('afterLastBand only accepts the two defensible outcomes', () => {
  assert.equal(attendanceSettingSchema.safeParse({ afterLastBand: 'present' }).success, false);
  assert.equal(attendanceSettingSchema.safeParse({ afterLastBand: 'half_day' }).success, true);
});

test('roleIsConfigured reflects whether anything would be classified', () => {
  assert.equal(roleIsConfigured(withNurse(), 'nurse'), true);
  assert.equal(roleIsConfigured(withNurse(), 'doctor'), false);
});
