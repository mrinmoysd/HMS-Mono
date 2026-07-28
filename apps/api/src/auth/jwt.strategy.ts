import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../rbac/permissions.service';
import type { RequestUser } from '../common/types/request-user';

export interface JwtPayload {
  sub: string; // user id
  username: string;
  roleId: string;
  branchId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /** Loads fresh user + permissions on every request so role changes take effect immediately. */
  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, isActive: true, deletedAt: null },
      include: { role: true },
    });
    if (!user) throw new UnauthorizedException('User not found or inactive');

    const permissions = await this.permissions.permissionKeysForRole(user.roleId);
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      roleSlug: user.role.slug,
      branchId: user.branchId,
      permissions,
    };
  }
}
