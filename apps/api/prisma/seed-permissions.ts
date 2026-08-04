/**
 * Sync the feature-level permission rows from packages/shared/src/rbac/features.ts.
 *
 * Idempotent and re-runnable: run it again whenever the feature table changes,
 * and it will add what is new, remove what is gone, and correct any grant that
 * drifted. The TS table is the source of truth; this script makes the database
 * agree with it.
 *
 * It only ever touches rows where `feature IS NOT NULL`. The 116 module-level
 * rows and their grants are left exactly as they are — R1 retires those per
 * module, and recomputing them from the feature rows would escalate privilege
 * (see docs/ROLE_PERMISSION_PARITY.md, the R0 finding).
 *
 *   pnpm --filter api exec tsx prisma/seed-permissions.ts
 */
import { PrismaClient } from '@prisma/client';
import {
  ACTIONS,
  FEATURES,
  FEATURE_GROUPS,
  ROLES,
  featureGrantsFor,
  type ActionKey,
  type RoleKey,
} from '@smart-hospital/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('▸ Syncing feature-level permissions\n');

  const groupLabel = new Map(FEATURE_GROUPS.map((g) => [g.key, g.label]));

  // ── 1. The permission rows themselves ──────────────────────────────────────
  const wanted = new Map<string, { module: string; action: ActionKey; label: string; feature: string }>();
  for (const f of FEATURES) {
    // A feature in an unmapped group (Chat, Survey, …) still gets its rows, so
    // the editor can show it and R4 only has to add the module.
    const group = FEATURE_GROUPS.find((g) => g.key === f.group)!;
    for (const action of f.actions) {
      wanted.set(`${f.key}:${action}`, {
        module: group.module ?? f.group,
        action,
        label: `${groupLabel.get(f.group)} › ${f.label}`,
        feature: f.key,
      });
    }
  }
  console.log(`  feature toggles in the table: ${wanted.size}`);

  const existing = await prisma.permission.findMany({ where: { NOT: { feature: null } } });
  const existingByKey = new Map(existing.map((p) => [`${p.feature}:${p.action}`, p]));

  const toCreate = [...wanted].filter(([k]) => !existingByKey.has(k)).map(([, v]) => v);
  const toDelete = existing.filter((p) => !wanted.has(`${p.feature}:${p.action}`));

  if (toCreate.length) {
    // No skipDuplicates: a collision here means the partial unique indexes are
    // missing or the feature keys are not unique, and both should be loud.
    await prisma.permission.createMany({ data: toCreate });
    console.log(`  + created ${toCreate.length}`);
  }
  if (toDelete.length) {
    // Cascades to role_permission.
    await prisma.permission.deleteMany({ where: { id: { in: toDelete.map((p) => p.id) } } });
    console.log(`  - removed ${toDelete.length} stale`);
  }
  if (!toCreate.length && !toDelete.length) console.log('  = already in sync');

  // Re-read so new rows have ids.
  const perms = await prisma.permission.findMany({ where: { NOT: { feature: null } } });
  if (perms.length !== wanted.size) {
    // The first dry run landed 11 of 751 here, because the old (module, action)
    // unique index was still in place and skipDuplicates swallowed the rest.
    throw new Error(
      `Expected ${wanted.size} feature rows after sync, found ${perms.length}. ` +
        'Check that the 20260804090000_feature_permissions migration ran and dropped ' +
        'the old permission_module_action_key index.',
    );
  }
  const permId = new Map(perms.map((p) => [`${p.feature}:${p.action}`, p.id]));
  const featurePermIds = new Set(perms.map((p) => p.id));

  // ── 2. Per-role grants ─────────────────────────────────────────────────────
  console.log('\n  role grants:');
  for (const roleKey of ROLES as readonly RoleKey[]) {
    const role = await prisma.role.findUnique({ where: { slug: roleKey } });
    if (!role) {
      console.log(`    ${roleKey.padEnd(13)} — no such role, skipped`);
      continue;
    }

    const granted = new Set(featureGrantsFor(roleKey));

    // Every feature row gets a row, allowed true or false, mirroring how the
    // editor renders a checkbox for each: an absent row and an unchecked box
    // would otherwise be indistinguishable.
    const rows = perms.map((p) => ({
      roleId: role.id,
      permissionId: p.id,
      allowed: granted.has(`${p.feature}:${p.action}` as `${string}:${ActionKey}`),
    }));

    // Replace only this role's FEATURE rows. Module rows are untouched.
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: { in: [...featurePermIds] } },
    });
    await prisma.rolePermission.createMany({ data: rows });

    const allowed = rows.filter((r) => r.allowed).length;
    console.log(`    ${roleKey.padEnd(13)} ${String(allowed).padStart(3)} / ${rows.length}`);
  }

  // ── 3. Assert the module rows survived untouched ───────────────────────────
  const moduleRows = await prisma.permission.count({ where: { feature: null } });
  console.log(`\n  module-level rows still present: ${moduleRows}`);
  if (moduleRows !== 116) {
    throw new Error(`Expected the 116 module rows to be untouched, found ${moduleRows}`);
  }
  if (ACTIONS.length !== 4) throw new Error('ACTIONS changed — revisit the bit encoding');

  console.log('\n✔ done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
