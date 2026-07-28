'use client';

import { useState } from 'react';
import { ChevronLeft, KeyRound, Pencil, Mail, Phone } from 'lucide-react';
import type { StaffDetailDto } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Barcode } from '@/components/ui/barcode';
import { useChangeStaffPassword, useStaffProfile } from '@/lib/hooks/use-hr';
import { StaffAvatar, roleBadgeClass } from './staff-shared';

type Tab = 'profile' | 'payroll' | 'leaves' | 'attendance' | 'documents' | 'timeline';

export function StaffDetails({ userId, onBack, onEdit }: { userId: string; onBack: () => void; onEdit: () => void }) {
  const { data: s, isLoading } = useStaffProfile(userId);
  const [tab, setTab] = useState<Tab>('profile');
  const [pwOpen, setPwOpen] = useState(false);

  if (isLoading || !s) return <p className="py-16 text-center text-sm text-fg-muted">Loading…</p>;

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /> Staff Directory</button>

      {/* Header */}
      <div className="rounded-md border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4">
            <StaffAvatar photoUrl={s.photoUrl} name={s.name} size="lg" />
            <div>
              <p className="text-lg font-semibold">{s.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${roleBadgeClass(s.roleSlug)}`}>{s.roleLabel}</span>
                <span className="rounded-full border border-primary/40 px-2 py-0.5 text-xs text-primary">{s.staffNo ?? '—'}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${s.isActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{s.isActive ? '● Active' : '● Inactive'}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-fg-muted">
                {s.phone && <span className="flex items-center gap-1 rounded-sm bg-bg px-2 py-1"><Phone className="h-3.5 w-3.5" /> {s.phone}</span>}
                {s.email && <span className="flex items-center gap-1 rounded-sm bg-bg px-2 py-1"><Mail className="h-3.5 w-3.5" /> {s.email}</span>}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={onEdit}><Pencil className="h-4 w-4" /> Edit</Button>
                <Button size="sm" variant="secondary" onClick={() => setPwOpen(true)}><KeyRound className="h-4 w-4" /> Change Password</Button>
              </div>
            </div>
          </div>
          {s.staffNo && (
            <div className="flex flex-col items-center gap-1">
              <Barcode value={s.staffNo} height={40} />
              <span className="text-xs text-fg-muted">{s.staffNo}</span>
            </div>
          )}
        </div>
      </div>

      {/* Overview strip */}
      <div className="rounded-md border border-border bg-surface p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">Profile — Overview</h3>
        <div className="grid grid-cols-2 gap-y-4 text-sm sm:grid-cols-4">
          <Kv label="Department" value={s.departmentName} />
          <Kv label="Specialist" value={s.specialistName} />
          <Kv label="EPF No" value={s.epfNo} />
          <Kv label="Basic Salary" value={s.basicSalary ? s.basicSalary.toFixed(2) : null} />
          <Kv label="Contract Type" value={s.contractType} />
          <Kv label="Work Shift" value={s.workShift} />
          <Kv label="Work Location" value={s.workLocation} />
          <Kv label="Date of Joining" value={s.dateOfJoining ? fmt(s.dateOfJoining) : null} />
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-md border border-border bg-surface">
        <div className="flex flex-wrap gap-1 border-b border-border px-2">
          {(['profile', 'payroll', 'leaves', 'attendance', 'documents', 'timeline'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium capitalize transition ${tab === t ? 'border-primary text-primary' : 'border-transparent text-fg-muted hover:text-fg'}`}>
              {t === 'attendance' ? 'Staff Attendance' : t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'profile' && <ProfileTab s={s} fmt={fmt} />}
          {tab !== 'profile' && <p className="py-10 text-center text-sm text-fg-muted">Use the {tab === 'attendance' ? 'Staff Attendance' : tab.charAt(0).toUpperCase() + tab.slice(1)} screen from the directory to manage this staff&apos;s {tab}.</p>}
        </div>
      </div>

      <ChangePasswordDrawer open={pwOpen} userId={userId} onClose={() => setPwOpen(false)} />
    </div>
  );
}

function ProfileTab({ s, fmt }: { s: StaffDetailDto; fmt: (d: string | null) => string }) {
  return (
    <div className="space-y-6">
      <SectionGrid title="Staff Personal Information">
        <Kv label="Phone" value={s.phone} />
        <Kv label="Emergency Contact Number" value={s.emergencyContact} />
        <Kv label="Email" value={s.email} />
        <Kv label="Gender" value={s.gender} />
        <Kv label="Blood Group" value={s.bloodGroup} />
        <Kv label="Date of Birth" value={s.dob ? fmt(s.dob) : null} />
        <Kv label="Marital Status" value={s.maritalStatus} />
        <Kv label="Father Name" value={s.fatherName} />
        <Kv label="Mother Name" value={s.motherName} />
        <Kv label="Qualification" value={s.qualification} />
        <Kv label="Work Experience" value={s.workExperience} />
        <Kv label="Specialization" value={s.specialization} />
        <Kv label="Note" value={s.note} />
        <Kv label="PAN Number" value={s.panNumber} />
        <Kv label="National Identification Number" value={s.nationalId} />
        <Kv label="Local Identification Number" value={s.localId} />
        <Kv label="Reference Contact" value={s.referenceContact} />
      </SectionGrid>
      <SectionGrid title="Address">
        <Kv label="Current Address" value={s.currentAddress} />
        <Kv label="Permanent Address" value={s.permanentAddress} />
      </SectionGrid>
      <SectionGrid title="Bank Account Details">
        <Kv label="Account Title" value={s.bank.accountTitle} />
        <Kv label="Bank Name" value={s.bank.bankName} />
        <Kv label="Bank Branch Name" value={s.bank.branchName} />
        <Kv label="Bank Account Number" value={s.bank.accountNumber} />
        <Kv label="IFSC Code" value={s.bank.ifsc} />
      </SectionGrid>
      <SectionGrid title="Leave Allotment">
        <Kv label="Casual" value={String(s.leaves.casual)} />
        <Kv label="Privilege" value={String(s.leaves.privilege)} />
        <Kv label="Sick" value={String(s.leaves.sick)} />
        <Kv label="Maternity" value={String(s.leaves.maternity)} />
        <Kv label="Paternity" value={String(s.leaves.paternity)} />
        <Kv label="Fever" value={String(s.leaves.fever)} />
      </SectionGrid>
      <SectionGrid title="Social Media Link">
        <Kv label="Facebook URL" value={s.social.facebook} />
        <Kv label="Twitter URL" value={s.social.twitter} />
        <Kv label="LinkedIn URL" value={s.social.linkedin} />
        <Kv label="Instagram URL" value={s.social.instagram} />
      </SectionGrid>
    </div>
  );
}

function SectionGrid({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 rounded-sm bg-bg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">{title}</h4>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Kv({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="border-b border-border/50 pb-2">
      <p className="text-xs uppercase tracking-wide text-fg-muted">{label}</p>
      <p className="mt-0.5 text-sm">{value || '—'}</p>
    </div>
  );
}

function ChangePasswordDrawer({ open, userId, onClose }: { open: boolean; userId: string; onClose: () => void }) {
  const change = useChangeStaffPassword();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    setErr(null);
    if (pw.length < 6) { setErr('Password must be at least 6 characters'); return; }
    await change.mutateAsync({ userId, password: pw });
    setPw(''); onClose();
  }
  return (
    <FormDrawer open={open} title="Change Password" onClose={onClose} onSubmit={save} submitting={change.isPending}>
      {err && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>}
      <Field label="New Password" required><TextInput type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
    </FormDrawer>
  );
}
