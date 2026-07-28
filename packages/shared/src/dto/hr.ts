import { z } from 'zod';
import { GENDERS, BLOOD_GROUPS, MARITAL_STATUS } from './patient';

export const CONTRACT_TYPES = ['Permanent', 'Probation', 'Contract Basis', 'Temporary'] as const;

/** Per-staff annual leave-day allotments (stored in Staff.customFields.leaves). */
export const staffLeavesSchema = z.object({
  casual: z.coerce.number().min(0).default(0),
  privilege: z.coerce.number().min(0).default(0),
  sick: z.coerce.number().min(0).default(0),
  maternity: z.coerce.number().min(0).default(0),
  paternity: z.coerce.number().min(0).default(0),
  fever: z.coerce.number().min(0).default(0),
});

export const staffBankSchema = z.object({
  accountTitle: z.string().trim().optional().or(z.literal('')),
  accountNumber: z.string().trim().optional().or(z.literal('')),
  bankName: z.string().trim().optional().or(z.literal('')),
  ifsc: z.string().trim().optional().or(z.literal('')),
  branchName: z.string().trim().optional().or(z.literal('')),
});

export const staffSocialSchema = z.object({
  facebook: z.string().trim().optional().or(z.literal('')),
  twitter: z.string().trim().optional().or(z.literal('')),
  linkedin: z.string().trim().optional().or(z.literal('')),
  instagram: z.string().trim().optional().or(z.literal('')),
});

export const staffDocumentsSchema = z.object({
  resume: z.string().optional().or(z.literal('')),
  joiningLetter: z.string().optional().or(z.literal('')),
  resignationLetter: z.string().optional().or(z.literal('')),
  other: z.string().optional().or(z.literal('')),
});

/** Add Staff — creates a login (User; email is the username) + extended HR profile (Staff). */
export const staffSchema = z.object({
  staffNo: z.string().trim().optional().or(z.literal('')),
  roleSlug: z.string().min(1, 'Role is required'),
  designationId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  specialistId: z.string().uuid().optional().nullable(),
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().optional().or(z.literal('')),
  fatherName: z.string().trim().optional().or(z.literal('')),
  motherName: z.string().trim().optional().or(z.literal('')),
  gender: z.enum(GENDERS, { message: 'Gender is required' }),
  maritalStatus: z.enum(MARITAL_STATUS).optional().or(z.literal('')),
  bloodGroup: z.enum(BLOOD_GROUPS).optional().or(z.literal('')),
  dob: z.coerce.date(),
  dateOfJoining: z.coerce.date().optional(),
  phone: z.string().trim().optional().or(z.literal('')),
  emergencyContact: z.string().trim().optional().or(z.literal('')),
  email: z.string().email('A valid email is required'),
  photoUrl: z.string().optional().or(z.literal('')),
  currentAddress: z.string().trim().optional().or(z.literal('')),
  permanentAddress: z.string().trim().optional().or(z.literal('')),
  qualification: z.string().trim().optional().or(z.literal('')),
  workExperience: z.string().trim().optional().or(z.literal('')),
  specialization: z.string().trim().optional().or(z.literal('')),
  note: z.string().trim().optional().or(z.literal('')),
  panNumber: z.string().trim().optional().or(z.literal('')),
  nationalId: z.string().trim().optional().or(z.literal('')),
  localId: z.string().trim().optional().or(z.literal('')),
  referenceContact: z.string().trim().optional().or(z.literal('')),
  // Payroll
  epfNo: z.string().trim().optional().or(z.literal('')),
  basicSalary: z.coerce.number().min(0).default(0),
  contractType: z.string().trim().optional().or(z.literal('')),
  workShift: z.string().trim().optional().or(z.literal('')),
  workLocation: z.string().trim().optional().or(z.literal('')),
  dateOfLeaving: z.coerce.date().optional(),
  // Nested
  leaves: staffLeavesSchema.optional(),
  bank: staffBankSchema.optional(),
  social: staffSocialSchema.optional(),
  documents: staffDocumentsSchema.optional(),
});
export type StaffInput = z.infer<typeof staffSchema>;

/** Edit Staff — same shape, all fields optional. */
export const staffUpdateSchema = staffSchema.partial();
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;

export const staffPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type StaffPasswordInput = z.infer<typeof staffPasswordSchema>;

/** Row in the staff directory list/card view. */
export interface StaffDto {
  userId: string;
  staffId: string | null;
  staffNo: string | null;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  roleSlug: string;
  roleLabel: string;
  departmentName: string | null;
  designationName: string | null;
  specialistName: string | null;
  basicSalary: number;
  dateOfJoining: string | null;
  photoUrl: string | null;
  isActive: boolean;
}

/** Full staff profile for the details page + edit form. */
export interface StaffDetailDto extends StaffDto {
  departmentId: string | null;
  designationId: string | null;
  specialistId: string | null;
  firstName: string | null;
  lastName: string | null;
  fatherName: string | null;
  motherName: string | null;
  gender: string | null;
  maritalStatus: string | null;
  bloodGroup: string | null;
  dob: string | null;
  emergencyContact: string | null;
  currentAddress: string | null;
  permanentAddress: string | null;
  qualification: string | null;
  workExperience: string | null;
  specialization: string | null;
  note: string | null;
  panNumber: string | null;
  nationalId: string | null;
  localId: string | null;
  referenceContact: string | null;
  epfNo: string | null;
  contractType: string | null;
  workShift: string | null;
  workLocation: string | null;
  dateOfLeaving: string | null;
  leaves: { casual: number; privilege: number; sick: number; maternity: number; paternity: number; fever: number };
  bank: { accountTitle: string; accountNumber: string; bankName: string; ifsc: string; branchName: string };
  social: { facebook: string; twitter: string; linkedin: string; instagram: string };
  documents: { resume: string; joiningLetter: string; resignationLetter: string; other: string };
}

// ── Attendance ───────────────────────────────────────────────
export const ATTENDANCE_STATUSES = ['present', 'late', 'absent', 'half_day', 'holiday', 'half_day_second_shift'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** Single-staff QR/manual check-in/out (kept for the QR Attendance module). */
export const markAttendanceSchema = z.object({
  staffUserId: z.string().uuid(),
  date: z.coerce.date().optional(),
  action: z.enum(['in', 'out']).default('in'),
  method: z.enum(['manual', 'qr', 'barcode']).default('manual'),
});
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

/** Bulk "Save Attendance" for a whole roster on a given date. */
export const saveAttendanceSchema = z.object({
  date: z.coerce.date(),
  rows: z
    .array(
      z.object({
        staffUserId: z.string().uuid(),
        status: z.enum(ATTENDANCE_STATUSES),
        inTime: z.string().trim().optional().or(z.literal('')),
        outTime: z.string().trim().optional().or(z.literal('')),
        note: z.string().trim().optional().or(z.literal('')),
      }),
    )
    .min(1),
});
export type SaveAttendanceInput = z.infer<typeof saveAttendanceSchema>;

export interface AttendanceDto {
  id: string | null;
  staffUserId: string;
  staffNo: string | null;
  staffName: string;
  roleLabel: string;
  date: string;
  inTime: string | null;
  outTime: string | null;
  method: string;
  status: string;
  note: string | null;
}

// ── Shifts & Duty Roster ─────────────────────────────────────
export const shiftSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  startTime: z.string().trim().optional().or(z.literal('')),
  endTime: z.string().trim().optional().or(z.literal('')),
});
export type ShiftInput = z.infer<typeof shiftSchema>;

export const rosterSchema = z.object({
  staffUserId: z.string().uuid(),
  shiftId: z.string().uuid().optional().nullable(),
  date: z.coerce.date(),
  hours: z.coerce.number().min(0).default(0),
});
export type RosterInput = z.infer<typeof rosterSchema>;

export interface RosterDto {
  id: string;
  staffUserId: string;
  staffName: string;
  shiftName: string | null;
  date: string;
  hours: number;
}

// ── Duty Roster (Shift / Roster period / Assignment) ─────────
/** A shift with computed display labels + duration ("Shift Hour"). */
export interface DutyShiftDto {
  id: string;
  name: string;
  startTime: string | null; // raw "HH:mm" (24h)
  endTime: string | null;
  startLabel: string; // "08:00 AM"
  endLabel: string; // "04:00 PM"
  shiftHour: string; // "08:00:00"
}

export const shiftUpdateSchema = shiftSchema.partial();
export type ShiftUpdateInput = z.infer<typeof shiftUpdateSchema>;

/** Add Roster — schedules a shift over a date range. */
export const rosterPeriodSchema = z.object({
  shiftId: z.string().uuid('Shift is required'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});
export type RosterPeriodInput = z.infer<typeof rosterPeriodSchema>;

/** Row in the "Roster List". */
export interface RosterPeriodDto {
  id: string;
  shiftId: string;
  shiftName: string;
  startDate: string;
  endDate: string;
  startLabel: string; // shift start "08:00 AM"
  endLabel: string; // shift end
  shiftHour: string;
  rosterDays: number;
}

/** Assign Roster — a staff member on a roster period. */
export const rosterAssignmentSchema = z.object({
  rosterId: z.string().uuid('Roster is required'),
  staffUserId: z.string().uuid('Staff is required'),
  floorId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
});
export type RosterAssignmentInput = z.infer<typeof rosterAssignmentSchema>;

/** Row in the "Assign Roster" list. */
export interface RosterAssignmentDto {
  id: string;
  rosterId: string;
  staffUserId: string;
  staffName: string;
  staffNo: string | null;
  floorId: string | null;
  floorName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  shiftName: string; // "Roster" column
  startDate: string;
  endDate: string;
  shiftStartLabel: string;
  shiftEndLabel: string;
  generatedByName: string | null;
  generatedByNo: string | null;
}

/** Row in the main Duty Roster daily-expansion list. */
export interface DutyRosterRowDto {
  staffUserId: string;
  staffName: string;
  staffNo: string | null;
  date: string;
  shiftStartLabel: string;
  shiftEndLabel: string;
  shiftHour: string;
  shiftName: string;
  departmentName: string | null;
  floorName: string | null;
}

// ── Payroll ──────────────────────────────────────────────────
export interface PayrollLineItem {
  label: string;
  amount: number;
}

export const payrollSchema = z.object({
  staffUserId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM'),
  paymentMode: z.string().trim().optional().or(z.literal('')),
  earnings: z.array(z.object({ label: z.string(), amount: z.coerce.number() })).optional(),
  deductionItems: z.array(z.object({ label: z.string(), amount: z.coerce.number() })).optional(),
});
export type PayrollInput = z.infer<typeof payrollSchema>;

export interface PayrollDto {
  id: string | null;
  staffUserId: string;
  staffNo: string | null;
  staffName: string;
  roleLabel: string;
  departmentName: string | null;
  designationName: string | null;
  phone: string | null;
  month: string;
  basicSalary: number;
  earnings: PayrollLineItem[];
  deductionItems: PayrollLineItem[];
  gross: number;
  deductions: number;
  net: number;
  paymentMode: string;
  status: string; // generated | paid | not_generated
  paidAt: string | null;
}

// ── Leaves ───────────────────────────────────────────────────
export const leaveTypeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  quota: z.coerce.number().int().min(0).default(0),
});
export type LeaveTypeInput = z.infer<typeof leaveTypeSchema>;

export const LEAVE_STATUSES = ['pending', 'approved', 'disapprove'] as const;

export const leaveRequestSchema = z.object({
  staffUserId: z.string().uuid(),
  leaveTypeId: z.string().uuid().optional().nullable(),
  applyDate: z.coerce.date().optional(),
  fromDate: z.coerce.date(),
  toDate: z.coerce.date(),
  reason: z.string().trim().optional().or(z.literal('')),
  note: z.string().trim().optional().or(z.literal('')),
  attachmentUrl: z.string().optional().or(z.literal('')),
  status: z.enum(LEAVE_STATUSES).optional(),
});
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;

export const leaveStatusSchema = z.object({
  status: z.enum(LEAVE_STATUSES),
  note: z.string().trim().optional().or(z.literal('')),
});
export type LeaveStatusInput = z.infer<typeof leaveStatusSchema>;

export interface LeaveTypeDto {
  id: string;
  name: string;
  quota: number;
}
export interface LeaveRequestDto {
  id: string;
  staffUserId: string;
  staffNo: string | null;
  staffName: string;
  roleLabel: string;
  leaveTypeName: string | null;
  applyDate: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string | null;
  note: string | null;
  attachmentUrl: string | null;
  status: string;
  statusByName: string | null;
  statusByNo: string | null;
  statusAt: string | null;
}

// ── Annual Calendar ──────────────────────────────────────────
export const HOLIDAY_TYPES = ['holiday', 'activity', 'vacation'] as const;
export const holidaySchema = z.object({
  type: z.enum(HOLIDAY_TYPES).default('holiday'),
  title: z.string().trim().min(1, 'Title is required'),
  fromDate: z.coerce.date(),
  toDate: z.coerce.date().optional(),
  description: z.string().trim().optional().or(z.literal('')),
  frontSite: z.boolean().default(false),
});
export type HolidayInput = z.infer<typeof holidaySchema>;

export interface HolidayDto {
  id: string;
  type: string;
  title: string;
  fromDate: string;
  toDate: string | null;
  description: string | null;
  frontSite: boolean;
}
