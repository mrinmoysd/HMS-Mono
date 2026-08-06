'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Lock, Search, ShieldCheck } from 'lucide-react';
import type { ActionKey, PermissionChangeInput, RoleFeatureRowDto } from '@smart-hospital/shared';
import { ACTIONS } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/lib/auth-store';
import {
  useEditableRoles,
  useRolePermissions,
  useSaveRolePermissions,
} from '@/lib/hooks/use-role-permissions';

/** Pending edits, keyed `feature:action`. Absent means "unchanged". */
type Draft = Map<string, boolean>;

const key = (feature: string, action: ActionKey) => `${feature}:${action}`;

export default function RolePermissionsPage() {
  const me = useAuthStore((s) => s.user);
  const { data: roles, isLoading: rolesLoading } = useEditableRoles();
  const [slug, setSlug] = useState<string>();
  const active = slug ?? roles?.find((r) => r.editable)?.slug;

  const { data, isLoading } = useRolePermissions(active);
  const save = useSaveRolePermissions();
  const toast = useToast();

  const [draft, setDraft] = useState<Draft>(new Map());
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const role = roles?.find((r) => r.slug === active);
  const readOnly = !role?.editable;

  /** Current value = the draft if touched, else what the server sent. */
  const isOn = (row: RoleFeatureRowDto, action: ActionKey) =>
    draft.get(key(row.key, action)) ?? row.allowed.includes(action);

  function toggle(row: RoleFeatureRowDto, action: ActionKey, next: boolean) {
    if (readOnly) return;
    setDraft((prev) => {
      const copy = new Map(prev);
      const k = key(row.key, action);
      // Toggling back to the server's value clears the edit rather than
      // recording a no-op, so the save payload stays a true diff.
      if (row.allowed.includes(action) === next) copy.delete(k);
      else copy.set(k, next);
      return copy;
    });
  }

  const groups = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.groups;
    return data.groups
      .map((g) => ({
        ...g,
        features: g.features.filter(
          (f) => f.label.toLowerCase().includes(q) || g.label.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.features.length > 0);
  }, [data, search]);

  const changes: PermissionChangeInput[] = useMemo(
    () =>
      [...draft].map(([k, allowed]) => {
        const idx = k.lastIndexOf(':');
        return { feature: k.slice(0, idx), action: k.slice(idx + 1) as ActionKey, allowed };
      }),
    [draft],
  );

  async function onSave() {
    if (!active || changes.length === 0) return;
    const res = await save.mutateAsync({ slug: active, changes });
    setDraft(new Map());
    if (res.rejected.length) {
      // Refusals are surfaced, never swallowed. The commonest one is ticking an
      // action a feature does not expose, which would look saved and do nothing.
      toast.warning(
        `${res.applied} saved · ${res.rejected.length} refused — ${res.rejected[0]!.feature}: ${res.rejected[0]!.reason}`,
      );
    } else {
      toast.success(`Saved ${res.applied} change${res.applied === 1 ? '' : 's'}`);
    }
  }

  /** Tick or clear every toggle in a group — optionally just one column. */
  function setGroup(features: RoleFeatureRowDto[], value: boolean, only?: ActionKey) {
    if (readOnly) return;
    setDraft((prev) => {
      const copy = new Map(prev);
      for (const f of features) {
        for (const a of f.actions) {
          if (only && a !== only) continue;
          const k = key(f.key, a);
          if (f.allowed.includes(a) === value) copy.delete(k);
          else copy.set(k, value);
        }
      }
      return copy;
    });
  }

  return (
    <div className="space-y-4 pb-24">
      <PageHeader
        title="Roles & Permissions"
        description="What each role may see and do. Changes take effect on the next request — no re-login."
      />

      {/* Role picker */}
      <div className="flex flex-wrap gap-2 rounded-md border border-border bg-surface p-3">
        {rolesLoading && <Skeleton className="h-8 w-64" />}
        {roles?.map((r) => (
          <button
            key={r.slug}
            onClick={() => {
              if (draft.size && !confirm('Discard unsaved permission changes?')) return;
              setDraft(new Map());
              setSlug(r.slug);
            }}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${
              r.slug === active ? 'bg-primary text-primary-fg' : 'bg-bg text-fg-muted hover:text-fg'
            }`}
            title={r.reason}
          >
            {!r.editable && <Lock className="h-3.5 w-3.5" />}
            {r.label}
            <span className="tabular text-xs opacity-70">
              {r.allowedCount}/{r.totalCount}
            </span>
          </button>
        ))}
      </div>

      {role && !role.editable && (
        <div className="flex items-start gap-2 rounded-md border border-border bg-bg p-3 text-sm text-fg-muted">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{role.reason} Shown read-only.</span>
        </div>
      )}

      {role?.slug === me?.roleSlug && role?.editable && (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>
            This is your own role. Anything you remove here you lose immediately. Access to this
            screen is fixed to Admin and Super Admin, so you cannot lock yourself out of it.
          </span>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter features…"
          className="w-full rounded-sm border border-border bg-bg py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {data && groups.length === 0 && (
        <EmptyState icon={Search} title="No features match" description="Try a different search." />
      )}

      {groups.map((g) => {
        const expanded = open.has(g.key) || search.trim().length > 0;
        const total = g.features.reduce((n, f) => n + f.actions.length, 0);
        const on = g.features.reduce((n, f) => n + f.actions.filter((a) => isOn(f, a)).length, 0);
        return (
          <div key={g.key} className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <button
                onClick={() =>
                  setOpen((p) => {
                    const c = new Set(p);
                    c.has(g.key) ? c.delete(g.key) : c.add(g.key);
                    return c;
                  })
                }
                className="flex flex-1 items-center gap-2 text-left text-sm font-medium"
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {g.label}
                <span className="tabular text-xs text-fg-muted">
                  {on}/{total}
                </span>
              </button>
              {!readOnly && expanded && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setGroup(g.features, true)}>
                    All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setGroup(g.features, false)}>
                    None
                  </Button>
                </div>
              )}
            </div>

            {expanded && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-fg-muted">
                      <th className="px-3 py-2 text-left font-medium">Feature</th>
                      {ACTIONS.map((a) => (
                        <th key={a} className="w-20 px-2 py-2 text-center font-medium capitalize">
                          {!readOnly ? (
                            <button
                              className="hover:text-fg"
                              title={`Toggle ${a} for every feature in ${g.label}`}
                              onClick={() => {
                                const anyOff = g.features.some(
                                  (f) => f.actions.includes(a) && !isOn(f, a),
                                );
                                setGroup(g.features, anyOff, a);
                              }}
                            >
                              {a}
                            </button>
                          ) : (
                            a
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.features.map((f) => (
                      <tr key={f.key} className="border-b border-border/50 last:border-0">
                        <td className="px-3 py-1.5">
                          {f.label}
                          <span className="ml-2 font-mono text-[11px] text-fg-muted">{f.key}</span>
                        </td>
                        {ACTIONS.map((a) => (
                          <td key={a} className="px-2 py-1.5 text-center">
                            {/* A feature exposes exactly the toggles Admin holds.
                                Rendering a checkbox for an action it does not have
                                would offer a grant no guard could ever match. */}
                            {f.actions.includes(a) ? (
                              <Checkbox
                                checked={isOn(f, a)}
                                disabled={readOnly}
                                onChange={(e) => toggle(f, a, e.target.checked)}
                                aria-label={`${f.label} ${a}`}
                              />
                            ) : (
                              <span className="text-fg-muted/40" title="Not available for this feature">
                                —
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Save bar — only once something is actually different. */}
      {changes.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <span className="text-sm">
              <b className="tabular">{changes.length}</b> unsaved change
              {changes.length === 1 ? '' : 's'} to <b>{role?.label}</b>
            </span>
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={() => setDraft(new Map())}>
                Discard
              </Button>
              <Button onClick={onSave} disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
