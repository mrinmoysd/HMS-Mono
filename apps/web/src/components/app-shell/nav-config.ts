import {
  Ambulance,
  Award,
  Baby,
  BarChart3,
  BedDouble,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Contact,
  Download,
  Droplet,
  Globe,
  LayoutDashboard,
  MessageSquare,
  Microscope,
  Network,
  Package,
  Pill,
  QrCode,
  Receipt,
  ScanLine,
  Settings,
  Share2,
  ShieldCheck,
  Stethoscope,
  Users,
  Video,
  Wallet,
} from 'lucide-react';
import type { ModuleKey } from '@smart-hospital/shared';

/**
 * Sidebar presentation for each module. Kept in the web app rather than
 * `packages/shared` because shared is framework-agnostic and must not import
 * React components.
 */
export const MODULE_ICONS: Record<ModuleKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  patient: Users,
  appointment: CalendarCheck,
  opd: Stethoscope,
  ipd: BedDouble,
  pathology: Microscope,
  radiology: ScanLine,
  blood_bank: Droplet,
  pharmacy: Pill,
  inventory: Package,
  billing: Receipt,
  finance: Wallet,
  tpa: ShieldCheck,
  referral: Share2,
  ambulance: Ambulance,
  front_office: Building2,
  birth_death: Baby,
  human_resource: Contact,
  qr_attendance: QrCode,
  duty_roster: CalendarClock,
  annual_calendar: CalendarDays,
  messaging: MessageSquare,
  download_center: Download,
  live_consultation: Video,
  multi_branch: Network,
  front_cms: Globe,
  certificate: Award,
  reports: BarChart3,
  setup: Settings,
};

/** Maps a module to its route. Dashboard → /dashboard, others → /{module}. */
export function moduleHref(key: ModuleKey): string {
  return key === 'dashboard' ? '/dashboard' : `/${key}`;
}

export interface SubNavItem {
  label: string;
  href: string;
}

/**
 * Second-level navigation.
 *
 * Only routes that actually exist are listed. Several modules (Duty Roster,
 * Inventory, Referral, Messaging, TPA, Finance) currently fake their sub-views
 * with in-page state because the old sidebar had no sub-nav; converting those
 * to real routes is U4 work, and they gain entries here when they land.
 */
export const MODULE_SUBNAV: Partial<Record<ModuleKey, SubNavItem[]>> = {
  appointment: [
    { label: 'Appointments', href: '/appointment' },
    { label: 'Doctor-Wise', href: '/appointment/doctor-wise' },
    { label: 'Patient Queue', href: '/appointment/queue' },
  ],
  reports: [
    { label: 'All Reports', href: '/reports' },
    { label: 'TPA Report', href: '/reports/tpa' },
  ],
  setup: [
    { label: 'Overview', href: '/setup' },
    { label: 'Appointment', href: '/setup/appointment' },
    { label: 'Beds', href: '/setup/beds' },
    { label: 'Blood Bank', href: '/setup/blood-bank' },
    { label: 'Charges', href: '/setup/charges' },
    { label: 'Clinical', href: '/setup/clinical' },
    { label: 'Custom Fields', href: '/setup/custom-fields' },
    { label: 'Finance', href: '/setup/finance' },
    { label: 'Human Resources', href: '/setup/human-resources' },
    { label: 'Inventory', href: '/setup/inventory' },
    { label: 'Pathology', href: '/setup/pathology' },
    { label: 'Pharmacy', href: '/setup/pharmacy' },
    { label: 'Radiology', href: '/setup/radiology' },
  ],
};
