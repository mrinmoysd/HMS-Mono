import { SettingsRail } from './settings-rail';

// Stacks on a phone (the rail renders as a jump menu there) and sits beside the
// content from `md` up. Without the stack the 14rem rail and the form shared a
// 375px row, leaving the fields about 120px wide.
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <SettingsRail />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
