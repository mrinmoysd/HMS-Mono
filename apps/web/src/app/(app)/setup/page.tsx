'use client';

import { PageHeader } from '@/components/ui/page-header';
import Link from 'next/link';
import {
  SlidersHorizontal,
  Receipt,
  Sparkles,
  BedDouble,
  Activity,
  CalendarClock,
  Users,
  Wallet,
  Boxes,
  Pill,
  Droplet,
  FlaskConical,
  Radio,
  ShieldCheck,
  SlidersHorizontal as Sliders,
} from 'lucide-react';

const AREAS = [
  {
    href: '/setup/settings/general',
    title: 'Settings',
    desc: 'Hospital identity, formats, prefixes and platform configuration. Admin and Super Admin only.',
    icon: Sliders,
  },
  {
    href: '/setup/roles',
    title: 'Roles & Permissions',
    desc: 'What each role may see and do, feature by feature. Admin and Super Admin only.',
    icon: ShieldCheck,
  },
  {
    href: '/setup/charges',
    title: 'Hospital Charges',
    desc: 'Charge categories, tax categories and the charge master used across all billing.',
    icon: Receipt,
  },
  {
    href: '/setup/appointment',
    title: 'Appointment Setup',
    desc: 'Shifts, appointment priorities, doctor shift assignment and consultation slots.',
    icon: CalendarClock,
  },
  {
    href: '/setup/clinical',
    title: 'Clinical Masters',
    desc: 'Vital types (with reference ranges), findings, symptoms and operation categories.',
    icon: Activity,
  },
  {
    href: '/setup/beds',
    title: 'Beds',
    desc: 'Floors, bed groups, bed types and the bed master for IPD admissions.',
    icon: BedDouble,
  },
  {
    href: '/setup/human-resources',
    title: 'Human Resources',
    desc: 'Departments and designations used across staff records.',
    icon: Users,
  },
  {
    href: '/setup/finance',
    title: 'Finance',
    desc: 'Income and expense heads used by the finance ledger.',
    icon: Wallet,
  },
  {
    href: '/setup/inventory',
    title: 'Inventory',
    desc: 'Item categories, stores and suppliers used by the inventory module.',
    icon: Boxes,
  },
  {
    href: '/setup/blood-bank',
    title: 'Blood Bank',
    desc: 'Blood products (component / blood group) used by the blood bank module.',
    icon: Droplet,
  },
  {
    href: '/setup/pathology',
    title: 'Pathology',
    desc: 'Categories, parameters and units used by the pathology module.',
    icon: FlaskConical,
  },
  {
    href: '/setup/radiology',
    title: 'Radiology',
    desc: 'Categories, parameters and units used by the radiology module.',
    icon: Radio,
  },
  {
    href: '/setup/pharmacy',
    title: 'Pharmacy',
    desc: 'Categories, companies, dosages, suppliers and units used by the pharmacy module.',
    icon: Pill,
  },
  {
    href: '/setup/custom-fields',
    title: 'Custom Fields',
    desc: 'Add typed extra fields to patients, appointments, staff and more — no code.',
    icon: Sparkles,
  },
];

export default function SetupPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 shrink-0 text-primary" /> Setup / Settings
          </span>
        }
        description="Master data & system configuration"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AREAS.map(({ href, title, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-md border border-border bg-surface p-4 transition hover:border-primary hover:shadow-sm"
          >
            <Icon className="mb-2 h-5 w-5 text-primary" />
            <p className="font-medium">{title}</p>
            <p className="mt-1 text-sm text-fg-muted">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
