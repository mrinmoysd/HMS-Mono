# Smart Hospital & Research Center — End-to-End Development Plan

> Production-grade Hospital Management System (HMS)
> Stack: **Next.js + React** (web) · **NestJS (Node.js)** (API) · **PostgreSQL** (data)
> Source of truth: `Smart Hospital - PRD & FRD - New.pdf` (26 pp, 29 modules, 9 roles)

---

## 1. Executive Summary

We are building a multi-branch, role-based Hospital Management System that digitizes the full
clinical + financial + operational lifecycle: patient registry → appointments → OPD/IPD →
diagnostics (pathology/radiology/blood bank) → pharmacy → billing → finance → reporting,
plus HR, front office, CMS, messaging, and system administration.

**Defining characteristics that drive the architecture:**

| Characteristic | Architectural implication |
|---|---|
| 29 modules, heavy master-data/catalog driven | Modular monolith with clear domain boundaries; catalog/master-data service |
| 9 fixed roles × granular View/Add/Edit/Delete per feature | Centralized policy-based RBAC engine (not hard-coded role checks) |
| Multi-branch with per-branch scoping + consolidated reporting | Branch as a first-class tenant dimension on every row + row-level scoping |
| "Case ID" ties Appointment/OPD/IPD/bills together | Central Case aggregate; billing is a hub, not a module |
| Billing generated inside each department | Shared invoice/charge engine consumed by all clinical modules |
| Custom Fields on 22 entities | EAV/JSONB custom-field engine with per-view visibility |
| 9 UI languages, print templates, exports everywhere | i18n framework, template engine, shared export service |
| Healthcare data | Audit trail, encryption, PII handling, strict access control |

**Recommendation:** a **modular monolith** (NestJS single deployable, module-per-domain) rather
than microservices. The domains are tightly coupled through Case/Patient/Billing and share one
transactional database; microservices would add distributed-transaction pain with no early
benefit. Keep module boundaries clean so services can be extracted later if scale demands it.

---

## 2. Technology Stack

> **Confirmed scope:** full parity (all 29 modules) **+ a patient self-service portal**
> (`apps/patient`) beyond the PRD's admin-only scope. Delivery approach: ERD + permission
> matrix designed up front (see `DATA_MODEL.md` and `PERMISSION_MATRIX.md`), then code.

### Frontend (`apps/web` = admin dashboard, `apps/patient` = patient portal)
- **Next.js 15** (App Router) + **React 19**, TypeScript
- **TanStack Query** (server state) + **Zustand** (light client state; branch context, UI)
- **React Hook Form + Zod** (forms & validation, shared schemas with API)
- **TanStack Table** for the universal searchable/paginated/exportable list pattern
- **shadcn/ui + Tailwind CSS** (component system; fast to build the 100+ list/modal screens)
- **next-intl** for the 9-language i18n requirement
- Export/print: server-generated PDFs (see §8) + client CSV/Excel (SheetJS) + copy/print

### Backend (`apps/api`)
- **NestJS** (modular architecture matches the domain-module structure 1:1)
- **Prisma** ORM (type-safe, great migrations) — or TypeORM if team prefers; plan assumes Prisma
- **PostgreSQL 16** (primary datastore), **Redis** (cache, sessions, queues, rate limiting)
- **BullMQ** for async jobs (SMS/email, PDF generation, exports, backups, report batches)
- **Passport + JWT** (access + refresh), argon2 password hashing
- **CASL** for the granular permission engine (integrates cleanly with NestJS guards)

### Shared (`packages/`)
- `packages/shared` — Zod schemas, DTO types, constants, permission definitions shared web↔api
- `packages/ui` — shared React components (optional)

### Infrastructure
- **Monorepo**: Turborepo + pnpm workspaces
- **Containers**: Docker + docker-compose (dev), image build for prod
- **Storage**: S3-compatible object storage (patient photos, documents, media, generated PDFs)
- **Observability**: OpenTelemetry → (Grafana/Loki/Tempo or Datadog); Sentry for errors
- **CI/CD**: GitHub Actions (lint, typecheck, test, build, migrate, deploy)

---

## 3. High-Level Architecture

```
┌───────────────────────────────────────────────────────────────┐
│  Next.js Web (admin dashboard)   ·  Public CMS site (SSR/ISR)   │
└───────────────┬───────────────────────────────┬───────────────┘
                │ REST/JSON (+ OpenAPI)           │
┌───────────────▼───────────────────────────────▼───────────────┐
│                      NestJS API (modular monolith)              │
│  Auth · RBAC(CASL) · BranchScope interceptor · Audit interceptor│
│  ┌──────────┬──────────┬──────────┬──────────┬───────────────┐ │
│  │ Patient  │ Clinical │ Billing/ │ Diagnostics│ HR / Admin   │ │
│  │ /Case    │ OPD·IPD  │ Finance  │ Path·Radio │ Front·CMS    │ │
│  │          │          │ Charge   │ ·Blood·Pharm│ Reports·Setup│ │
│  └──────────┴──────────┴──────────┴──────────┴───────────────┘ │
│  Cross-cutting: CustomFields · Catalog/MasterData · Notifications│
│  · Export/Print · i18n · Files                                  │
└───────┬───────────────┬───────────────┬───────────────┬────────┘
        │               │               │               │
   PostgreSQL         Redis           BullMQ         S3 Storage
   (+ row-level      (cache/         (jobs:          (photos,
    branch scope)     sessions)       pdf,sms,email)  docs, media)
```

**Request pipeline (every mutating endpoint):**
`JWT Auth Guard → Branch Context → CASL Permission Guard (module+action) → Validation (Zod/DTO)
→ Service (transaction) → Audit log → Response`

---

## 4. Domain & Data Model

Model by bounded context. Every business table carries `branch_id`, `created_by`, timestamps,
and soft-delete (`deleted_at`) for auditability.

### 4.1 Core / Identity
- `branch` (multi-branch; name, code, url, settings)
- `user` (staff + patient accounts), `role` (9 seed roles), `permission`, `role_permission`
- `staff` (extends user: department, designation, EPF, salary, bank, documents…)
- `patient` (registry: demographics, guardian, blood group, TPA, allergies, disabled/deceased flags)

### 4.2 Case & Encounters (the connective tissue)
- `case` — the central aggregate; a Case ID links appointment/OPD/IPD/bills
- `appointment` (doctor, shift, slot, fees/discount/paid, priority, live-consult flag, status)
- `opd_visit` (symptoms, consultant, charge capture, antenatal flag, payment)
- `ipd_admission` (bed allocation, credit limit, consultant, discharge workflow, status)
- `bed`, `bed_group`, `bed_type`, `floor` + live `bed_status` (Available/Allotted)

### 4.3 Diagnostics & Pharmacy
- `pathology_test`, `pathology_bill`, `pathology_parameter` (+ categories, units)
- `radiology_test`, `radiology_bill`, `radiology_parameter` (+ categories, units)
- `blood_donor`, `blood_stock`, `blood_issue`, `component_issue`, `blood_product` (14 products)
- `medicine`, `medicine_category`, `pharmacy_bill`, supplier/dosage/company/group masters
- `operation`, `operation_category` (OT activity)

### 4.4 Billing & Finance
- `charge` / `charge_category` / `charge_type` / `tax_category` / `unit_type` (master charge engine)
- `invoice` + `invoice_item` (shared across OPD/IPD/pharmacy/path/radio/blood/ambulance)
- `payment`, `income` (+ income_head), `expense` (+ expense_head)
- `tpa` (insurance partners), `referral_person` + `referral_commission_rule` + `referral_payment`

### 4.5 Operations / Front Office / HR
- `ambulance_call` (+ vehicle/driver, fare billing)
- `visitor`, `phone_call_log`, `postal_complaint` (front office, configurable purpose/complaint lists)
- `birth_record`, `death_record`
- `attendance` (QR/barcode), `duty_roster` / `shift`, `payroll`, `leave` + `leave_type`
- `holiday` / `annual_calendar` (Holiday/Activity/Vacation, front-site flag)

### 4.6 Content / Comms / System
- `cms_page`, `media`, `menu`, `banner` (public website)
- `notification`, `message` / `chat_thread`, `content_share` + `content_type` (download center)
- `inventory_item` (+ category/store/supplier), `item_stock`, `item_issue`
- `live_consultation`, `live_meeting` (Zoom/API config)
- `custom_field` (belongs to one of 22 entities; type, visibility flags) + `custom_field_value`
- `audit_log`, `email_sms_log`, `system_setting`, `language`, `print_template`

> **~70–90 tables total.** Deliver ERDs per context (§9 milestones) before coding each domain.

---

## 5. RBAC & Multi-Branch (highest-risk cross-cutting concern — build first)

The FRD is explicit: 9 system roles, each with a **per-feature View/Add/Edit/Delete matrix**
across every module. This must be **data-driven**, not hard-coded.

**Design:**
- Enumerate `(module, action)` permission tuples in `packages/shared` (single source of truth).
- Seed the 9 roles + default matrices from §2.31 of the FRD (per-role sidebar/report access
  tables give us the exact defaults, e.g. Nurse = Dashboard/Patient/OPD/IPD/HR/Messaging only).
- `role_permission` rows store View/Add/Edit/Delete booleans per feature; admin-editable via
  Setup → Roles Permissions UI.
- **CASL ability** built per-request from the user's role_permissions → guards on API, and the
  same ability object hydrated to the frontend to hide/disable sidebar items, buttons, columns.
- **Super Admin protection:** Admin can see but not edit the Super Admin role's matrix (§2.31.1).
- **Branch scoping:** a `BranchContext` interceptor injects the active branch (from header/session,
  set by the "Switch Branch" control) and every query is filtered by `branch_id`; consolidated
  Multi-Branch reports use an explicit cross-branch permission.

This module is a **Phase 0/1 foundation** — every other module depends on it.

---

## 6. Cross-Cutting Engines (build once, reuse everywhere)

The FRD's "cross-cutting observation" (§2.29) tells us most screens are the same shape. Build
these as reusable engines so 29 modules become mostly configuration:

1. **Universal List** — searchable, paginated (page-size + "All"), column-configurable table with
   Copy/Excel/CSV/PDF/Print export + row View/Edit/Delete. One `<DataTable>` + one list-endpoint
   convention (`GET /:module?search=&page=&size=&sort=`).
2. **Modal Form engine** — schema-driven forms with client-side required-field (red asterisk)
   validation mirroring server Zod schemas.
3. **Charge/Invoice engine** — computes Amount from Applied Charge − Discount(%) + Tax(%);
   consumed by OPD/IPD/pharmacy/pathology/radiology/blood/ambulance billing.
4. **Custom Fields engine** — attach typed fields (checkbox, date, select, number, textarea,
   hyperlink…) to 22 entities with Table/Print/Report/Patient-Panel visibility flags.
5. **Export/Print service** — server PDF (print templates with header/footer image + rich text
   per document type) + tabular exports.
6. **Notifications** — in-app bell feed + BullMQ-driven SMS/Email (gateway/SMTP configurable),
   credential sharing, notice board/bulk messaging.
7. **Audit trail** — interceptor logs who/what/when for every mutation (User Log, Audit Trail
   Report, Email/SMS Log are required outputs in §2.28).
8. **Catalog/Master-data** — generic CRUD for the dozens of Setup catalogs.
9. **i18n** — 9 languages, admin-managed translations; language switch reloads UI locale.

---

## 7. Module → Phase Roadmap

Sequenced by dependency and business value. Estimates assume a team of ~4–6 engineers; adjust.

### Phase 0 — Foundations (3–4 wks)
Monorepo, CI/CD, Docker, Postgres/Prisma baseline, auth (JWT + refresh, captcha, change-password),
**RBAC engine + 9 roles seed**, **branch context**, audit interceptor, i18n scaffold, the
**Universal List + Modal Form + DataTable** primitives, System Settings shell, app shell
(sidebar + header bar with Language/Branch/Notifications/Bed/Chat/Calendar/Profile).
→ *Exit: a logged-in role sees a permission-correct sidebar and can CRUD one seed catalog.*

### Phase 1 — Patient & Case Core (3–4 wks)
Patient registry (add/import, disabled/deceased flags, global search), **Case** aggregate,
Setup masters this depends on (Charge engine, Symptoms, Vitals, Findings, TPA, Custom Fields).
Certificate & Patient/Staff ID cards (template-driven).

### Phase 2 — Appointments & OPD (3–4 wks)
Appointment (Today/Upcoming/Old tabs, doctor-wise queue, slots builder, live-consult flag,
charge/discount/paid), OPD visits + charge capture + payment, Billing hub + Case ID lookup.

### Phase 3 — IPD & Beds (3–4 wks)
Bed masters + live Bed Status overlay (floor→ward→bed, green/pink occupancy), IPD admission,
credit limit, consultant, discharge workflow + discharge card, antenatal/obstetric.

### Phase 4 — Diagnostics & Pharmacy (4–5 wks)
Pharmacy (medicine catalog, sale bills, expiry), Pathology (tests/params, bills, prior values),
Radiology (tests/params, bills), Blood Bank (donors, stock, blood + component issue, 14 products),
Operation Theatre. All reuse the Charge/Invoice engine.

### Phase 5 — Finance, TPA, Referral, Ambulance (3 wks)
Income/Expense (+heads), Payments, TPA management, Referral persons/commission rules/payments,
Ambulance calls + fare billing.

### Phase 6 — HR & Workforce (3–4 wks)
Staff directory + rich profile, Departments/Designations/Specialists, Attendance (QR/barcode +
camera settings + auto-attendance), Duty Roster/Shifts, Payroll, Leaves, Annual Calendar.

### Phase 7 — Front Office, Records, Comms, Inventory (3 wks)
Visitor/phone/postal front office (configurable lists), Birth & Death records, Messaging/Notice
board, Download Center, Inventory (items/stock/issue), Live Consultation (Zoom).

### Phase 8 — Multi-Branch, Reports, CMS (3–4 wks)
Multi-branch overview/consolidated reports/branch onboarding, **19 report categories** (§2.28)
with date/branch filters + export, Front CMS (pages/media/menus/banners + public SSR site).

### Phase 8b — Patient Portal (3–4 wks, parallelizable)
Patient self-service (`apps/patient`): registration/login, book & manage appointments, view
OPD/IPD history, lab/radiology reports, prescriptions, bills & payments, live-consultation join,
notifications, profile. Reuses the same API with a `Patient` role scoped to own records only.

### Phase 9 — Hardening & Launch (3–4 wks)
Performance/load testing, security review + pen-test, accessibility, backup/restore, data
migration/import tooling, seed/demo data, docs & training, UAT, production rollout.

> **Indicative total: ~7–9 months** to full parity for a small team; parallelizable across
> squads (Clinical / Diagnostics-Billing / HR-Ops / Platform-Reports).

---

## 8. API & Print/Export Conventions
- **REST + OpenAPI** (auto-generated from NestJS decorators); versioned `/api/v1`.
- Consistent list contract (search/page/size/sort/filter) + envelope `{ data, meta }`.
- Print templates: server-rendered PDF (Puppeteer or a template engine) driven by the
  Setup → Print Header/Footer editor per document type (appointment, OPD/IPD bill, payslip,
  discharge card, birth/death, lab reports, etc.).
- Idempotency keys on payment/billing mutations; DB transactions around any invoice + payment.

---

## 9. Quality, Security & Ops

**Testing:** unit (services, charge/permission engines), integration (API + Postgres via
Testcontainers), E2E (Playwright on critical flows: admit→discharge→bill, appointment→OPD→pay,
RBAC matrix enforcement), and a dedicated **permission-matrix test suite** per role.

**Security / compliance (healthcare):**
- Encryption at rest (DB/storage) + TLS in transit; field-level encryption for sensitive PII.
- Full audit trail (already an FRD deliverable); least-privilege RBAC; branch isolation.
- Session/refresh-token rotation, captcha, rate limiting, input validation, output encoding.
- Backup/restore (Setup requirement) + tested disaster recovery; data-retention policy.
- Follow HIPAA/GDPR-style principles as applicable to jurisdiction.

**Ops:** blue/green or rolling deploys, DB migrations gated in CI, health checks, metrics/alerts,
structured logging with request/trace IDs, error tracking (Sentry).

---

## 10. Immediate Next Steps
1. Confirm the open decisions in the chat summary (ORM, PDF strategy, deployment target, scope
   cut for v1 — e.g. is the public patient portal in/out).
2. Stand up the monorepo (Turborepo + pnpm) with `apps/web`, `apps/api`, `packages/shared`.
3. Model Core/Identity + RBAC + Branch in Prisma; seed the 9 roles and default permission
   matrices from FRD §2.31.
4. Build the app shell + Universal List/Form primitives.
5. Ship Patient module end-to-end as the reference vertical slice, then fan out by phase.
```
