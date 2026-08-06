import { SettingsRail } from './settings-rail';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <SettingsRail />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
