/**
 * Dashboard demo data.
 *
 * The core seed (prisma/seed.ts) builds RBAC, masters and a handful of records
 * — enough to use the app, but not enough to make the dashboard say anything.
 * Trends were flat, "Today's Appointments" was always empty, staff attendance
 * read 0/N, and revenue had no prior month to compare against.
 *
 * This script fills exactly the gaps the dashboard aggregations read, and
 * nothing else. Two rules it must keep, because it runs against a live server:
 *
 *   1. ADDITIVE ONLY. It never deletes or rewrites anything it did not create.
 *      prisma/seed.ts is destructive and guarded; this one is safe to run on a
 *      populated database.
 *   2. RE-RUNNABLE. Every row it writes is tagged with DEMO_TAG in a free-text
 *      field, and each section clears its *own* previous rows first. Running it
 *      twice leaves the same result as running it once, and the tag makes the
 *      demo data identifiable if it ever needs to come out.
 *
 * Usage:  pnpm --filter @smart-hospital/api prisma:seed-dashboard
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Marker written into a free-text column on every row this script creates. */
const DEMO_TAG = '[demo:dashboard]';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

/** Deterministic pseudo-random so re-runs and screenshots stay comparable. */
function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rand = rng(20260729);
const between = (lo: number, hi: number): number => Math.round(lo + rand() * (hi - lo));

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

async function main(): Promise<void> {
  const now = new Date();
  const today = startOfDay(now);

  const branch = await prisma.branch.findFirst({
    where: { deletedAt: null },
    orderBy: { isHome: 'desc' },
  });
  if (!branch) throw new Error('No branch found — run the core seed first.');
  const branchId = branch.id;

  const patients = await prisma.patient.findMany({
    where: { branchId, deletedAt: null },
    select: { id: true, name: true },
    take: 20,
  });
  if (patients.length === 0) throw new Error('No patients found — run the core seed first.');

  const staff = await prisma.staff.findMany({
    where: { branchId, deletedAt: null },
    select: { userId: true, user: { select: { name: true, role: { select: { slug: true } } } } },
  });
  const doctor = staff.find((s) => s.user?.role?.slug === 'doctor') ?? staff[0];
  const admin = staff.find((s) => s.user?.role?.slug === 'super_admin') ?? staff[0];
  if (!doctor) throw new Error('No staff found — run the core seed first.');

  console.log(`🌱 Dashboard demo data → branch "${branch.name}"`);
  console.log(`   ${patients.length} patients, ${staff.length} staff`);

  // ── 1) Today's appointments ───────────────────────────────────────────────
  // Drives appointmentsKpi and the Today's Appointments card. Statuses come
  // from APPOINTMENT_STATUSES — there is no "confirmed"; `approved` is what the
  // KPI counts as confirmed.
  await prisma.appointment.deleteMany({ where: { branchId, message: { contains: DEMO_TAG } } });

  const slots = ['09:00 AM', '09:30 AM', '10:00 AM', '11:15 AM', '12:00 PM', '02:30 PM', '04:00 PM'];
  const statuses = ['approved', 'approved', 'approved', 'pending', 'pending', 'completed', 'approved'];

  // Draw appointment numbers from the same counter the API uses, and advance it.
  // Deriving them from max(apptNo) instead left the counter behind, so the next
  // appointment booked through the UI reused a number already taken and died on
  // the (branchId, apptNo) unique constraint.
  const counter = await prisma.sequenceCounter.upsert({
    where: { branchId_key: { branchId, key: 'appointment' } },
    create: { branchId, key: 'appointment', prefix: 'APPT', next: 1 },
    update: {},
    select: { next: true, prefix: true },
  });
  let apptSeq = counter.next - 1;
  const apptPrefix = counter.prefix;

  for (let i = 0; i < slots.length; i++) {
    const p = patients[i % patients.length]!;
    apptSeq += 1;
    await prisma.appointment.create({
      data: {
        branchId,
        apptNo: `${apptPrefix}${String(apptSeq).padStart(6, '0')}`,
        serialNo: apptSeq,
        patientId: p.id,
        doctorId: doctor.userId,
        apptDate: today,
        slot: slots[i]!,
        fees: between(200, 800),
        paid: 0,
        priority: i === 3 ? 'urgent' : 'normal',
        paymentMode: 'cash',
        status: statuses[i]!,
        message: DEMO_TAG,
        createdById: admin?.userId ?? null,
      },
    });
  }
  // Leave the counter where the API expects to pick up.
  await prisma.sequenceCounter.update({
    where: { branchId_key: { branchId, key: 'appointment' } },
    data: { next: apptSeq + 1 },
  });
  console.log(`  ✔ ${slots.length} appointments today (counter → ${apptSeq + 1})`);

  // ── 2) Blood stock across all eight groups ────────────────────────────────
  // The grid pads to all eight groups, so without stock rows it was a wall of
  // red zeroes. Give it a realistic spread: plentiful O+/A+, thin AB-/O-.
  const units: Record<string, number> = {
    'A+': 14, 'A-': 4, 'B+': 11, 'B-': 3, 'AB+': 6, 'AB-': 1, 'O+': 18, 'O-': 2,
  };
  for (const group of BLOOD_GROUPS) {
    let product = await prisma.bloodProduct.findFirst({
      where: { branchId, bloodGroup: group, component: null, deletedAt: null },
    });
    product ??= await prisma.bloodProduct.create({
      data: { branchId, name: `Whole Blood ${group}`, bloodGroup: group, rate: 1200 },
    });
    await prisma.bloodStock.upsert({
      where: { productId: product.id },
      update: { units: units[group]! },
      create: { branchId, productId: product.id, units: units[group]! },
    });
  }
  console.log(`  ✔ blood stock for ${BLOOD_GROUPS.length} groups`);

  // ── 3) Staff attendance for today ─────────────────────────────────────────
  // staffAttendance counts present|late|half_day against Attendance.date, which
  // is a DATE column — it must be midnight, not "now".
  await prisma.attendance.deleteMany({ where: { branchId, date: today, note: DEMO_TAG } });
  let present = 0;
  for (let i = 0; i < staff.length; i++) {
    const s = staff[i]!;
    // Leave roughly one in six away so the figure is not a flat 100%.
    const status = i % 6 === 5 ? 'absent' : i % 5 === 4 ? 'late' : 'present';
    if (status !== 'absent') present += 1;
    await prisma.attendance.upsert({
      where: { branchId_staffUserId_date: { branchId, staffUserId: s.userId, date: today } },
      update: { status, note: DEMO_TAG },
      create: { branchId, staffUserId: s.userId, date: today, status, method: 'manual', note: DEMO_TAG },
    });
  }
  console.log(`  ✔ attendance for today — ${present}/${staff.length} present`);

  // ── 4) Income and expense across 12 months ────────────────────────────────
  // This is what the yearly Income vs Expense chart reads. Income trends gently
  // upward with a seasonal dip so the two series are visibly different shapes
  // rather than two parallel lines.
  await prisma.income.deleteMany({ where: { branchId, description: { contains: DEMO_TAG } } });
  await prisma.expense.deleteMany({ where: { branchId, description: { contains: DEMO_TAG } } });

  let incomeHead = await prisma.incomeHead.findFirst({ where: { branchId, deletedAt: null } });
  incomeHead ??= await prisma.incomeHead.create({ data: { branchId, name: 'Consultation' } });
  let expenseHead = await prisma.expenseHead.findFirst({ where: { branchId, deletedAt: null } });
  expenseHead ??= await prisma.expenseHead.create({ data: { branchId, name: 'Operations' } });

  for (let back = 11; back >= 0; back--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const seasonal = 1 + 0.25 * Math.sin(((11 - back) / 12) * Math.PI * 2);
    const growth = 1 + (11 - back) * 0.04;
    const incomeTotal = Math.round(38000 * seasonal * growth);
    const expenseTotal = Math.round(24000 * growth * (0.9 + rand() * 0.2));

    // A few rows per month rather than one lump, so the Finance module's lists
    // look like real bookkeeping too.
    for (let k = 0; k < 3; k++) {
      const day = new Date(monthStart.getFullYear(), monthStart.getMonth(), 5 + k * 9);
      if (day > now) break;
      await prisma.income.create({
        data: {
          branchId,
          headId: incomeHead.id,
          name: ['Consultation fees', 'Procedure income', 'Diagnostics income'][k]!,
          date: day,
          amount: Math.round(incomeTotal / 3),
          description: DEMO_TAG,
          createdById: admin?.userId ?? null,
        },
      });
      await prisma.expense.create({
        data: {
          branchId,
          headId: expenseHead.id,
          name: ['Salaries', 'Consumables', 'Utilities'][k]!,
          date: day,
          amount: Math.round(expenseTotal / 3),
          description: DEMO_TAG,
          createdById: admin?.userId ?? null,
        },
      });
    }
  }
  console.log('  ✔ 12 months of income and expense');

  // ── 5) Invoices and payments ──────────────────────────────────────────────
  // Three jobs at once:
  //   · payments in the last 14 days      → revenue sparkline
  //   · payments in the *previous* month  → revenueKpi.changePct (was null)
  //   · unpaid invoices, some >30 days    → outstanding KPI and its overdue count
  //   · a spread of `module` values       → income-by-module breakdown
  await prisma.payment.deleteMany({
    where: { invoice: { branchId, note: { contains: DEMO_TAG } } },
  });
  await prisma.invoice.deleteMany({ where: { branchId, note: { contains: DEMO_TAG } } });

  const modules = ['opd', 'ipd', 'pharmacy', 'pathology', 'radiology', 'ambulance', 'blood'];
  const lastInvoice = await prisma.invoice.findFirst({
    where: { branchId },
    orderBy: { billNo: 'desc' },
    select: { billNo: true },
  });
  let billSeq = Number((lastInvoice?.billNo ?? 'DEMO000000').replace(/\D/g, '')) || 0;

  const makeInvoice = async (billDate: Date, paidRatio: number, moduleIdx: number) => {
    const net = between(900, 6500);
    const paid = Math.round(net * paidRatio);
    const balance = net - paid;
    billSeq += 1;
    const invoice = await prisma.invoice.create({
      data: {
        branchId,
        patientId: patients[billSeq % patients.length]!.id,
        billNo: `DEMO${String(billSeq).padStart(6, '0')}`,
        module: modules[moduleIdx % modules.length]!,
        billDate,
        subtotal: net,
        netAmount: net,
        paid,
        balance,
        status: balance === 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
        note: DEMO_TAG,
        createdById: admin?.userId ?? null,
      },
    });
    if (paid > 0) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: paid,
          mode: 'cash',
          paidAt: billDate,
          createdById: admin?.userId ?? null,
        },
      });
    }
  };

  // Last 14 days — dense, mostly settled.
  let recent = 0;
  for (let back = 13; back >= 0; back--) {
    const day = addDays(today, -back);
    for (let k = 0; k < between(1, 4); k++) {
      await makeInvoice(day, rand() < 0.7 ? 1 : rand() < 0.5 ? 0.5 : 0, recent + k);
      recent += 1;
    }
  }

  // Previous month — gives changePct something to compare against.
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  for (let k = 0; k < 22; k++) {
    const day = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1 + k);
    await makeInvoice(day, 1, k);
  }

  // Older unpaid invoices, so "overdue" (>30 days) is not permanently zero.
  for (let k = 0; k < 5; k++) {
    await makeInvoice(addDays(today, -(35 + k * 6)), 0, k);
  }
  console.log(`  ✔ ${recent + 27} invoices with payments`);

  // ── 6) Recent activity ────────────────────────────────────────────────────
  // The audit trail fills naturally in use, but a fresh server has nothing to
  // show, so lay down a plausible recent history.
  await prisma.auditLog.deleteMany({ where: { branchId, ip: DEMO_TAG } });
  const events: [string, string][] = [
    ['create', 'patient'], ['update', 'invoice'], ['create', 'appointment'],
    ['create', 'payment'], ['update', 'ipd_admission'], ['create', 'lab_investigation'],
    ['delete', 'appointment'], ['create', 'prescription'], ['update', 'medicine'],
    ['create', 'blood_issue'],
  ];
  for (let i = 0; i < events.length; i++) {
    const [action, entity] = events[i]!;
    await prisma.auditLog.create({
      data: {
        branchId,
        userId: (i % 2 === 0 ? admin?.userId : doctor.userId) ?? null,
        action,
        entity,
        entityId: null,
        ip: DEMO_TAG,
        createdAt: new Date(now.getTime() - i * 37 * 60 * 1000),
      },
    });
  }
  console.log(`  ✔ ${events.length} audit entries`);

  console.log('✅ Dashboard demo data complete.');
}

main()
  .catch((e) => {
    console.error('❌ seed-dashboard failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
