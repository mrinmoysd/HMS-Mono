import * as fs from 'fs';
import * as path from 'path';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { Ability, defaultGrantsFor, featureGrantsFor, ROLES } from '@smart-hospital/shared';
import type { ActionKey, FeaturePermissionKey, PermissionKey, RoleKey } from '@smart-hospital/shared';
import { PERMISSION_KEY, type RequiredPermission } from './require-permission.decorator';
import { FEATURE_KEY, FEATURE_RESOLVER_KEY, type RequiredFeature } from './require-feature.decorator';
import { NO_PERMISSION_KEY } from './authenticated.decorator';
import { ROLE_KEY } from './require-role.decorator';
import { IS_PUBLIC_KEY } from '../auth/jwt-auth.guard';

/**
 * Every route the API exposes, and what guards it — read from the decorators
 * Nest actually recorded, not from the source text.
 *
 * That distinction is the point. An earlier text-scanning audit of the same
 * question reported four unguarded handlers; it was wrong, because a regex
 * looking backwards from a method let one handler's decorator vouch for its
 * neighbour. Reading the metadata asks the framework what it will really
 * enforce, so it cannot drift from the running behaviour.
 */

export type GuardKind = 'feature' | 'resolver' | 'module' | 'role' | 'authenticated' | 'public' | 'none';

export interface RouteEntry {
  method: string;
  route: string;
  controller: string;
  handler: string;
  kind: GuardKind;
  /** Static (feature, action) pairs, ANDed. Empty for every other kind. */
  features: RequiredFeature[];
  /** Legacy module gate, when kind === 'module'. */
  permission?: RequiredPermission;
  /** Allowed role slugs, when kind === 'role'. */
  roles?: RoleKey[];
}

const VERB = new Map<number, string>([
  [RequestMethod.GET, 'GET'],
  [RequestMethod.POST, 'POST'],
  [RequestMethod.PUT, 'PUT'],
  [RequestMethod.PATCH, 'PATCH'],
  [RequestMethod.DELETE, 'DELETE'],
  [RequestMethod.ALL, 'ALL'],
]);

function controllerFiles(root: string): string[] {
  const out: string[] = [];
  (function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.controller.ts')) out.push(full);
    }
  })(root);
  return out.sort();
}

function joinPath(prefix: unknown, sub: unknown): string {
  // Nest stores '/' for a bare @Get(), and a @Controller() with no prefix
  // stores ''. Left alone those produce '/invoices/' and '//clinical/findings',
  // which are the same routes with noisier names. Normalise so the matrix reads
  // like the URLs people actually type.
  const parts = [prefix, sub]
    .map((p) => (typeof p === 'string' ? p : ''))
    .flatMap((p) => p.split('/'))
    .filter((p) => p.length > 0);
  return '/' + parts.join('/');
}

/** Walk src/ and return every route handler with the guard it declares. */
export function collectRoutes(srcRoot = path.join(__dirname, '..')): RouteEntry[] {
  const entries: RouteEntry[] = [];

  for (const file of controllerFiles(srcRoot)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(file) as Record<string, unknown>;
    for (const exported of Object.values(mod)) {
      if (typeof exported !== 'function') continue;
      const prefix = Reflect.getMetadata(PATH_METADATA, exported);
      if (prefix === undefined) continue; // not a @Controller

      const proto = (exported as { prototype: object }).prototype;
      for (const name of Object.getOwnPropertyNames(proto)) {
        if (name === 'constructor') continue;
        const fn = (proto as Record<string, unknown>)[name] as object;
        const verb = Reflect.getMetadata(METHOD_METADATA, fn);
        if (verb === undefined) continue; // not a route

        // getAllAndOverride's precedence: handler wins, then class.
        const pick = <T>(key: string): T | undefined =>
          (Reflect.getMetadata(key, fn) as T | undefined) ??
          (Reflect.getMetadata(key, exported) as T | undefined);

        const isPublic = pick<boolean>(IS_PUBLIC_KEY);
        const noPerm = pick<boolean>(NO_PERMISSION_KEY);
        const features = pick<RequiredFeature[]>(FEATURE_KEY);
        const resolver = pick<unknown>(FEATURE_RESOLVER_KEY);
        const permission = pick<RequiredPermission>(PERMISSION_KEY);
        const roles = pick<RoleKey[]>(ROLE_KEY);

        const kind: GuardKind = isPublic
          ? 'public'
          : noPerm
            ? 'authenticated'
            : roles?.length
              ? 'role'
              : features?.length
              ? 'feature'
              : resolver
                ? 'resolver'
                : permission
                  ? 'module'
                  : 'none';

        entries.push({
          method: VERB.get(verb as number) ?? String(verb),
          route: joinPath(prefix, Reflect.getMetadata(PATH_METADATA, fn)),
          controller: (exported as { name: string }).name,
          handler: name,
          kind,
          features: features ?? [],
          permission,
          roles,
        });
      }
    }
  }

  return entries.sort((a, b) => `${a.route} ${a.method}`.localeCompare(`${b.route} ${b.method}`));
}

/** The ability a role gets from the seed defaults — both levels, as the JWT carries them. */
export function abilityForRole(role: RoleKey): Ability {
  const features = featureGrantsFor(role) as FeaturePermissionKey[];
  const modules: PermissionKey[] = [];
  for (const g of defaultGrantsFor(role)) {
    for (const a of ['view', 'add', 'edit', 'delete'] as ActionKey[]) {
      if (g[a]) modules.push(`${g.module}:${a}` as PermissionKey);
    }
  }
  return new Ability(modules, features);
}

/**
 * Whether a role may reach a route, as the guard would decide it.
 *
 * `null` means "cannot be decided here": a resolver picks its key from the
 * request, so there is no answer without a request. Those routes are still
 * inventoried — see the resolver coverage assertions in access-matrix.spec.ts.
 */
export function roleMayAccess(entry: RouteEntry, role: RoleKey): boolean | null {
  const ability = abilityForRole(role);
  switch (entry.kind) {
    case 'public':
    case 'authenticated':
      return true;
    case 'role':
      return (entry.roles ?? []).includes(role);
    case 'feature':
      return entry.features.every((f) => ability.canFeature(f.feature, f.action));
    case 'module':
      return ability.can(entry.permission!.module, entry.permission!.action);
    case 'resolver':
      return null;
    case 'none':
      return false; // the guard fails closed
  }
}

export const MATRIX_ROLES = ROLES.filter((r) => r !== 'patient') as RoleKey[];
