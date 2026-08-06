import * as fs from 'fs';
import * as path from 'path';
import { FEATURES } from '@smart-hospital/shared';
import { collectRoutes, roleMayAccess, MATRIX_ROLES, type RouteEntry } from './route-inventory';

/**
 * Phase R5 — the regression grid.
 *
 * Everything R0–R3 established is a fact about 372 route handlers and 751
 * permission toggles, and every one of those facts can be quietly undone by a
 * one-line edit. This file is what makes that loud.
 *
 * Two kinds of assertion, and the difference matters:
 *
 *  · **Invariants** — properties that must hold no matter how the app grows.
 *    No unguarded route. No feature key that does not exist. These never need
 *    updating and a failure is always a bug.
 *
 *  · **Allowlists and the snapshot** — the exemptions, and the full role × route
 *    grid, both committed. These are *supposed* to change when the app changes;
 *    the point is that changing them shows up as a reviewable diff rather than
 *    silently. Regenerate the snapshot with:
 *
 *      UPDATE_ACCESS_MATRIX=1 npx jest src/rbac/access-matrix.spec.ts
 *
 *    and read the diff before committing it. A diff that widens access is the
 *    thing this exists to catch.
 */

const MATRIX_PATH = path.join(__dirname, '../../../../docs/ACCESS_MATRIX.md');

/** Routes that need authentication and no permission. Each one is a decision. */
const AUTHENTICATED_ROUTES = [
  'GET /auth/me',
  'POST /auth/change-password',
  'GET /meta/modules',
  'GET /portal/appointments',
  'GET /portal/doctors',
  'GET /portal/invoices',
  'GET /portal/me',
  'GET /portal/notifications',
  'GET /portal/visits',
  'POST /portal/appointments',
  'POST /portal/invoices/:id/pay',
  'GET /reports/categories',
];

/** Routes reachable with no authentication at all. This list should stay tiny. */
const PUBLIC_ROUTES = [
  'GET /cms/public/pages/:slug',
  'GET /cms/public/site',
  'GET /health',
  'POST /auth/login',
  'POST /auth/refresh',
  'POST /portal/register',
];

/**
 * Routes still on the coarse module gate. Every one is documented in
 * docs/ROLE_PERMISSION_PARITY.md under "Deliberately left module-level" —
 * there is no feature key in the spec to migrate them to.
 */
const MODULE_GATED_ROUTES = [
  'DELETE /custom-fields/:id',
  'DELETE /invoices/:id/payments/:paymentId',
  'GET /clinical/findings',
  'GET /clinical/symptoms',
  'GET /custom-fields',
  'GET /invoices',
  'GET /invoices/:id',
  'GET /invoices/by-case/:caseNo',
  'PATCH /custom-fields/:id',
  'POST /clinical/findings',
  'POST /clinical/symptoms',
  'POST /custom-fields',
  'POST /invoices/:id/payments',
];

let routes: RouteEntry[];
const id = (r: RouteEntry) => `${r.method} ${r.route}`;

beforeAll(() => {
  routes = collectRoutes();
});

describe('route inventory', () => {
  it('finds the whole API', () => {
    expect(routes.length).toBeGreaterThan(350);
    expect(new Set(routes.map((r) => r.controller)).size).toBeGreaterThan(40);
  });

  it('has no duplicate method+route', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const r of routes) {
      const key = id(r);
      if (seen.has(key)) dupes.push(`${key} (${seen.get(key)} and ${r.controller}.${r.handler})`);
      seen.set(key, `${r.controller}.${r.handler}`);
    }
    expect(dupes).toEqual([]);
  });
});

describe('invariants', () => {
  it('every route declares a guard — the fail-closed contract', () => {
    // A route with kind 'none' reaches PermissionsGuard's deny branch. It would
    // 403 for everyone including Admin, so this is a bug in both directions.
    const undeclared = routes.filter((r) => r.kind === 'none').map((r) => `${id(r)}  (${r.controller}.${r.handler})`);
    expect(undeclared).toEqual([]);
  });

  it('every declared feature key exists in the feature table', () => {
    // A typo here is invisible at runtime: no role can hold a key that is not
    // in the table, so a misspelling denies everyone, forever, silently.
    const known = new Set(FEATURES.map((f) => f.key));
    const bogus: string[] = [];
    for (const r of routes) {
      for (const f of r.features) if (!known.has(f.feature)) bogus.push(`${id(r)} -> ${f.feature}`);
    }
    expect(bogus).toEqual([]);
  });

  it('every declared action is one the feature actually exposes', () => {
    // A feature exposes exactly the toggles Admin holds. Asking for `edit` on a
    // feature that has no edit toggle denies everyone, Admin included.
    const byKey = new Map(FEATURES.map((f) => [f.key, f]));
    const impossible: string[] = [];
    for (const r of routes) {
      for (const f of r.features) {
        const def = byKey.get(f.feature);
        if (def && !def.actions.includes(f.action)) {
          impossible.push(`${id(r)} -> ${f.feature}:${f.action} (has: ${def.actions.join(',')})`);
        }
      }
    }
    expect(impossible).toEqual([]);
  });

  it('Admin can reach every statically-decidable route', () => {
    // Admin holds all 751 toggles. Anything Admin cannot reach is a mistake in
    // the decorator, not a policy decision.
    const denied = routes
      .filter((r) => roleMayAccess(r, 'admin') === false)
      .map((r) => `${id(r)}  ${r.features.map((f) => `${f.feature}:${f.action}`).join(' + ')}`);
    expect(denied).toEqual([]);
  });
});

describe('exemptions are explicit', () => {
  it('only the listed routes skip the permission check', () => {
    expect(routes.filter((r) => r.kind === 'authenticated').map(id).sort()).toEqual(
      [...AUTHENTICATED_ROUTES].sort(),
    );
  });

  it('only the listed routes are reachable unauthenticated', () => {
    expect(routes.filter((r) => r.kind === 'public').map(id).sort()).toEqual([...PUBLIC_ROUTES].sort());
  });

  it('only the documented routes remain on a module gate', () => {
    expect(routes.filter((r) => r.kind === 'module').map(id).sort()).toEqual([...MODULE_GATED_ROUTES].sort());
  });
});

describe('the access matrix', () => {
  it('matches docs/ACCESS_MATRIX.md', () => {
    const rendered = render(routes);
    if (process.env.UPDATE_ACCESS_MATRIX) {
      fs.writeFileSync(MATRIX_PATH, rendered);
      return;
    }
    const committed = fs.existsSync(MATRIX_PATH) ? fs.readFileSync(MATRIX_PATH, 'utf8') : '';
    if (committed !== rendered) {
      throw new Error(
        'The role × route access matrix changed.\n\n' +
          'If that was intended, regenerate and READ THE DIFF before committing:\n' +
          '  UPDATE_ACCESS_MATRIX=1 npx jest src/rbac/access-matrix.spec.ts\n\n' +
          'A diff that turns · into ✓ widens access for that role.',
      );
    }
  });
});

function render(all: RouteEntry[]): string {
  const counts = all.reduce<Record<string, number>>((a, r) => ({ ...a, [r.kind]: (a[r.kind] ?? 0) + 1 }), {});
  const head = MATRIX_ROLES.map((r) => r.replace('super_admin', 'super').slice(0, 6));

  const lines: string[] = [
    '# Access matrix',
    '',
    '**Generated — do not edit by hand.** Produced by',
    '`apps/api/src/rbac/access-matrix.spec.ts` from the decorators Nest records,',
    'and the seed grants in `packages/shared/src/rbac`. Regenerate with:',
    '',
    '```bash',
    'UPDATE_ACCESS_MATRIX=1 pnpm --filter @smart-hospital/api exec jest src/rbac/access-matrix.spec.ts',
    '```',
    '',
    'The test fails when this file and the code disagree, so a permission change',
    'always shows up here as a reviewable diff. `✓` allowed, `·` denied,',
    '`?` decided per request by a resolver (it depends on the URL or body, so it',
    'cannot be answered without one).',
    '',
    '## Summary',
    '',
    `- routes: **${all.length}**`,
    `- feature-gated: ${counts.feature ?? 0}`,
    `- resolver-gated: ${counts.resolver ?? 0}`,
    `- module-gated (documented exceptions): ${counts.module ?? 0}`,
    `- authenticated, no permission: ${counts.authenticated ?? 0}`,
    `- public: ${counts.public ?? 0}`,
    `- **unguarded: ${counts.none ?? 0}**`,
    '',
    '## Routes',
    '',
    `| Method | Route | Guard | ${head.join(' | ')} |`,
    `|---|---|---|${head.map(() => '---').join('|')}|`,
  ];

  for (const r of all) {
    const guard =
      r.kind === 'feature'
        ? r.features.map((f) => `\`${f.feature}:${f.action}\``).join(' + ')
        : r.kind === 'module'
          ? `\`${r.permission!.module}:${r.permission!.action}\` *(module)*`
          : r.kind === 'resolver'
            ? '*per request*'
            : `*${r.kind}*`;
    const cells = MATRIX_ROLES.map((role) => {
      const v = roleMayAccess(r, role);
      return v === null ? '?' : v ? '✓' : '·';
    });
    lines.push(`| ${r.method} | \`${r.route}\` | ${guard} | ${cells.join(' | ')} |`);
  }

  return lines.join('\n') + '\n';
}
