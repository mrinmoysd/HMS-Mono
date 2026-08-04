import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type {
  AuthUser,
  ChangePasswordInput,
  LoginInput,
  LoginResponse,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../rbac/permissions.service';
import type { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly permissions: PermissionsService,
  ) {}

  async login(input: LoginInput): Promise<LoginResponse> {
    const user = await this.prisma.user.findFirst({
      where: { username: input.username, isActive: true, deletedAt: null },
      include: { role: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const [permissions, features] = await Promise.all([
      this.permissions.permissionKeysForRole(user.roleId),
      this.permissions.featureKeysForRole(user.roleId),
    ]);
    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      type: user.type,
      roleSlug: user.role.slug,
      roleLabel: user.role.label,
      branchId: user.branchId,
      permissions,
      features,
    };

    const tokens = await this.issueTokens({
      sub: user.id,
      username: user.username,
      roleId: user.roleId,
      branchId: user.branchId,
    });
    return { user: authUser, tokens };
  }

  async refresh(refreshToken: string): Promise<LoginResponse['tokens']> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, isActive: true, deletedAt: null },
      });
      if (!user) throw new UnauthorizedException();
      return this.issueTokens({
        sub: user.id,
        username: user.username,
        roleId: user.roleId,
        branchId: user.branchId,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await argon2.verify(user.passwordHash, input.currentPassword);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await argon2.hash(input.password);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  private async issueTokens(payload: JwtPayload): Promise<LoginResponse['tokens']> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '900s'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '7d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
