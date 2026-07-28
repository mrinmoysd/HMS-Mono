import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export interface AgeParts {
  years: number;
  months: number;
  days: number;
}

/** Canonical age storage is "Y-M-D" (e.g. "45-3-2"). Parse defensively. */
export function parseAge(age: string | null | undefined): AgeParts {
  const m = String(age ?? '').match(/^(\d+)-(\d+)-(\d+)$/);
  if (m) return { years: Number(m[1]), months: Number(m[2]), days: Number(m[3]) };
  // Legacy: a bare number is years.
  const n = Number.parseInt(String(age ?? ''), 10);
  return { years: Number.isNaN(n) ? 0 : n, months: 0, days: 0 };
}

export function composeAge({ years, months, days }: AgeParts): string {
  return `${years || 0}-${months || 0}-${days || 0}`;
}

/** Display an age as "45Y 3M 2D" (Y,M,D format from the demo). Falls back to the raw string. */
export function formatAge(age: string | null | undefined): string {
  if (!age) return '—';
  if (!/^\d+-\d+-\d+$/.test(age)) return age; // non-canonical: show as-is
  const { years, months, days } = parseAge(age);
  const parts: string[] = [];
  if (years) parts.push(`${years}Y`);
  if (months) parts.push(`${months}M`);
  if (days) parts.push(`${days}D`);
  return parts.length ? parts.join(' ') : '0Y';
}

/** Years/Months/Days elapsed since a date of birth. */
export function ageFromDob(dob: string): AgeParts {
  const birth = new Date(dob);
  const now = new Date();
  if (Number.isNaN(birth.getTime()) || birth > now) return { years: 0, months: 0, days: 0 };
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}
