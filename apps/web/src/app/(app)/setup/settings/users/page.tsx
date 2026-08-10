'use client';

import { useState } from 'react';
import { Info, KeyRound, ShieldOff, ShieldCheck } from 'lucide-react';
import type { UserAccountDto, UserAccountType } from '@smart-hospital/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Field, Select, TextArea, TextInput } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/format';
import { useResetUserPassword, useSetUserStatus, useSettingsUsers } from '@/lib/hooks/use-settings';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active only' },
  { value: 'suspended', label: 'Suspended only' },
];

export default function SettingsUsersPage() {
  const [type, setType] = useState<UserAccountType>('staff');
  const [status, setStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);

  const { data, isLoading } = useSettingsUsers({ type, status, search, page, size });
  const [suspending, setSuspending] = useState<UserAccountDto | null>(null);
  const [resetting, setResetting] = useState<UserAccountDto | null>(null);

  const setStatusMut = useSetUserStatus();
  const toast = useToast();

  async function reinstate(row: UserAccountDto) {
    try {
      await setStatusMut.mutateAsync({ id: row.id, isActive: true, reason: '' });
      toast.success(`${row.name} can sign in again`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not reinstate');
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Users"
        description="Every account that can sign in — staff and patient portal logins."
      />

      <div className="flex items-start gap-2 rounded-md border border-border bg-bg p-3 text-sm text-fg-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Suspending an account blocks sign-in immediately — an already-open session stops working
          on its next action, not when its token expires. It leaves the person&apos;s records,
          rosters and history untouched, which is what makes it the right tool for leave or an
          investigation. Deleting a staff member is done from Human Resource.
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Tabs
          tabs={[
            { value: 'staff', label: 'Staff' },
            { value: 'patient', label: 'Patient' },
          ]}
          value={type}
          onChange={(v) => {
            setType(v as UserAccountType);
            setPage(1);
          }}
        />
        <div className="ml-auto flex flex-wrap items-end gap-3">
          <div className="w-44">
            <Field label="Status">
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as 'all' | 'active' | 'suspended');
                  setPage(1);
                }}
                options={STATUS_OPTIONS}
              />
            </Field>
          </div>
        </div>
      </div>

      <DataTable<UserAccountDto>
        rows={data?.data ?? []}
        meta={data?.meta}
        loading={isLoading}
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onPage={setPage}
        onSize={setSize}
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (r) => (
              <div>
                <div className="flex items-center gap-2 font-medium">
                  {r.name}
                  {r.isSelf && <Badge tone="neutral">You</Badge>}
                </div>
                <div className="text-xs text-fg-muted">
                  {r.username}
                  {r.referenceNo ? ` \u00b7 ${r.referenceNo}` : ''}
                </div>
              </div>
            ),
          },
          { key: 'roleLabel', header: 'Role', render: (r) => r.roleLabel },
          {
            key: 'contact',
            header: 'Contact',
            render: (r) => (
              <div className="text-xs">
                <div>{r.email ?? '\u2014'}</div>
                <div className="text-fg-muted">{r.phone ?? '\u2014'}</div>
              </div>
            ),
          },
          {
            key: 'lastLoginAt',
            header: 'Last sign-in',
            // An account that has never been used is worth noticing: it is
            // either a person who does not need it, or one who never got set up.
            render: (r) =>
              r.lastLoginAt ? formatDateTime(r.lastLoginAt) : <span className="text-fg-subtle">Never</span>,
          },
          {
            key: 'isActive',
            header: 'Status',
            render: (r) =>
              r.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Suspended</Badge>,
          },
        ]}
        rowActions={(r) =>
          r.canManage ? (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => setResetting(r)}>
                <KeyRound className="mr-1 h-3.5 w-3.5" />
                Reset password
              </Button>
              {r.isActive ? (
                <Button variant="ghost" size="sm" onClick={() => setSuspending(r)}>
                  <ShieldOff className="mr-1 h-3.5 w-3.5" />
                  Suspend
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => reinstate(r)}>
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  Reinstate
                </Button>
              )}
            </div>
          ) : (
            // The reason travels with the row, so the screen never has to guess
            // why an action is unavailable.
            <div className="text-right text-xs text-fg-subtle">{r.managedBlockedReason}</div>
          )
        }
      />

      {suspending && (
        <SuspendModal user={suspending} onClose={() => setSuspending(null)} />
      )}
      {resetting && <ResetModal user={resetting} onClose={() => setResetting(null)} />}
    </div>
  );
}

function SuspendModal({ user, onClose }: { user: UserAccountDto; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const mut = useSetUserStatus();
  const toast = useToast();

  async function submit() {
    try {
      await mut.mutateAsync({ id: user.id, isActive: false, reason });
      toast.success(`${user.name} can no longer sign in`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not suspend');
    }
  }

  return (
    <Modal open onClose={onClose} title={`Suspend ${user.name}?`}>
      <div className="space-y-3">
        <p className="text-sm text-fg-muted">
          They will be signed out on their next action and cannot sign in again until reinstated.
          Their records, rosters and history are untouched.
        </p>
        <Field label="Reason" hint="Recorded in the audit trail. Optional but worth writing.">
          <TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? 'Suspending…' : 'Suspend'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ResetModal({ user, onClose }: { user: UserAccountDto; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const mut = useResetUserPassword();
  const toast = useToast();
  const tooShort = password.length > 0 && password.length < 8;

  async function submit() {
    try {
      await mut.mutateAsync({ id: user.id, password });
      toast.success(`Password reset for ${user.name}`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not reset the password');
    }
  }

  return (
    <Modal open onClose={onClose} title={`Reset password for ${user.name}`}>
      <div className="space-y-3">
        <p className="text-sm text-fg-muted">
          Set a temporary password and pass it to {user.name} through a channel you trust. It is
          never shown again after this dialog closes and is not written to the audit trail.
        </p>
        <Field label="New password" required error={tooShort ? 'Use at least 8 characters' : undefined}>
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mut.isPending || password.length < 8}>
            {mut.isPending ? 'Saving…' : 'Reset password'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
