'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, Eye, Plus, Trash2, Upload } from 'lucide-react';
import type { LeaveRequestDto } from '@smart-hospital/shared';
import { leaveRequestSchema } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Field, Select, TextArea, TextInput } from '@/components/ui/field';
import { useStaff, useStaffRoles, useCreateLeave, useDeleteLeave, useLeaves, useLeave, useLeaveTypes, useSetLeaveStatus } from '@/lib/hooks/use-hr';
import { useAbility } from '@/lib/auth-store';
import { ApiRequestError } from '@/lib/api';

function statusPill(status: string) {
  const cls = status === 'approved' ? 'bg-success/10 text-success' : status === 'disapprove' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning';
  const label = status === 'approved' ? 'approve' : status === 'disapprove' ? 'disapprove' : 'pending';
  return <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{label}</span>;
}

export function LeavesView({ mode, onBack, onSwitch }: { mode: 'my' | 'approve'; onBack: () => void; onSwitch: (m: 'my' | 'approve') => void }) {
  const ability = useAbility();
  const canAdd = ability.can('human_resource', 'add');
  const canDelete = ability.can('human_resource', 'delete');
  const [page, setPage] = useState(1);
  const leaves = useLeaves({ page, size: 100 });
  const del = useDeleteLeave();
  const toast = useToast();
  const confirm = useConfirm();
  const [applyOpen, setApplyOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = leaves.data?.data ?? [];
  const approveMode = mode === 'approve';

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /> Staff Directory</button>
      <PageHeader
        title={approveMode ? 'Approve Leave Request' : 'My Leaves'}
        actions={
          <>
            {canAdd && <Button onClick={() => setApplyOpen(true)}><Plus className="h-4 w-4" /> {approveMode ? 'Add Leave Request' : 'Apply Leave'}</Button>}
            {!approveMode && <Button variant="secondary" onClick={() => onSwitch('approve')}>Approve Leave Request</Button>}
            {approveMode && <Button variant="secondary" onClick={() => onSwitch('my')}>My Leaves</Button>}
          </>
        }
      />

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              {['Staff', 'Leave Type', 'Leave Date', 'Days', 'Apply Date', 'Status', ...(approveMode ? ['Status Date'] : []), 'Action'].map((c) => <th key={c} className="px-3 py-2.5 font-semibold">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5">{l.staffName}{l.staffNo ? ` (${l.staffNo})` : ''}</td>
                <td className="px-3 py-2.5">{l.leaveTypeName ?? '—'}</td>
                <td className="px-3 py-2.5">{new Date(l.fromDate).toLocaleDateString()} - {new Date(l.toDate).toLocaleDateString()}</td>
                <td className="px-3 py-2.5 tabular">{l.days}</td>
                <td className="px-3 py-2.5">{new Date(l.applyDate).toLocaleDateString()}</td>
                <td className="px-3 py-2.5">
                  {approveMode
                    ? <span className="text-xs">{l.status === 'approved' ? 'Approve' : l.status === 'disapprove' ? 'Disapprove' : 'Pending'}{l.statusByName ? ` By ${l.statusByName}${l.statusByNo ? ` (${l.statusByNo})` : ''}` : ''}</span>
                    : statusPill(l.status)}
                </td>
                {approveMode && <td className="px-3 py-2.5">{l.statusAt ? new Date(l.statusAt).toLocaleDateString() : ''}</td>}
                <td className="px-3 py-2.5">
                  <div className="flex gap-1">
                    <button onClick={() => setDetailId(l.id)} aria-label="Details" title="Details" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"><Eye className="h-4 w-4" /></button>
                    {canDelete && (
                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: `Delete leave request for ${l.staffName}?`,
                            description: 'The request and its approval history will be removed. This cannot be undone.',
                            confirmLabel: 'Delete request',
                            tone: 'danger',
                          });
                          if (!ok) return;
                          try {
                            await del.mutateAsync(l.id);
                            toast.success('Leave request deleted');
                          } catch (e) {
                            toast.error('Could not delete leave request', { description: (e as Error).message });
                          }
                        }}
                        aria-label="Delete"
                        title="Delete"
                        className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {leaves.isLoading && <p className="py-8 text-center text-sm text-fg-muted">Loading…</p>}
        {!leaves.isLoading && rows.length === 0 && <p className="py-10 text-center text-sm text-fg-muted">No leave requests</p>}
        {leaves.data && <p className="px-3 py-2.5 text-xs text-fg-muted">Records: 1 to {rows.length} of {leaves.data.meta.total}</p>}
      </div>

      <ApplyLeaveModal open={applyOpen} onClose={() => setApplyOpen(false)} />
      <LeaveDetailModal id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function ApplyLeaveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const roles = useStaffRoles();
  const [role, setRole] = useState('');
  const staff = useStaff(role || undefined, { size: 200 });
  const leaveTypes = useLeaveTypes();
  const create = useCreateLeave();

  const [staffUserId, setStaffUserId] = useState('');
  const [applyDate, setApplyDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function readDoc(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttachmentUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function save() {
    setError(null);
    const parsed = leaveRequestSchema.safeParse({ staffUserId, leaveTypeId: leaveTypeId || null, applyDate: new Date(applyDate), fromDate: fromDate ? new Date(fromDate) : undefined, toDate: toDate ? new Date(toDate) : undefined, reason, note, attachmentUrl, status });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check the highlighted fields'); return; }
    try { await create.mutateAsync(parsed.data); onClose(); }
    catch (err) { setError(err instanceof ApiRequestError ? err.error.message : 'Save failed'); }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add Leave Request"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={create.isPending}>Save</Button>
        </>
      }
    >
        <div className="space-y-5">
          {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Leave Request</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Role" required><Select value={role} onChange={(e) => { setRole(e.target.value); setStaffUserId(''); }} placeholder="Select" options={(roles.data ?? []).map((r) => ({ value: r.slug, label: r.label }))} /></Field>
              <Field label="Name" required><Select value={staffUserId} onChange={(e) => setStaffUserId(e.target.value)} placeholder="Select" options={(staff.data?.data ?? []).map((s) => ({ value: s.userId, label: `${s.name}${s.staffNo ? ` (${s.staffNo})` : ''}` }))} /></Field>
              <Field label="Apply Date" required><TextInput type="date" value={applyDate} onChange={(e) => setApplyDate(e.target.value)} /></Field>
              <Field label="Leave Type" required><Select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)} placeholder="Select" options={(leaveTypes.data ?? []).map((t) => ({ value: t.id, label: t.name }))} /></Field>
              <Field label="Leave From Date" required><TextInput type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></Field>
              <Field label="Leave To Date" required><TextInput type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></Field>
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">Add Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Reason"><TextArea value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
              <Field label="Note"><TextArea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Attach Document">
                {attachmentUrl ? (
                  <div className="flex items-center justify-between rounded-sm border border-border px-3 py-2 text-sm"><span>File attached</span><button type="button" className="text-xs text-danger" onClick={() => setAttachmentUrl('')}>Remove</button></div>
                ) : (
                  <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-border text-xs text-fg-muted hover:border-primary"><Upload className="h-4 w-4" /><span>Drop a file here or click</span><input type="file" className="hidden" onChange={(e) => readDoc(e.target.files?.[0])} /></label>
                )}
              </Field>
              <Field label="Status">
                <div className="flex overflow-hidden rounded-sm border border-border">
                  {['pending', 'approved', 'disapprove'].map((st) => (
                    <button key={st} type="button" onClick={() => setStatus(st)} className={`flex-1 px-3 py-2 text-sm capitalize ${status === st ? 'bg-warning text-white' : 'text-fg-muted hover:bg-border/40'}`}>{st === 'approved' ? 'Approved' : st}</button>
                  ))}
                </div>
              </Field>
            </div>
          </div>
        </div>
    </Modal>
  );
}

function LeaveDetailModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data } = useLeave(id);
  const setStatus = useSetLeaveStatus();
  const [status, setStatusVal] = useState('pending');
  const [note, setNote] = useState('');

  useEffect(() => { if (data) { setStatusVal(data.status); setNote(data.note ?? ''); } }, [data]);
  if (!id) return null;

  async function save() {
    if (!id) return;
    await setStatus.mutateAsync({ id, input: { status: status as never, note } });
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Leave Details"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={setStatus.isPending} disabled={!data}>Save</Button>
        </>
      }
    >
        <div className="space-y-5">
          {!data ? <p className="py-10 text-center text-sm text-fg-muted">Loading…</p> : (
            <>
              <h3 className="text-sm font-semibold">Approve Leave Request</h3>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                <Row label="Name" value={`${data.staffName}${data.staffNo ? ` (${data.staffNo})` : ''}`} />
                <Row label="Leave Type" value={data.leaveTypeName ?? '—'} />
                <Row label="Apply Date" value={new Date(data.applyDate).toLocaleDateString()} />
                <Row label="Leave" value={`${new Date(data.fromDate).toLocaleDateString()} – ${new Date(data.toDate).toLocaleDateString()} (${data.days} Days)`} />
                <Row label="Reason" value={data.reason ?? '—'} />
                <Row label="Download" value={data.attachmentUrl ? 'Attached' : '—'} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Note (Only display for admin)"><TextArea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
                <Field label="Status">
                  <div className="flex overflow-hidden rounded-sm border border-border">
                    {['pending', 'approved', 'disapprove'].map((st) => (
                      <button key={st} type="button" onClick={() => setStatusVal(st)} className={`flex-1 px-3 py-2 text-sm capitalize ${status === st ? 'bg-warning text-white' : 'text-fg-muted hover:bg-border/40'}`}>{st === 'approved' ? 'Approved' : st}</button>
                    ))}
                  </div>
                </Field>
              </div>
            </>
          )}
        </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs uppercase tracking-wide text-fg-muted">{label}</p><p className="mt-0.5">{value}</p></div>;
}
