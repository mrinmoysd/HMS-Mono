import type { SettingsNavItemDto } from '@smart-hospital/shared';

/**
 * The Settings rail — the reference's 20 entries, in its 5 groups, with an
 * honest `comingSoon` flag rather than a link to a page that does not exist.
 *
 * Roles Permissions already points at the editor built in phase R2. Everything
 * with `href: null` is a later phase of docs/SETTINGS_PARITY_PLAN.md; showing
 * them greyed is the same call made for unimplemented providers and modules —
 * an inventory that tells the truth beats a shorter list with silent gaps.
 */
export const SETTINGS_NAV: SettingsNavItemDto[] = [
  g('general', 'General Setting', 'Identity', '/setup/settings/general'),
  g('attendance', 'Attendance Setting', 'Identity', null),
  g('theme', 'Theme Studio', 'Identity', null),

  g('notification', 'Notification Setting', 'Notifications', null),
  g('system_notification', 'System Notification Setting', 'Notifications', null),

  g('sms', 'SMS Setting', 'Channels', null),
  g('whatsapp', 'WhatsApp Setting', 'Channels', null),
  g('email', 'Email Setting', 'Channels', null),
  g('payment', 'Payment Methods', 'Channels', null),

  g('front_cms', 'Front CMS Setting', 'Platform', null),
  g('prefix', 'Prefix Setting', 'Platform', '/setup/settings/prefix'),
  g('roles', 'Roles Permissions', 'Platform', '/setup/roles'),
  g('backup', 'Backup / Restore', 'Platform', null),
  g('languages', 'Languages', 'Platform', null),
  g('users', 'Users', 'Platform', null),
  g('captcha', 'Captcha Settings', 'Platform', null),

  g('queue', 'Queue Process', 'System', null),
];

function g(key: string, label: string, group: string, href: string | null): SettingsNavItemDto {
  return { key, label, group, href, comingSoon: href === null };
}
