'use client';

import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * One consistent empty state. Today each list invents its own string and
 * padding — "No records found.", "No patients found.", "No messages posted
 * yet.", "No blood in stock" — with no icon and no next action.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Primary next step, e.g. an "Add Patient" button. */
  action?: React.ReactNode;
  /** Tighter padding for empty states nested inside a table or card body. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 px-4 py-10' : 'gap-3 px-6 py-16',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-surface-sunken text-fg-subtle',
          compact ? 'h-9 w-9' : 'h-12 w-12',
        )}
      >
        <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
