'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, Plus, Upload, X } from 'lucide-react';
import { BLOOD_GROUPS, CONTRACT_TYPES, GENDERS, MARITAL_STATUS, staffSchema, staffUpdateSchema } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Field, Select, TextArea, TextInput } from '@/components/ui/field';
import { useCatalog } from '@/lib/hooks/use-masters';
import { useCreateStaff, useStaffProfile, useStaffRoles, useUpdateStaff } from '@/lib/hooks/use-hr';
import { ApiRequestError } from '@/lib/api';

type F = Record<string, string>;
const opt = (v: readonly string[]) => v.map((x) => ({ value: x, label: x.charAt(0).toUpperCase() + x.slice(1) }));

/** Add/Edit Staff — long multi-section form matching the demo. */
export function StaffForm({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const isEdit = !!userId;
  const roles = useStaffRoles();
  const depts = useCatalog('department', { size: 100 });
  const designations = useCatalog('designation', { size: 100 });
  const specializations = useCatalog('specialization', { size: 100 });
  const profile = useStaffProfile(userId);
  const create = useCreateStaff();
  const update = useUpdateStaff();

  const [f, setF] = useState<F>({});
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (isEdit && profile.data) {
      const p = profile.data;
      setMore(true);
      setF({
        staffNo: p.staffNo ?? '', roleSlug: p.roleSlug, designationId: p.designationId ?? '', departmentId: p.departmentId ?? '', specialistId: p.specialistId ?? '',
        firstName: p.firstName ?? '', lastName: p.lastName ?? '', fatherName: p.fatherName ?? '', motherName: p.motherName ?? '',
        gender: p.gender ?? '', maritalStatus: p.maritalStatus ?? '', bloodGroup: p.bloodGroup ?? '', dob: p.dob ? p.dob.slice(0, 10) : '',
        dateOfJoining: p.dateOfJoining ? p.dateOfJoining.slice(0, 10) : '', phone: p.phone ?? '', emergencyContact: p.emergencyContact ?? '', email: p.email ?? '',
        photoUrl: p.photoUrl ?? '', currentAddress: p.currentAddress ?? '', permanentAddress: p.permanentAddress ?? '', qualification: p.qualification ?? '',
        workExperience: p.workExperience ?? '', specialization: p.specialization ?? '', note: p.note ?? '', panNumber: p.panNumber ?? '', nationalId: p.nationalId ?? '',
        localId: p.localId ?? '', referenceContact: p.referenceContact ?? '', epfNo: p.epfNo ?? '', basicSalary: p.basicSalary ? String(p.basicSalary) : '',
        contractType: p.contractType ?? '', workShift: p.workShift ?? '', workLocation: p.workLocation ?? '', dateOfLeaving: p.dateOfLeaving ? p.dateOfLeaving.slice(0, 10) : '',
        casual: String(p.leaves.casual), privilege: String(p.leaves.privilege), sick: String(p.leaves.sick), maternity: String(p.leaves.maternity), paternity: String(p.leaves.paternity), fever: String(p.leaves.fever),
        accountTitle: p.bank.accountTitle, accountNumber: p.bank.accountNumber, bankName: p.bank.bankName, ifsc: p.bank.ifsc, branchName: p.bank.branchName,
        facebook: p.social.facebook, twitter: p.social.twitter, linkedin: p.social.linkedin, instagram: p.social.instagram,
        resume: p.documents.resume, joiningLetter: p.documents.joiningLetter, resignationLetter: p.documents.resignationLetter, other: p.documents.other,
      });
    }
  }, [isEdit, profile.data]);

  function readPhoto(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => set('photoUrl', String(reader.result));
    reader.readAsDataURL(file);
  }
  function readDoc(key: string, file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set(key, String(reader.result));
    reader.readAsDataURL(file);
  }

  function buildPayload() {
    const clean = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
    return {
      ...clean,
      basicSalary: Number(f.basicSalary) || 0,
      departmentId: f.departmentId || null,
      designationId: f.designationId || null,
      specialistId: f.specialistId || null,
      leaves: { casual: Number(f.casual) || 0, privilege: Number(f.privilege) || 0, sick: Number(f.sick) || 0, maternity: Number(f.maternity) || 0, paternity: Number(f.paternity) || 0, fever: Number(f.fever) || 0 },
      bank: { accountTitle: f.accountTitle || '', accountNumber: f.accountNumber || '', bankName: f.bankName || '', ifsc: f.ifsc || '', branchName: f.branchName || '' },
      social: { facebook: f.facebook || '', twitter: f.twitter || '', linkedin: f.linkedin || '', instagram: f.instagram || '' },
      documents: { resume: f.resume || '', joiningLetter: f.joiningLetter || '', resignationLetter: f.resignationLetter || '', other: f.other || '' },
    };
  }

  async function save() {
    setError(null);
    const payload = buildPayload();
    const parsed = (isEdit ? staffUpdateSchema : staffSchema).safeParse(payload);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check the highlighted fields'); return; }
    try {
      if (isEdit && userId) await update.mutateAsync({ userId, input: parsed.data });
      else await create.mutateAsync(parsed.data as never);
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  const saving = create.isPending || update.isPending;

  return (
    <div className="space-y-4">
      <button onClick={onClose} className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /> Staff Directory</button>

      {!isEdit && (
        <p className="rounded-md bg-primary/10 px-4 py-3 text-sm text-primary">
          Staff email is their login username; the password is generated automatically and (in production) emailed to them. A Super Admin can reset it on the staff profile page.
        </p>
      )}
      {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="rounded-md border border-border bg-surface p-5">
        <h3 className="mb-4 font-semibold">Basic Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="Staff ID"><TextInput value={f.staffNo ?? ''} onChange={(e) => set('staffNo', e.target.value)} placeholder="Auto if blank" /></Field>
          <Field label="Role" required><Select value={f.roleSlug ?? ''} onChange={(e) => set('roleSlug', e.target.value)} placeholder="Select" options={(roles.data ?? []).map((r) => ({ value: r.slug, label: r.label }))} /></Field>
          <Field label="Designation"><Select value={f.designationId ?? ''} onChange={(e) => set('designationId', e.target.value)} placeholder="Select" options={(designations.data?.data ?? []).map((d) => ({ value: d.id, label: d.name }))} /></Field>
          <Field label="Department"><Select value={f.departmentId ?? ''} onChange={(e) => set('departmentId', e.target.value)} placeholder="Select" options={(depts.data?.data ?? []).map((d) => ({ value: d.id, label: d.name }))} /></Field>
          <Field label="Specialist"><Select value={f.specialistId ?? ''} onChange={(e) => set('specialistId', e.target.value)} placeholder="Select Specialist" options={(specializations.data?.data ?? []).map((s) => ({ value: s.id, label: s.name }))} /></Field>

          <Field label="First Name" required><TextInput value={f.firstName ?? ''} onChange={(e) => set('firstName', e.target.value)} /></Field>
          <Field label="Last Name"><TextInput value={f.lastName ?? ''} onChange={(e) => set('lastName', e.target.value)} /></Field>
          <Field label="Father Name"><TextInput value={f.fatherName ?? ''} onChange={(e) => set('fatherName', e.target.value)} /></Field>
          <Field label="Mother Name"><TextInput value={f.motherName ?? ''} onChange={(e) => set('motherName', e.target.value)} /></Field>

          <Field label="Gender" required><Select value={f.gender ?? ''} onChange={(e) => set('gender', e.target.value)} placeholder="Select" options={opt(GENDERS)} /></Field>
          <Field label="Marital Status"><Select value={f.maritalStatus ?? ''} onChange={(e) => set('maritalStatus', e.target.value)} placeholder="Select" options={opt(MARITAL_STATUS)} /></Field>
          <Field label="Blood Group"><Select value={f.bloodGroup ?? ''} onChange={(e) => set('bloodGroup', e.target.value)} placeholder="Select" options={BLOOD_GROUPS.map((b) => ({ value: b, label: b }))} /></Field>
          <Field label="Date of Birth" required><TextInput type="date" value={f.dob ?? ''} onChange={(e) => set('dob', e.target.value)} /></Field>

          <Field label="Date of Joining"><TextInput type="date" value={f.dateOfJoining ?? ''} onChange={(e) => set('dateOfJoining', e.target.value)} /></Field>
          <Field label="Phone"><TextInput value={f.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Emergency Contact"><TextInput value={f.emergencyContact ?? ''} onChange={(e) => set('emergencyContact', e.target.value)} /></Field>
          <Field label="Email" required><TextInput type="email" value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} disabled={isEdit} /></Field>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Photo</label>
            {f.photoUrl ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.photoUrl} alt="Staff" className="h-20 w-20 rounded-md object-cover" />
                <button type="button" onClick={() => set('photoUrl', '')} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white"><X className="h-3 w-3" /></button>
              </div>
            ) : (
              <label className="flex h-20 max-w-xs cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-fg-muted hover:border-primary">
                <Upload className="h-4 w-4" /><span>Drop a file here or click</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => readPhoto(e.target.files?.[0])} />
              </label>
            )}
          </div>
          <Field label="Current Address" className="sm:col-span-2"><TextArea value={f.currentAddress ?? ''} onChange={(e) => set('currentAddress', e.target.value)} /></Field>
          <Field label="Permanent Address" className="sm:col-span-2"><TextArea value={f.permanentAddress ?? ''} onChange={(e) => set('permanentAddress', e.target.value)} /></Field>

          <Field label="Qualification"><TextArea value={f.qualification ?? ''} onChange={(e) => set('qualification', e.target.value)} /></Field>
          <Field label="Work Experience"><TextArea value={f.workExperience ?? ''} onChange={(e) => set('workExperience', e.target.value)} /></Field>
          <Field label="Specialization"><TextArea value={f.specialization ?? ''} onChange={(e) => set('specialization', e.target.value)} /></Field>
          <Field label="Note"><TextArea value={f.note ?? ''} onChange={(e) => set('note', e.target.value)} /></Field>

          <Field label="PAN Number"><TextInput value={f.panNumber ?? ''} onChange={(e) => set('panNumber', e.target.value)} /></Field>
          <Field label="National Identification Number"><TextInput value={f.nationalId ?? ''} onChange={(e) => set('nationalId', e.target.value)} /></Field>
          <Field label="Local Identification Number"><TextInput value={f.localId ?? ''} onChange={(e) => set('localId', e.target.value)} /></Field>
          <Field label="Reference Contact"><TextInput value={f.referenceContact ?? ''} onChange={(e) => set('referenceContact', e.target.value)} /></Field>
        </div>

        <button onClick={() => setMore((m) => !m)} className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-fg">{more ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</span>
          Add More Details <span className="text-fg-muted">— Payroll · Leaves · Bank Account Details · Social Media Link · Upload Documents</span>
        </button>

        {more && (
          <div className="mt-5 space-y-6">
            <Section title="Payroll">
              <Field label="EPF No"><TextInput value={f.epfNo ?? ''} onChange={(e) => set('epfNo', e.target.value)} /></Field>
              <Field label="Basic Salary"><TextInput type="number" value={f.basicSalary ?? ''} onChange={(e) => set('basicSalary', e.target.value)} /></Field>
              <Field label="Contract Type"><Select value={f.contractType ?? ''} onChange={(e) => set('contractType', e.target.value)} placeholder="Select" options={CONTRACT_TYPES.map((c) => ({ value: c, label: c }))} /></Field>
              <Field label="Work Shift"><TextInput value={f.workShift ?? ''} onChange={(e) => set('workShift', e.target.value)} /></Field>
              <Field label="Work Location"><TextInput value={f.workLocation ?? ''} onChange={(e) => set('workLocation', e.target.value)} /></Field>
              <Field label="Date of Leaving"><TextInput type="date" value={f.dateOfLeaving ?? ''} onChange={(e) => set('dateOfLeaving', e.target.value)} /></Field>
            </Section>
            <Section title="Leaves">
              <Field label="Casual Leave"><TextInput type="number" value={f.casual ?? ''} onChange={(e) => set('casual', e.target.value)} /></Field>
              <Field label="Privilege Leave"><TextInput type="number" value={f.privilege ?? ''} onChange={(e) => set('privilege', e.target.value)} /></Field>
              <Field label="Sick Leave"><TextInput type="number" value={f.sick ?? ''} onChange={(e) => set('sick', e.target.value)} /></Field>
              <Field label="Maternity Leave"><TextInput type="number" value={f.maternity ?? ''} onChange={(e) => set('maternity', e.target.value)} /></Field>
              <Field label="Paternity Leave"><TextInput type="number" value={f.paternity ?? ''} onChange={(e) => set('paternity', e.target.value)} /></Field>
              <Field label="Fever Leave"><TextInput type="number" value={f.fever ?? ''} onChange={(e) => set('fever', e.target.value)} /></Field>
            </Section>
            <Section title="Bank Account Details">
              <Field label="Account Title"><TextInput value={f.accountTitle ?? ''} onChange={(e) => set('accountTitle', e.target.value)} /></Field>
              <Field label="Bank Account Number"><TextInput value={f.accountNumber ?? ''} onChange={(e) => set('accountNumber', e.target.value)} /></Field>
              <Field label="Bank Name"><TextInput value={f.bankName ?? ''} onChange={(e) => set('bankName', e.target.value)} /></Field>
              <Field label="IFSC Code"><TextInput value={f.ifsc ?? ''} onChange={(e) => set('ifsc', e.target.value)} /></Field>
              <Field label="Bank Branch Name"><TextInput value={f.branchName ?? ''} onChange={(e) => set('branchName', e.target.value)} /></Field>
            </Section>
            <Section title="Social Media Link">
              <Field label="Facebook URL"><TextInput value={f.facebook ?? ''} onChange={(e) => set('facebook', e.target.value)} /></Field>
              <Field label="Twitter URL"><TextInput value={f.twitter ?? ''} onChange={(e) => set('twitter', e.target.value)} /></Field>
              <Field label="LinkedIn URL"><TextInput value={f.linkedin ?? ''} onChange={(e) => set('linkedin', e.target.value)} /></Field>
              <Field label="Instagram URL"><TextInput value={f.instagram ?? ''} onChange={(e) => set('instagram', e.target.value)} /></Field>
            </Section>
            <div>
              <h4 className="mb-3 border-l-2 border-primary pl-2 text-sm font-semibold">Upload Documents</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {([['resume', 'Resume'], ['joiningLetter', 'Joining Letter'], ['resignationLetter', 'Resignation Letter'], ['other', 'Other Documents']] as const).map(([key, label]) => (
                  <div key={key}>
                    <label className="mb-1 block text-sm font-medium">{label}</label>
                    {f[key] ? (
                      <div className="flex items-center justify-between rounded-sm border border-border bg-surface px-3 py-2 text-sm">
                        <span>File attached</span>
                        <button type="button" className="text-xs text-danger" onClick={() => set(key, '')}>Remove</button>
                      </div>
                    ) : (
                      <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-border text-xs text-fg-muted hover:border-primary">
                        <Upload className="h-4 w-4" /><span>Drop a file here or click</span>
                        <input type="file" className="hidden" onChange={(e) => readDoc(key, e.target.files?.[0])} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save</Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 border-l-2 border-primary pl-2 text-sm font-semibold">{title}</h4>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{children}</div>
    </div>
  );
}
