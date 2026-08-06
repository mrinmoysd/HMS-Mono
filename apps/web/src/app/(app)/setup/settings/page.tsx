import { redirect } from 'next/navigation';

/** Settings has no landing screen of its own; General is the first entry. */
export default function SettingsIndex() {
  redirect('/setup/settings/general');
}
