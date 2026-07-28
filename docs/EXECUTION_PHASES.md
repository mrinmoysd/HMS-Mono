# Smart Hospital — Execution Phases (Backend + Frontend)

Buildable, standards-driven breakdown of every phase into **parallel backend and frontend
tracks** with a **Definition of Done (DoD)** and acceptance criteria. Pairs with
`DEVELOPMENT_PLAN.md` (strategy), `DATA_MODEL.md`, `PERMISSION_MATRIX.md`, `FRONTEND_DESIGN.md`.

**How to read a phase:** each has a Goal → Backend track (BE-x) → Frontend track (FE-x) →
Integration/QA → Exit criteria. BE and FE run concurrently; the API contract (OpenAPI + shared
Zod types) is agreed *first* so FE builds against it without waiting for BE implementation.

---

## 0. Engineering Standards (apply to EVERY phase — the "properly / by standards" bar)

### 0.1 Ways of working
- **Contract-first per module:** define the OpenAPI spec + shared Zod/DTO types in
  `packages/shared` before implementation. FE mocks against it (MSW) while BE builds.
- **Vertical slices:** ship a module end-to-end (DB → API → UI → tests) before starting the next.
- **Trunk-based + short-lived branches**, PRs small (< ~400 lines), 1+ review, green CI to merge.
- **Feature flags** for anything partially built so `main` is always deployable.

### 0.2 Code standards
- TypeScript **strict** everywhere; no `any` without justification; ESLint + Prettier enforced in CI.
- Naming/structure conventions documented in `CONTRIBUTING.md`; NestJS module-per-domain,
  Next.js feature-folder structure.
- **Validation:** one Zod schema per DTO in `packages/shared`, used by API (pipe) and web (RHF).
- **Errors:** typed API error envelope `{ code, message, details }`; no leaking stack traces.
- **Commits:** Conventional Commits; PR template with checklist + screenshots for UI.

### 0.3 Definition of Done (a task isn't done until all true)
- [ ] Meets acceptance criteria; matches FRD behavior for that screen/endpoint.
- [ ] Unit + integration tests written and green; coverage not decreased.
- [ ] Permission-guarded (API guard) **and** permission-aware in UI; verified for relevant roles.
- [ ] Branch-scoped; audit log emitted on mutations.
- [ ] Handles loading / empty / error states (FE) and validation + edge cases (BE).
- [ ] Accessible (keyboard + labels) and localized (no hard-coded strings).
- [ ] OpenAPI + types updated; docs/storybook entry added.
- [ ] Reviewed, CI green, no known P1/P2 bugs.

### 0.4 Quality gates in CI (block merge)
`lint → typecheck → unit → integration (Testcontainers Postgres) → build → e2e smoke (Playwright)
→ migration check`. Nightly: full e2e suite, permission-matrix suite, a11y (axe), Lighthouse.

### 0.5 Test pyramid
- **Unit** — services, charge/permission engines, validators, React hooks/components.
- **Integration** — API + real Postgres; repository/transaction correctness.
- **E2E** — Playwright on critical journeys (admit→discharge→bill, appointment→OPD→pay, login-per-role).
- **Permission-matrix suite** — asserts each of the 10 roles gets exactly its sidebar and is 403'd outside grants.

---

## Phase 0 — Foundations & Platform  *(3–4 wks)*
**Goal:** a deployable skeleton where a logged-in role sees a permission-correct shell and can CRUD one seed catalog.

**Backend (BE-0)**
- Monorepo (Turborepo + pnpm): `apps/api`, `apps/web`, `apps/patient`, `packages/shared`, `packages/ui`.
- NestJS bootstrap: config, logging (pino + trace IDs), global validation pipe, error filter, health checks, OpenAPI/Swagger.
- Prisma + Postgres; migration workflow; seed runner.
- **Core schema:** branch, user, role, permission, role_permission, staff (minimal), audit_log, system_setting, language.
- **Auth:** JWT access+refresh, argon2, login, refresh, logout, change-password, captcha hook, rate limiting.
- **RBAC engine (CASL):** permission catalog in `packages/shared`; `PermissionGuard(module, action)`; seed 10 roles + default matrices from `PERMISSION_MATRIX.md`.
- **BranchContextInterceptor** + query scoping helper; **AuditInterceptor**.
- Redis + BullMQ wiring; Docker Compose (postgres, redis, api, web).

**Frontend (FE-0)**
- Design tokens + Tailwind + shadcn theme (light/dark) in `packages/ui`; Storybook.
- `<AppShell>`, permission-aware `<Sidebar>` (12 groups), `<HeaderBar>` with all utility popovers (language, branch switch, notifications shell, bed, chat shell, calendar, task, profile).
- Auth pages (login, change password), session handling, protected routes, TanStack Query + Zustand (branch context) setup, next-intl scaffold (en + 1 more).
- **Reusable primitives:** `<ResourceList>`/`<DataTable>` (search, sort, paginate, page-size+All, export cluster, row actions, bulk, empty/loading/error), `<FormDrawer>`/`<FormDialog>`, `<Field>` set, `<ConfirmDialog>`, `<StatusBadge>`, `<Toast>`.
- Reference CRUD screen (a Setup catalog, e.g. Department) proving the full list+modal loop.

**Integration/QA:** login per role shows correct sidebar; catalog CRUD works end-to-end; CI gates live; permission-matrix suite seeded.
**Exit:** ✅ auth + RBAC + branch scope + shell + list/form primitives + one working catalog, all in CI, deployable to staging.

---

## Phase 1 — Patient & Case Core  *(3–4 wks)*
**Goal:** the central patient registry + Case aggregate + the masters everything else needs.

**BE-1:** patient, patient_case, tpa; charge engine masters (charge_category/type, tax_category, unit_type, charge); symptoms/vitals/findings masters; **custom_field + custom_field_value engine** (typed, visibility flags); patient import; global patient search (trigram); certificate + patient/staff ID-card generation (print templates).
**FE-1:** Patient List (search, import, disabled/deceased flags, export, bulk) · Add/Edit Patient drawer (all FRD fields, photo drag-drop, required validation) · Patient/Case **detail template** with sub-tabs · `<CustomFieldRenderer>` · Certificate & ID-card screens · global search box wired.
**Exit:** ✅ create/import/search patients; custom fields render on patient forms; certificates/ID cards generate; Case ID issued.

---

## Phase 2 — Appointments, OPD & Billing Hub  *(3–4 wks)*
**Goal:** front-desk booking → outpatient visit → payment, on the shared invoice engine.

**BE-2:** appointment_slot builder (doctor/shift/duration/charge), appointment (Today/Upcoming/Old, doctor-wise queue, fees/discount/paid, priority, live-consult flag, status), opd_visit (charge capture, antenatal, TPA apply), **invoice + invoice_item + payment engine** (compute amount = applied×qty×(1−disc%)×(1+tax%)), Billing hub routing + Case ID lookup, idempotent payment mutations in transactions.
**FE-2:** Appointment List with tabs + Doctor-Wise Queue · Add Appointment (Save / Save & Print) · OPD List (tabs) + Add OPD Patient · **`<ChargeLineEditor>`** + `<PrintPreview>` · Billing dashboard (module shortcuts + Case ID search).
**Exit:** ✅ book appointment → convert to OPD → capture charges → take payment → print bill; balances correct; Case ID links them.

---

## Phase 3 — IPD & Bed Management  *(3–4 wks)*
**BE-3:** floor/bed_group/bed_type/bed masters; live bed_status; ipd_admission (bed allocation in one transaction, credit limit, consultant, antenatal); discharge workflow + discharge card; IPD billing via invoice engine.
**FE-3:** IPD List + Add Admission (cascading bed group→bed, credit limit) · **`<BedGrid>`** full-screen occupancy overlay (green/pink, click-through) wired to header Bed icon · Discharge flow + discharge card print · IPD billing tab.
**Exit:** ✅ admit patient → bed turns allotted live → run IPD charges → discharge → discharge card; bed frees on discharge.

---

## Phase 4 — Diagnostics & Pharmacy  *(4–5 wks)*
**BE-4:** pharmacy (medicine catalog + masters, sale bills, stock decrement, expiry); pathology (categories/tests/parameters, bills, prior report values); radiology (categories/tests/parameters, bills, findings); blood bank (products, stock, donors, blood + component issue); operation theatre (category + operation). All billing through the shared invoice engine + referral commission capture.
**FE-4:** one billing-list + bill-generate screen per department (all reuse `<ChargeLineEditor>` + result/finding entry) · respective Setup catalogs · Blood Bank status tabs.
**Exit:** ✅ generate bills for pharmacy/pathology/radiology/blood with correct stock/inventory effects, prior values, and reports feeding.

---

## Phase 5 — Finance, TPA, Referral, Ambulance  *(3 wks)*
**BE-5:** income/expense (+heads), payments ledger, tpa CRUD (feeds "Apply TPA"), referral_person + commission rules + per-invoice referral_payment, ambulance vehicle + call + fare billing.
**FE-5:** Income/Expense lists + forms · TPA management · Referral payment list + rules setup · Ambulance call list + Add Call + fleet list.
**Exit:** ✅ record income/expense, apply TPA on bills, auto-compute referral commissions, bill ambulance calls.

---

## Phase 6 — HR & Workforce  *(3–4 wks)*
**BE-6:** full staff profile; department/designation/specialist masters; attendance (QR/barcode + camera settings + auto-attendance); duty roster/shifts; payroll (generate, components, payslip print); leave types + requests + approval; annual calendar (holiday/activity/vacation, front-site flag).
**FE-6:** Staff Directory (card/list, role filter) · Staff Profile detail (Profile/Payroll/Leaves/Attendance/Documents/Timeline + staff switcher) · QR Attendance kiosk view · Duty Roster + Assign Roster · Payroll + payslip · Leaves · Annual Calendar.
**Exit:** ✅ onboard staff, scan attendance, assign shifts, run payroll with payslip, manage leaves.

---

## Phase 7 — Front Office, Records, Comms, Inventory  *(3 wks)*
**BE-7:** visitor + phone_call_log + postal_complaint (configurable purpose/complaint/source lists); birth_record + death_record (+ printable reports); notifications + notice board + bulk SMS/Email (BullMQ) + credential sharing; chat/messaging; download center (content + content_type); inventory (item/category/store/supplier, stock, issue); live consultation/meeting (Zoom API config).
**FE-7:** Front Office lists (visitor/phone/postal) · Birth & Death records + reports · Notice board + send SMS/Email/Credential · Chat panel (header) · Download Center · Inventory lists + Add Stock/Issue Item · Live Consultation/Meeting screens.
**Exit:** ✅ log visitors/calls/complaints, register birth/death with reports, send bulk messages, chat, manage inventory, schedule tele-consults.

---

## Phase 8 — Multi-Branch, Reports, Front CMS  *(3–4 wks)*
**BE-8:** cross-branch consolidation (KPIs + consolidated reports) with `multibranch:view` gate; branch onboarding/settings; **19 report categories** (Finance, Appointment, OPD, IPD, Pharmacy, Pathology, Radiology, Blood Bank, Ambulance, Birth/Death, HR, TPA, Inventory, Live Consultation, Log, OT, Patient) with date/branch filters + export; materialized views for heavy reports; CMS pages/media/menus/banners API + public SSR/ISR site.
**FE-8:** Multi-Branch Overview (duration filter, per-branch KPI tables) + Consolidated Report + Branch settings · Reports hub (category → report screens, filters, export) · Front CMS admin (pages/media manager/menus/banners) · public marketing site (`apps/web` public routes or separate).
**Exit:** ✅ consolidated cross-branch view, all report categories render/export, public site editable from CMS.

---

## Phase 8b — Patient Portal  *(3–4 wks, parallelizable from Phase 5)*
**BE-8b:** Patient role scoped to own patient_id; portal endpoints (register/login, book/list appointments, view OPD/IPD history, reports, prescriptions, invoices + online payment, live-consult join, notifications, profile).
**FE-8b (`apps/patient`):** mobile-first shell (Home / Appointments / Records / Reports / Billing / Live Consult / Messages / Profile), booking flow, report downloads, pay invoice, join tele-consult.
**Exit:** ✅ a patient self-registers, books an appointment, views their records/reports, pays a bill — all hard-scoped to their own data.

---

## Phase 9 — Hardening, Security & Launch  *(3–4 wks)*
- **Performance:** load test top journeys; query/index tuning; report caching; bundle/Lighthouse budgets.
- **Security:** full permission-matrix audit, pen-test, dependency scan, secrets review, field-level PII encryption verified, session/token rotation, data-retention + backup/restore drill.
- **Accessibility:** full axe/keyboard audit across templates; fix to WCAG 2.1 AA.
- **Data:** import/migration tooling from legacy registers/spreadsheets; seed/demo data.
- **Ops:** blue/green deploy, alerts/dashboards, runbooks, DR test.
- **Docs & training:** admin/user guides, API docs, UAT sign-off per role.
**Exit:** ✅ green quality gates, no open P1/P2, UAT signed off, production rollout.

---

## Cross-phase parallelization & sequencing
- **Squads** (if staffed for it): *Platform* (Phase 0, RBAC, engines, reports infra), *Clinical*
  (1→2→3→4), *Ops/Finance* (5→6→7), *Patient Portal* (8b once billing/records exist).
- **Hard dependencies:** everything depends on Phase 0 (RBAC/branch/shell/primitives). Billing
  engine (Phase 2) is a prerequisite for Phases 3–5 and 8b payments. Reports (Phase 8) depend on
  data existing from Phases 1–7.
- **API contract precedes UI** in every phase → FE and BE stay concurrent, never blocked.

## Per-phase ritual (repeat each phase)
1. Contract workshop → OpenAPI + shared Zod types agreed.
2. BE + FE build concurrently against the contract (FE on MSW mocks).
3. Integrate → e2e for the phase's critical journey.
4. Permission-matrix + a11y + regression pass → demo → DoD checklist → merge → deploy to staging.
