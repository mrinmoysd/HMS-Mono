'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from './button';
import { Field, Select, TextInput } from './field';

const OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom' },
];

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Resolve a named duration into a concrete [from, to] ISO date range. */
export function getDurationRange(duration: string): { from: string; to: string } {
  const now = new Date();
  const today = iso(now);
  switch (duration) {
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: iso(y), to: iso(y) };
    }
    case 'this_week': {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      return { from: iso(start), to: today };
    }
    case 'this_month':
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    case 'this_year':
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to: today };
    default:
      return { from: today, to: today };
  }
}

/** "Time Duration" select + Search button (FRD Multi-Branch Overview filter). */
export function DurationSelect({ onSearch }: { onSearch: (from: string, to: string) => void }) {
  const [duration, setDuration] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  function search() {
    if (duration === 'custom') onSearch(customFrom, customTo);
    else onSearch(...(Object.values(getDurationRange(duration)) as [string, string]));
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface p-4">
      <div className="w-52">
        <Field label="Time Duration" required>
          <Select value={duration} onChange={(e) => setDuration(e.target.value)} options={OPTIONS} />
        </Field>
      </div>
      {duration === 'custom' && (
        <>
          <div className="w-44"><Field label="From"><TextInput type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></Field></div>
          <div className="w-44"><Field label="To"><TextInput type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></Field></div>
        </>
      )}
      <Button onClick={search}><Search className="h-4 w-4" /> Search</Button>
    </div>
  );
}
