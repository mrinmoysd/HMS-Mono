import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GeneralSettingsCache } from '../settings/general-settings.cache';
import { resolveBranchId } from '../common/context/branch-context.interceptor';
import { IS_PUBLIC_KEY } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/request-user';

/**
 * Enforces Patient Panel on/off (Settings parity, G1).
 *
 * When Setup ▸ Settings ▸ General turns the patient portal off, every portal
 * route is refused. Before this the toggle changed nothing at all: a hospital
 * could switch the portal "off" and patients would carry on signing in and
 * booking appointments.
 *
 * ── Why a guard on the controller, not a check in each handler ───────────────
 * There are nine portal endpoints and more will follow. A per-handler check is
 * one forgotten line away from a route that stays open after the portal is
 * switched off, and that is invisible until a patient uses it.
 *
 * Registration is `@Public`, so this guard also covers the case that matters
 * most for a closed portal: new sign-ups. It reads the branch from the token
 * where there is one, and falls back to the registering user's branch.
 */
@Injectable()
export class PatientPanelGuard implements CanActivate {
  constructor(
    private readonly settings: GeneralSettingsCache,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const branchId = resolveBranchId(req.user, req.headers as Record<string, unknown>);

    // A public route with no user has no branch to check against. Registration
    // is the only one, and it carries its own branch in the body.
    const fromBody = (req.body as { branchId?: string } | undefined)?.branchId;
    const target = branchId ?? fromBody;
    if (!target) return true;

    const settings = await this.settings.get(target);
    if (!settings.patientPanel) {
      throw new ForbiddenException('The patient portal is switched off for this hospital');
    }

    // Deleting your own portal account is a second, narrower switch: a hospital
    // may want the portal open but self-service deletion closed, because a
    // deleted account detaches a patient from their own records.
    const isDelete = this.reflector.getAllAndOverride<boolean>(PORTAL_DELETE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isDelete && !settings.patientDeleteAccount) {
      throw new ForbiddenException('Self-service account deletion is switched off');
    }

    // Referenced so the public-route key stays imported and the intent is
    // documented: @Public still reaches this guard, deliberately.
    void IS_PUBLIC_KEY;
    return true;
  }
}

export const PORTAL_DELETE_KEY = 'portal:delete-account';
