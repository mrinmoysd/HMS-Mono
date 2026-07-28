# Smart Hospital & Research Center — HMS

Production-grade Hospital Management System. Monorepo: **Next.js** (web) · **NestJS** (API) ·
**PostgreSQL** (Prisma). See [`docs/`](docs/) for the full plan, data model, permission matrix,
frontend design, and phased execution roadmap.

## Monorepo layout
```
apps/
  api/       NestJS API — auth, RBAC, branch scoping, modules (Phase 0 ✅)
  web/       Next.js admin dashboard — app shell, permission-aware sidebar (Phase 0 ✅)
  patient/   Patient self-service portal (Phase 8b — planned)
packages/
  shared/    Permission catalog, roles/matrix, Zod DTOs (single source of truth)
docs/        DEVELOPMENT_PLAN · DATA_MODEL · PERMISSION_MATRIX · FRONTEND_DESIGN · EXECUTION_PHASES
```

## Prerequisites
Node ≥ 20, pnpm 9, Docker.

## Quick start
```bash
pnpm install
cp .env.example .env

# 1) start Postgres + Redis (host ports 5433 / 6380 to avoid conflicts)
pnpm db:up

# 2) build shared, migrate & seed the database
pnpm --filter @smart-hospital/shared build
cd apps/api && pnpm prisma:generate && pnpm prisma:migrate && pnpm prisma:seed && cd ../..

# 3) run API (http://localhost:4000/api/v1, docs at /api/docs) and web (http://localhost:3001)
pnpm --filter @smart-hospital/api dev      # terminal 1
pnpm --filter @smart-hospital/web dev      # terminal 2
```

## Demo logins (password: `password`)
One staff account per role, seeded from the FRD's role model:

| Username | Role | Sidebar modules |
|---|---|---|
| `superadmin` | Super Admin | all 29 |
| `admin` | Admin | all 29 |
| `accountant` | Accountant | broad clinical + finance |
| `doctor` | Doctor | clinical |
| `pharmacist` | Pharmacist | pharmacy-centric |
| `pathologist` | Pathologist | lab-centric |
| `radiologist` | Radiologist | imaging-centric |
| `receptionist` | Receptionist | front-desk broad |
| `nurse` | Nurse | 10 (most restricted) |

## Ports (remapped to coexist with other local stacks)
Postgres `5433` · Redis `6380` · API `4000` · Web `3001`

## Testing
```bash
pnpm --filter @smart-hospital/shared test   # permission-matrix suite
```

## Status
**Phase 0 (Foundations) complete & validated:** monorepo, auth (JWT access/refresh, argon2),
data-driven RBAC (10 roles × 29 modules × 4 actions), branch scoping, audit model, global
exception envelope, health/meta endpoints, DB migration + seed, permission-aware app shell &
sidebar, full-stack login flow.

**Phase 1 (Patient & Case core) complete & validated:**
- Patient registry API — branch-scoped CRUD, search, bulk delete, audit, per-branch sequence IDs
  (`PT000001`), auto-opened Case ID; **CSV import**.
- **Charge-engine masters** — charge categories/types, tax categories, and the charge master
  (with category + tax joins) that later phases' billing will consume.
- **Custom-fields engine** — typed fields (text/select/date/checkbox/…) attachable to any of 22
  entities with a Setup manager; render dynamically on the Patient form.
- **TPA** module; **certificate & ID-card** generation (server-rendered printable HTML).
- Reusable frontend primitives (`DataTable`, `FormDrawer`, `Field` set, `Button`,
  `CustomFieldRenderer`) that unlock the remaining list/modal screens.

All verified end-to-end in the browser (Patient list/add/import/export, custom field appearing on
the patient form, Charges master, Certificate generation+preview); RBAC enforced (Nurse `view`-only
→ 403 on create; `setup` gate on masters). API + web typecheck/build green, 6/6 permission tests.

**Phase 2 (Appointments, OPD & Billing hub) complete & validated:**
- **Shared invoice engine** (`billing/`) — one `InvoiceService` produces every department's bill
  with identical charge math (`amount = applied × qty − disc% + tax%`), numbering (`INV000001`),
  idempotent payments, and overpay-guarded balances. Verified: 945 + 100 = **1045** net.
- **Appointments** — Today/Upcoming/Old tabs, per-doctor queue, fees/discount/paid, priority,
  inline status change (`APPT000001`).
- **OPD** — visits with the reusable **`ChargeLineEditor`** (live totals) that generate a bill
  through the invoice engine transactionally + initial payment; Case ID linked (`OPD000001` →
  `CASE000006`).
- **Billing hub** — invoice list across modules, module shortcuts, **Case ID lookup**, and
  payment collection.
- Reusable primitives added: `ChargeLineEditor`, `PatientSelect`, `Tabs`, `StatusPill`.

All verified end-to-end in the browser; API + web typecheck/build green, **10/10 tests** (incl.
billing-math suite).

**Phase 3 (IPD & Bed management) complete & validated:**
- **Bed masters** — floors, bed types, bed groups, and the bed master (Setup → Beds).
- **IPD admission** — allocates the bed (→ allotted) and optionally bills initial charges through
  the shared invoice engine, all in one transaction; credit limit, consultant, Case ID link
  (`IPD000001`). Double-booking a bed is rejected (400).
- **Discharge** — frees the bed (→ available) and stamps the discharge date; printable
  **discharge card**.
- **Live Bed Status overlay** (`BedGrid`) wired to the header bed icon — floor → group → bed
  tiles, **green = available / pink = allotted with patient name** (FRD §2.30).

All verified end-to-end in the browser (admit → G-01 turns pink "Import Two" in the live grid →
discharge frees it); API + web typecheck/build green, 10/10 tests.

**Phase 4 (Diagnostics & Pharmacy) complete & validated:**
- **Pharmacy** — medicine catalog + sale bill (invoice via engine + **stock decrement**, oversell
  guarded 400).
- **Pathology & Radiology** — shared diagnostic engine (one service, `modality` field, two
  permission-scoped controllers); test catalog + bill with reference doctor & result-value capture.
- **Blood Bank** — products with live stock, donors (donation adds units), and issue (invoice +
  stock decrement); Blood Stock / Donors tabs.
- **Operation Theatre** — operation catalog (Setup).
- All six clinical departments now bill through the **one shared invoice engine** — verified 7
  invoices across 6 modules from a single `InvoiceService`.

Verified end-to-end in the browser (pharmacy bill generated via the reused `ChargeLineEditor` →
INV000008 → stock 90→87). API + web typecheck/build green, 10/10 tests.

**Phase 5 (Finance, Referral & Ambulance) complete & validated:**
- **Finance** — income/expense ledger (+ configurable heads) with sequence numbers (`INC000001`,
  `EXP000001`) and a live income/expense/net summary.
- **Referral** — referral persons with a default commission %, and per-bill payments that compute
  the commission (default or per-payment override) — verified 5000@10%→500, 2000@15%→300.
- **Ambulance** — fleet management + call log that bills the fare through the shared invoice
  engine (`INV000009`, module=ambulance). TPA was delivered in Phase 1.
- The invoice hub now spans **7 modules** (opd, ipd, pharmacy, pathology, radiology, blood,
  ambulance).

All verified end-to-end in the browser; API + web typecheck/build green, 10/10 tests.

**Phase 6 (HR & Workforce) complete & validated:**
- **Staff** — directory (role filter), Add Staff creates a **login (User) + HR profile (Staff)**
  in one transaction (`STF000001`, immediately able to log in); departments/designations masters.
- **Attendance** — QR/manual check-in/out kiosk + daily attendance list.
- **Duty Roster** — shifts + per-staff/date/shift roster assignment.
- **Payroll** — generate payslip (gross − deductions = net) per staff/month.
- **Leaves** — leave types + requests with approve/reject workflow.
- **Annual Calendar** — holidays/activities/vacations with a public front-site flag.

All verified end-to-end in the browser (staff directory of 10, live QR check-in). API + web
typecheck/build green, 10/10 tests. RBAC enforced (Nurse → 403 on staff creation).

**Phase 7 (Front Office, Records, Comms & Inventory) complete & validated:**
- **Front Office** — visitor register, phone-call log, postal complaints (configurable purpose/
  complaint/source lists).
- **Birth & Death Records** — with sequence refs (`BR000001`/`DR000001`) and printable certificates.
- **Messaging** — notice board + bulk SMS/Email/credential sending (recorded; a real gateway would
  dispatch via BullMQ).
- **Download Center** — content sharing to staff groups with content-type tagging.
- **Inventory** — items (category/supplier), stock in, issue with **live stock + oversell guard (400)**.
- **Live Consultation** — Zoom-based consultations & meetings.

All verified end-to-end in the browser; API + web typecheck/build green, 10/10 tests. RBAC enforced
(pathologist 403 on front office/inventory, 200 on download center).

**Phase 8 (Multi-Branch, Reports & Front CMS) complete & validated:**
- **Reports engine** — a registry of **15 categories / 20 reports** over every operational table
  (finance, appointment, OPD/IPD, all diagnostics, birth/death, payroll, attendance, inventory,
  audit, patient) with date-range filters, summaries and CSV export. Verified: Daily Transaction =
  9 invoices, billed 10170 / collected 6355 across all departments.
- **Multi-Branch** — branch onboarding + consolidated per-branch KPI overview (patients,
  appointments, OPD/IPD, income/expense, billed/collected) with a duration filter.
- **Front CMS** — pages/banners/menus admin + a **public (no-auth) site API** powering the
  marketing website.

All verified end-to-end in the browser; API + web typecheck/build green, 10/10 tests. RBAC enforced
(Nurse 403 on multi-branch).

**Phase 8b (Patient Portal — `apps/patient`) complete & validated:**
- A separate **mobile-first Next.js app** (port 3002) for patients: self-registration (creates a
  `patient`-role login + patient record), sign-in, home, book appointments, view OPD/IPD records,
  view & **pay bills online**, and profile — with a bottom-nav shell.
- **Hard data scoping** — every portal endpoint resolves the patient from the auth token and
  returns only their own records; cross-patient access is impossible (verified: paying another
  patient's invoice → 403, staff account → 403).

Verified end-to-end in a mobile viewport (register → auto-login → home shows next appointment →
Bills shows own paid invoice). All 3 apps typecheck/build green, 10/10 tests.

Next up (see [docs/EXECUTION_PHASES.md](docs/EXECUTION_PHASES.md)): **Phase 9 — Hardening &
Launch** (security review, performance, backups, seed/demo data, docs, UAT).
