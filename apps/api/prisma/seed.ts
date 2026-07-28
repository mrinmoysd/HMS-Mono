import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  ACTIONS,
  MODULES,
  MODULE_META,
  ROLES,
  ROLE_META,
  defaultGrantsFor,
  type RoleKey,
} from '@smart-hospital/shared';

const prisma = new PrismaClient();

const LANGUAGES = [
  { code: 'en', name: 'English', isRtl: false },
  { code: 'hi', name: 'Hindi', isRtl: false },
  { code: 'es', name: 'Spanish', isRtl: false },
  { code: 'id', name: 'Indonesian', isRtl: false },
  { code: 'pt', name: 'Portuguese', isRtl: false },
  { code: 'ar', name: 'Arabic', isRtl: true },
  { code: 'fr', name: 'French', isRtl: false },
  { code: 'tr', name: 'Turkish', isRtl: false },
  { code: 'ru', name: 'Russian', isRtl: false },
];

async function main() {
  console.log('🌱 Seeding Smart Hospital core data…');

  // 1) Languages
  for (const lang of LANGUAGES) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: { name: lang.name, isRtl: lang.isRtl },
      create: lang,
    });
  }
  console.log(`  ✔ ${LANGUAGES.length} languages`);

  // 2) Home branch
  const branch = await prisma.branch.upsert({
    where: { code: 'HOME' },
    update: {},
    create: {
      name: 'Smart Hospital & Research Center',
      code: 'HOME',
      url: 'https://smart-hospital.local',
      isHome: true,
    },
  });
  console.log(`  ✔ branch: ${branch.name}`);

  // 3) Permissions — every (module, action) tuple
  const permissionIds = new Map<string, string>();
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      const p = await prisma.permission.upsert({
        where: { module_action: { module, action } },
        update: {},
        create: { module, action, label: `${MODULE_META[module].label} — ${action}` },
      });
      permissionIds.set(`${module}:${action}`, p.id);
    }
  }
  console.log(`  ✔ ${permissionIds.size} permissions`);

  // 4) Roles + default permission matrices
  for (const slug of ROLES) {
    const meta = ROLE_META[slug as RoleKey];
    const role = await prisma.role.upsert({
      where: { slug },
      update: { label: meta.label, isProtected: meta.protected ?? false },
      create: { slug, label: meta.label, isProtected: meta.protected ?? false },
    });

    const grants = defaultGrantsFor(slug as RoleKey);
    const rows: { roleId: string; permissionId: string; allowed: boolean }[] = [];
    for (const g of grants) {
      for (const action of ACTIONS) {
        const permId = permissionIds.get(`${g.module}:${action}`);
        if (!permId) continue;
        rows.push({ roleId: role.id, permissionId: permId, allowed: g[action] });
      }
    }
    // reset + insert this role's matrix
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({ data: rows, skipDuplicates: true });
    const enabled = rows.filter((r) => r.allowed).length;
    console.log(`  ✔ role ${slug.padEnd(13)} — ${enabled} grants`);
  }

  // 5) One demo staff login per role (password: "password") — mirrors the FRD's
  //    per-role demo logins used to document role-based navigation (§2.31).
  const passwordHash = await argon2.hash('password');
  const demoUsers: { username: string; name: string; role: RoleKey }[] = [
    { username: 'superadmin', name: 'Super Admin', role: 'super_admin' },
    { username: 'admin', name: 'Hospital Admin', role: 'admin' },
    { username: 'accountant', name: 'Anita Accountant', role: 'accountant' },
    { username: 'doctor', name: 'Dr. Devi', role: 'doctor' },
    { username: 'pharmacist', name: 'Priya Pharmacist', role: 'pharmacist' },
    { username: 'pathologist', name: 'Pankaj Pathologist', role: 'pathologist' },
    { username: 'radiologist', name: 'Rahul Radiologist', role: 'radiologist' },
    { username: 'receptionist', name: 'Reena Receptionist', role: 'receptionist' },
    { username: 'nurse', name: 'Nisha Nurse', role: 'nurse' },
  ];
  for (const u of demoUsers) {
    const role = await prisma.role.findUniqueOrThrow({ where: { slug: u.role } });
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        email: `${u.username}@smart-hospital.local`,
        name: u.name,
        passwordHash,
        type: 'staff',
        branchId: branch.id,
        roleId: role.id,
      },
    });
  }
  console.log(`  ✔ ${demoUsers.length} demo users (username = role, password = "password")`);

  // 6) Default vital types (Setup → Vitals) with reference ranges.
  const VITALS = [
    { name: 'Temperature', unit: 'Fahrenheit', refMin: 95.8, refMax: 99.3, sortOrder: 1 },
    { name: 'BP', unit: 'mmHg', refMin: 90, refMax: 140, sortOrder: 2 },
    { name: 'Pulse', unit: 'Beats per min', refMin: 70, refMax: 100, sortOrder: 3 },
    { name: 'Height', unit: 'Centimeters', refMin: 1, refMax: 200, sortOrder: 4 },
    { name: 'Weight', unit: 'Kilograms', refMin: 0, refMax: 150, sortOrder: 5 },
  ];
  const existingVitals = await prisma.vitalType.count({ where: { branchId: branch.id } });
  if (existingVitals === 0) {
    for (const v of VITALS) {
      await prisma.vitalType.create({ data: { branchId: branch.id, ...v } });
    }
    console.log(`  ✔ ${VITALS.length} vital types`);
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
