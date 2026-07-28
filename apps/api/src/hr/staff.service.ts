import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import type { ListQuery, Paginated, StaffDetailDto, StaffDto, StaffInput, StaffUpdateInput } from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { SequenceService } from '../common/sequence/sequence.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

type StaffPayload = Prisma.StaffGetPayload<{ include: { department: true; designation: true; specialization: true } }>;
type UserPayload = Prisma.UserGetPayload<{
  include: { role: true; staffProfile: { include: { department: true; designation: true; specialization: true } } };
}>;

const userInclude = {
  role: true,
  staffProfile: { include: { department: true, designation: true, specialization: true } },
} satisfies Prisma.UserInclude;

/** Extra staff fields stored in Staff.customFields JSON (no dedicated columns). */
interface StaffExtras {
  firstName?: string;
  lastName?: string;
  localId?: string;
  referenceContact?: string;
  workExperience?: string;
  specialization?: string;
  note?: string;
  dateOfLeaving?: string;
  workLocation?: string;
  leaves?: { casual: number; privilege: number; sick: number; maternity: number; paternity: number; fever: number };
  documents?: { resume: string; joiningLetter: string; resignationLetter: string; other: string };
}

const EMPTY_LEAVES = { casual: 0, privilege: 0, sick: 0, maternity: 0, paternity: 0, fever: 0 };
const EMPTY_DOCS = { resume: '', joiningLetter: '', resignationLetter: '', other: '' };
const EMPTY_BANK = { accountTitle: '', accountNumber: '', bankName: '', ifsc: '', branchName: '' };
const EMPTY_SOCIAL = { facebook: '', twitter: '', linkedin: '', instagram: '' };

function fullName(first: string | undefined, last: string | undefined, fallback = 'Staff'): string {
  return [first, last].filter(Boolean).join(' ').trim() || fallback;
}

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
  ) {}

  async list(branchId: string, roleSlug: string | undefined, query: ListQuery): Promise<Paginated<StaffDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      branchId,
      type: 'staff',
      deletedAt: null,
      ...(roleSlug ? { role: { slug: roleSlug } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { role: { label: { contains: search, mode: 'insensitive' } } },
              { staffProfile: { staffNo: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, skip, take, orderBy, include: userInclude }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(rows.map(toListDto), total, query);
  }

  async getProfile(branchId: string, userId: string): Promise<StaffDetailDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, branchId, type: 'staff', deletedAt: null },
      include: userInclude,
    });
    if (!user) throw new NotFoundException('Staff not found');
    return toDetailDto(user);
  }

  async create(actor: RequestUser, branchId: string, input: StaffInput): Promise<StaffDetailDto> {
    const role = await this.prisma.role.findUnique({ where: { slug: input.roleSlug } });
    if (!role) throw new BadRequestException('Invalid role');
    if (role.slug === 'patient') throw new BadRequestException('Cannot assign the patient role to staff');

    const username = input.email; // staff email is their login username (per demo)
    const existing = await this.prisma.user.findFirst({ where: { OR: [{ username }, { email: input.email }] } });
    if (existing) throw new BadRequestException('A user with this email already exists');

    // Password is auto-generated and (in production) emailed to the staff member.
    const generatedPassword = Math.random().toString(36).slice(2, 10) + 'A1!';
    const passwordHash = await argon2.hash(generatedPassword);
    const name = fullName(input.firstName, input.lastName);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { branchId, roleId: role.id, username, name, email: input.email, phone: input.phone || null, passwordHash, type: 'staff' },
      });
      const staffNo = input.staffNo?.trim() || (await this.sequence.next(branchId, 'staff', tx));
      await tx.staff.create({ data: this.buildStaffData(branchId, user.id, staffNo, input) });
      return tx.user.findUniqueOrThrow({ where: { id: user.id }, include: userInclude });
    });
    await this.audit.record({ branchId, userId: actor.id, action: 'create', entity: 'staff', entityId: created.id });
    return toDetailDto(created);
  }

  async update(actor: RequestUser, branchId: string, userId: string, input: StaffUpdateInput): Promise<StaffDetailDto> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, branchId, type: 'staff', deletedAt: null }, include: { staffProfile: true } });
    if (!user) throw new NotFoundException('Staff not found');

    const name = input.firstName !== undefined || input.lastName !== undefined
      ? fullName(input.firstName, input.lastName, user.name)
      : undefined;
    if (name || input.email !== undefined || input.phone !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(name ? { name } : {}),
          ...(input.email ? { email: input.email, username: input.email } : {}),
          ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        },
      });
    }

    const existingProfile = user.staffProfile;
    const existingExtras = (existingProfile?.customFields as StaffExtras) ?? {};
    const staffNo = input.staffNo?.trim() || existingProfile?.staffNo || (await this.sequence.next(branchId, 'staff'));
    const data = this.buildStaffData(branchId, userId, staffNo, input, existingExtras);
    await this.prisma.staff.upsert({ where: { userId }, create: data, update: data });

    await this.audit.record({ branchId, userId: actor.id, action: 'update', entity: 'staff', entityId: userId });
    return this.getProfile(branchId, userId);
  }

  async remove(actor: RequestUser, branchId: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, branchId, type: 'staff', deletedAt: null } });
    if (!user) throw new NotFoundException('Staff not found');
    await this.prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date(), isActive: false } });
    await this.prisma.staff.updateMany({ where: { userId }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: actor.id, action: 'delete', entity: 'staff', entityId: userId });
  }

  async changePassword(actor: RequestUser, branchId: string, userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, branchId, type: 'staff', deletedAt: null } });
    if (!user) throw new NotFoundException('Staff not found');
    const passwordHash = await argon2.hash(password);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.audit.record({ branchId, userId: actor.id, action: 'change_password', entity: 'staff', entityId: userId });
  }

  /** Assembles the Staff row data (columns + customFields/bankDetails/socialLinks JSON). */
  private buildStaffData(branchId: string, userId: string, staffNo: string, input: StaffUpdateInput, existingExtras: StaffExtras = {}): Prisma.StaffUncheckedCreateInput {
    const extras: StaffExtras = { ...existingExtras };
    if (input.firstName !== undefined) extras.firstName = input.firstName;
    if (input.lastName !== undefined) extras.lastName = input.lastName || '';
    if (input.localId !== undefined) extras.localId = input.localId || '';
    if (input.referenceContact !== undefined) extras.referenceContact = input.referenceContact || '';
    if (input.workExperience !== undefined) extras.workExperience = input.workExperience || '';
    if (input.specialization !== undefined) extras.specialization = input.specialization || '';
    if (input.note !== undefined) extras.note = input.note || '';
    if (input.workLocation !== undefined) extras.workLocation = input.workLocation || '';
    if (input.dateOfLeaving !== undefined) extras.dateOfLeaving = input.dateOfLeaving ? new Date(input.dateOfLeaving).toISOString() : '';
    if (input.leaves) extras.leaves = { ...EMPTY_LEAVES, ...input.leaves };
    if (input.documents) extras.documents = { ...EMPTY_DOCS, ...input.documents };

    return {
      branchId,
      userId,
      staffNo,
      customFields: extras as Prisma.InputJsonValue,
      ...(input.departmentId !== undefined ? { departmentId: input.departmentId ?? null } : {}),
      ...(input.designationId !== undefined ? { designationId: input.designationId ?? null } : {}),
      ...(input.specialistId !== undefined ? { specialistId: input.specialistId ?? null } : {}),
      ...(input.epfNo !== undefined ? { epfNo: input.epfNo || null } : {}),
      ...(input.basicSalary !== undefined ? { basicSalary: input.basicSalary } : {}),
      ...(input.contractType !== undefined ? { contractType: input.contractType || null } : {}),
      ...(input.workShift !== undefined ? { workShift: input.workShift || null } : {}),
      ...(input.workLocation !== undefined ? { workLocation: input.workLocation || null } : {}),
      ...(input.dateOfJoining !== undefined ? { dateOfJoining: input.dateOfJoining ?? null } : {}),
      ...(input.fatherName !== undefined ? { fatherName: input.fatherName || null } : {}),
      ...(input.motherName !== undefined ? { motherName: input.motherName || null } : {}),
      ...(input.dob !== undefined ? { dob: input.dob ?? null } : {}),
      ...(input.gender !== undefined ? { gender: input.gender ?? null } : {}),
      ...(input.bloodGroup !== undefined ? { bloodGroup: input.bloodGroup || null } : {}),
      ...(input.maritalStatus !== undefined ? { maritalStatus: input.maritalStatus || null } : {}),
      ...(input.qualification !== undefined ? { qualification: input.qualification || null } : {}),
      ...(input.panNumber !== undefined ? { panNumber: input.panNumber || null } : {}),
      ...(input.nationalId !== undefined ? { nationalId: input.nationalId || null } : {}),
      ...(input.emergencyContact !== undefined ? { emergencyContact: input.emergencyContact || null } : {}),
      ...(input.currentAddress !== undefined ? { currentAddress: input.currentAddress || null } : {}),
      ...(input.permanentAddress !== undefined ? { permanentAddress: input.permanentAddress || null } : {}),
      ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl || null } : {}),
      ...(input.bank ? { bankDetails: { ...EMPTY_BANK, ...input.bank } as Prisma.InputJsonValue } : {}),
      ...(input.social ? { socialLinks: { ...EMPTY_SOCIAL, ...input.social } as Prisma.InputJsonValue } : {}),
    };
  }
}

function toListDto(u: UserPayload): StaffDto {
  const p = u.staffProfile;
  return {
    userId: u.id,
    staffId: p?.id ?? null,
    staffNo: p?.staffNo ?? null,
    name: u.name,
    username: u.username,
    email: u.email,
    phone: u.phone,
    roleSlug: u.role.slug,
    roleLabel: u.role.label,
    departmentName: p?.department?.name ?? null,
    designationName: p?.designation?.name ?? null,
    specialistName: p?.specialization?.name ?? null,
    basicSalary: p ? Number(p.basicSalary) : 0,
    dateOfJoining: p?.dateOfJoining ? p.dateOfJoining.toISOString() : null,
    photoUrl: p?.photoUrl ?? null,
    isActive: u.isActive,
  };
}

function toDetailDto(u: UserPayload): StaffDetailDto {
  const p = u.staffProfile as StaffPayload | null;
  const extras = (p?.customFields as StaffExtras) ?? {};
  const bank = { ...EMPTY_BANK, ...((p?.bankDetails as object) ?? {}) };
  const social = { ...EMPTY_SOCIAL, ...((p?.socialLinks as object) ?? {}) };
  return {
    ...toListDto(u),
    departmentId: p?.departmentId ?? null,
    designationId: p?.designationId ?? null,
    specialistId: p?.specialistId ?? null,
    firstName: extras.firstName ?? u.name.split(' ')[0] ?? null,
    lastName: extras.lastName ?? u.name.split(' ').slice(1).join(' ') ?? null,
    fatherName: p?.fatherName ?? null,
    motherName: p?.motherName ?? null,
    gender: p?.gender ?? null,
    maritalStatus: p?.maritalStatus ?? null,
    bloodGroup: p?.bloodGroup ?? null,
    dob: p?.dob ? p.dob.toISOString() : null,
    emergencyContact: p?.emergencyContact ?? null,
    currentAddress: p?.currentAddress ?? null,
    permanentAddress: p?.permanentAddress ?? null,
    qualification: p?.qualification ?? null,
    workExperience: extras.workExperience ?? null,
    specialization: extras.specialization ?? null,
    note: extras.note ?? null,
    panNumber: p?.panNumber ?? null,
    nationalId: p?.nationalId ?? null,
    localId: extras.localId ?? null,
    referenceContact: extras.referenceContact ?? null,
    epfNo: p?.epfNo ?? null,
    contractType: p?.contractType ?? null,
    workShift: p?.workShift ?? null,
    workLocation: p?.workLocation ?? extras.workLocation ?? null,
    dateOfLeaving: extras.dateOfLeaving || null,
    leaves: { ...EMPTY_LEAVES, ...(extras.leaves ?? {}) },
    bank: bank as StaffDetailDto['bank'],
    social: social as StaffDetailDto['social'],
    documents: { ...EMPTY_DOCS, ...(extras.documents ?? {}) },
  };
}
