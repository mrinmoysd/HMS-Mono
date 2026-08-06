import { GENERAL_SETTING_DEFAULT, type GeneralSettingInput } from '@smart-hospital/shared';

/**
 * The branch's General Setting, readable synchronously from anywhere.
 *
 * Formatting and printing happen in plain modules — `lib/format.ts`,
 * `lib/print.ts` — that are called from ~100 places, many of them inside
 * `.map()` callbacks and print builders. Threading settings through every one
 * of those call sites would be a far larger and more fragile change than
 * holding one snapshot here, so the settings arrive once and everything reads
 * them synchronously.
 *
 * The snapshot is populated by `HospitalSettingsGate` in the app layout, which
 * blocks first render until the fetch resolves. That means no screen inside the
 * app ever formats a date with the defaults and then re-renders with the real
 * format — a flicker that would look like a bug on every list in the product.
 *
 * Until then it is the schema defaults, so a module imported at build time (or
 * a unit test) never sees `undefined`.
 */
let current: GeneralSettingInput = GENERAL_SETTING_DEFAULT;

export function setHospitalSettings(value: GeneralSettingInput): void {
  current = value;
}

export function hospitalSettings(): GeneralSettingInput {
  return current;
}
