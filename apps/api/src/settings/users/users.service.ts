import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import {
  lastAdminProblem,
  manageBlockedReason,
  type Paginated,
  type UserAccountDto,
  type UserListQuery,
  type UserPasswordResetInput,
  type UserStatusInput,
} from '@smart-hospital/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import type { RequestUser } from '../../common/types/request-user';

const ADMIN_ROLES = ['super_admin', 'admin'];

/**
 * The accounts that can sign in, and the ability to suspend one.
 *
 * Suspension sets `User.isActive = false`. That flag is already checked by
 * login, by refresh, and by `JwtStrategy` on every single request, so a
 * suspended user is locked out on their next call rather than at token expiry.
 * This service adds no new enforcement — it exposes a switch the auth layer
 * has always honoured but nothing could flip.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: RequestUser, branchId: string, query: UserListQuery): Promise<Paginated<UserAccountDto>> {
    const where: Prisma.UserWhereInput = {
      branchId,
      deletedAt: null,
      type: query.type,
      ...(query.status === 'active' ? { isActive: true } : {}),
      ...(query.status === 'suspended' ? { isActive: false } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { username: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.size;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: query.size,
        // Suspended accounts first: if somebody is looking at this screen,
        // the exceptions are what they came for.
        orderBy: [{ isActive: 'asc' }, { name: 'asc' }],
        include: {
          role: { select: { slug: true, label: true } },
          staffProfile: { select: { staffNo: true } },
          patientProfile: { select: { patientNo: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: rows.map((u) => this.toDto(actor, u)),
      meta: { page: query.page, size: query.size, total, totalPages: Math.ceil(total / query.size) || 1 },
    };
  }

  /**
   * Load the target and apply the rules that do not depend on what is being
   * done to it. Both endpoints go through here, so neither can forget one.
   */
  private async requireManageable(actor: RequestUser, branchId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, branchId, deletedAt: null },
      include: { role: { select: { slug: true } } },
    });
    // Scoped to the branch, so a user in another branch is Not Found rather
    // than Forbidden — the caller learns nothing about who exists elsewhere.
    if (!user) throw new NotFoundException('User not found');

    const blocked = manageBlockedReason(
      { id: actor.id, roleSlug: actor.roleSlug },
      { id: user.id, roleSlug: user.role.slug, isActive: user.isActive },
    );
    if (blocked) throw new ForbiddenException(blocked);
    return user;
  }

  async setStatus(actor: RequestUser, branchId: string, userId: string, input: UserStatusInput): Promise<UserAccountDto> {
    const user = await this.requireManageable(actor, branchId, userId);

    if (!input.isActive) {
      // Counted at the moment of the change, excluding the target: two admins
      // suspended in quick succession must not both pass a stale check.
      const remaining = await this.prisma.user.count({
        where: {
          branchId,
          deletedAt: null,
          isActive: true,
          id: { not: user.id },
          role: { slug: { in: ADMIN_ROLES } },
        },
      });
      const problem = lastAdminProblem(
        { id: user.id, roleSlug: user.role.slug, isActive: user.isActive },
        remaining,
      );
      if (problem) throw new BadRequestException(problem);
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { isActive: input.isActive } });
    await this.audit.record({
      branchId,
      userId: actor.id,
      action: input.isActive ? 'user_reinstate' : 'user_suspend',
      entity: 'user',
      entityId: user.id,
      after: { username: user.username, isActive: input.isActive, reason: input.reason || null },
    });

    return this.toDto(actor, await this.loadRow(user.id));
  }

  /** Re-read with the relations the DTO needs, after a write. */
  private async loadRow(id: string) {
    return this.prisma.user.findFirstOrThrow({
      where: { id },
      include: {
        role: { select: { slug: true, label: true } },
        staffProfile: { select: { staffNo: true } },
        patientProfile: { select: { patientNo: true } },
      },
    });
  }

  private toDto(actor: RequestUser, u: Awaited<ReturnType<UsersService['loadRow']>>): UserAccountDto {
    const blocked = manageBlockedReason(
      { id: actor.id, roleSlug: actor.roleSlug },
      { id: u.id, roleSlug: u.role.slug, isActive: u.isActive },
    );
    return {
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      phone: u.phone,
      type: u.type as 'staff' | 'patient',
      roleSlug: u.role.slug,
      roleLabel: u.role.label,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      referenceNo: u.staffProfile?.staffNo ?? u.patientProfile?.patientNo ?? null,
      isSelf: u.id === actor.id,
      canManage: blocked === null,
      managedBlockedReason: blocked,
    };
  }

  async resetPassword(
    actor: RequestUser,
    branchId: string,
    userId: string,
    input: UserPasswordResetInput,
  ): Promise<{ ok: true }> {
    const user = await this.requireManageable(actor, branchId, userId);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await argon2.hash(input.password) },
    });
    // The new password is never written to the audit row — an audit log that
    // captures credentials just moves the secret somewhere with weaker access
    // control. Only that a reset happened, and to whom.
    await this.audit.record({
      branchId,
      userId: actor.id,
      action: 'user_password_reset',
      entity: 'user',
      entityId: user.id,
      after: { username: user.username },
    });
    return { ok: true };
  }
}
