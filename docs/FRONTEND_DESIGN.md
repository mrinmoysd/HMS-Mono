# Smart Hospital — Frontend Design System & Information Architecture

Design foundation for `apps/web` (admin dashboard) and `apps/patient` (portal). Pairs with
`DEVELOPMENT_PLAN.md` (architecture) and `PERMISSION_MATRIX.md` (what each role sees). This doc
defines *what it looks like and how it's structured* — tokens, components, navigation, screen
templates, responsive + accessibility rules. No pixel mockups (by scope choice).

---

## 1. Design Principles
1. **Density with clarity** — clinical staff scan large tables all day. Prefer compact,
   high-signal layouts over generous whitespace; but keep strong hierarchy and never crowd.
2. **One pattern, everywhere** — the FRD confirms nearly every screen is *list → modal form →
   record*. Standardize these three templates so the whole app feels like one product.
3. **Permission-honest UI** — never show an action the role can't perform (see §7).
4. **Fast, keyboard-friendly** — global search, keyboard shortcuts on high-frequency actions,
   sticky table headers, no needless page reloads (TanStack Query).
5. **Safe by default for clinical/financial actions** — destructive and money actions get
   confirmation + clear consequences; discharge, delete, refund are deliberate.
6. **Accessible & multilingual** — WCAG 2.1 AA, RTL-ready (Arabic is one of the 9 languages).

---

## 2. Design Tokens

Implemented as CSS variables + Tailwind theme; shadcn/ui consumes the same tokens. Support a
**light (default)** and **dark** theme (Setup → General has a Theme switch).

### 2.1 Color
| Token | Light | Role |
|---|---|---|
| `--primary` | `#1E63E9` (medical blue, matches PRD headings) | primary actions, links, active nav |
| `--primary-fg` | `#FFFFFF` | text on primary |
| `--accent` | `#0EA5A4` (teal) | secondary highlights, info chips |
| `--bg` | `#F6F8FB` | app background |
| `--surface` | `#FFFFFF` | cards, tables, modals |
| `--border` | `#E3E8EF` | dividers, table lines, inputs |
| `--fg` | `#0F172A` | primary text |
| `--fg-muted` | `#64748B` | secondary text, table headers |
| **Status** | | |
| `--success` | `#16A34A` | available bed (green), paid, active |
| `--danger` | `#DC2626` | delete, overdue, deceased flag |
| `--warning` | `#D97706` | low stock, expiring medicine, partial paid |
| `--occupied` | `#EC4899` (pink) | allotted bed (matches FRD bed overlay) |
| `--info` | `#2563EB` | notifications, neutral badges |

Rule: **status color is never the only signal** — always pair with an icon or text label
(color-blind safety). Bed overlay: green + "Available", pink + patient name.

### 2.2 Typography
- Font: **Inter** (UI) + **tabular-nums** for all money/quantity columns; system-font fallback.
- Scale (rem): `xs .75 / sm .875 / base .9375 (15px, table default) / lg 1.125 / xl 1.25 /
  2xl 1.5 / 3xl 1.875`. Page titles `2xl/600`, section `lg/600`, table body `sm`.

### 2.3 Spacing, radius, elevation
- Spacing scale: 4-px base (`1=4 … 6=24`). Table row height 40px (compact) / 48px (comfortable).
- Radius: `sm 6px` inputs/badges, `md 8px` cards/modals, `full` avatars/pills.
- Shadow: `sm` cards, `md` dropdowns/popovers, `lg` modals. Sidebar & header flat with border.

### 2.4 Iconography
- **Lucide** icon set (ships with shadcn). One icon vocabulary across app: view=eye, edit=pencil,
  delete=trash, print=printer, export=download, add=plus, search=magnifier.

---

## 3. Layout & Navigation (Information Architecture)

### 3.1 Admin shell (`apps/web`)
```
┌───────────────────────────────────────────────────────────────────────┐
│ HEADER BAR (sticky, 56px)                                               │
│  ☰  Logo  |  [Global Patient Search]      🌐 ⇄ 🔔 🛏 💬 📅 ✓ 👤        │
├──────────────┬────────────────────────────────────────────────────────┤
│ SIDEBAR      │  PAGE                                                    │
│ (collapsible │   Breadcrumb / Page title            [primary actions]  │
│  260px,      │   ┌──────────────────────────────────────────────────┐ │
│  grouped,    │   │  Content (list / detail / dashboard)             │ │
│  permission- │   │                                                  │ │
│  filtered)   │   └──────────────────────────────────────────────────┘ │
└──────────────┴────────────────────────────────────────────────────────┘
```

**Header utilities** (FRD §2.30), left→right: Language switcher (9 langs) · Switch Branch (radio
list + Update, sets session branch context) · Notifications (bell + unread badge → feed) · Bed
Status (opens full-screen occupancy overlay) · Chat (unread badge) · Calendar/To-Do · Task
summary · Profile (avatar → Profile / Change Password / Logout). Global patient search box is
always visible and routes to the pre-filtered Patient List.

**Sidebar** — grouped, collapsible, **rendered from the permission ability** so each role sees
only its modules. Proposed grouping (flattens the 28 modules into scannable sections):

| Group | Modules |
|---|---|
| Overview | Dashboard |
| Patients & Care | Patient, Appointment, OPD, IPD |
| Diagnostics | Pathology, Radiology, Blood Bank, Operation Theatre |
| Pharmacy & Inventory | Pharmacy, Inventory |
| Billing & Finance | Billing, Finance, TPA, Referral |
| Operations | Ambulance, Front Office, Birth & Death |
| Workforce | Human Resource, QR Attendance, Duty Roster, Annual Calendar |
| Communication | Messaging, Download Center, Live Consultation |
| Multi-Branch | Multi Branch |
| Content | Front CMS, Certificate |
| Insights | Reports |
| System | Setup / Settings |

### 3.2 Patient portal shell (`apps/patient`)
Consumer-grade, lighter, mobile-first. Top nav + simple sections: **Home** (next appointment,
alerts) · **Appointments** (book / upcoming / history) · **Records** (OPD/IPD visits,
prescriptions) · **Reports** (pathology/radiology downloads) · **Billing** (invoices, pay) ·
**Live Consultation** (join) · **Messages** · **Profile**. Warmer, more spacious than admin.

---

## 4. Core Screen Templates

The whole app is assembled from five reusable templates. Build them once, configure per module.

### 4.1 List template (the workhorse — used by ~25 modules)
Anatomy, top → bottom:
- **Page header**: title + count · primary action(s) (e.g. "Add Patient", "Import"), permission-gated.
- **Tabs** (where the FRD specifies): e.g. Appointment = Today / Upcoming / Old; OPD = Today/
  Upcoming/Old/Patient View.
- **Toolbar**: search box · filters (role/date/type/branch as applicable) · export cluster
  (Copy · Excel · CSV · PDF · Print) · page-size selector incl. "All".
- **DataTable**: sticky header, sortable columns, zebra rows, tabular numerics for money,
  status badges, row-hover action cluster (View / Edit / Delete icons), checkbox column for
  bulk (Delete Selected). Empty / loading (skeleton) / error states are first-class.
- **Pagination** footer.
> This directly encodes the FRD's cross-cutting observation (§2.29). One `<ResourceList>` +
> column config per module.

### 4.2 Modal form template (every "Add"/"Edit")
- Right-side **drawer** for long forms (Patient, Appointment, IPD, Staff), centered **dialog**
  for short ones (Add Task, Change Password, catalog items).
- Sectioned fields on a responsive grid; **required = red asterisk** with client-side validation
  mirroring the server Zod schema; inline errors under fields.
- Sticky footer actions: `Save`, `Save & Print` (where FRD lists it), `Cancel`. Disable Save
  until valid; show a spinner + prevent double-submit on money/billing forms.
- **Custom fields** render dynamically per entity (typed inputs) respecting visibility flags.

### 4.3 Detail / record template
Header band (identity + key facts + quick actions) → **sub-tabs** → content. Used by:
- **Staff Profile** (§FRD): Profile / Payroll / Leaves / Attendance / Documents / Timeline, plus
  the "Staff switcher" side panel to jump between staff.
- **Patient / Case view**: demographics header + tabs for Appointments / OPD / IPD / Bills /
  Reports (the Case ID ties them together).

### 4.4 Dashboard template
Card grid of KPIs + charts + shortcuts. Per-role content driven by permissions. Multi-Branch
overview uses the same template with per-branch KPI tables + a duration filter.

### 4.5 Billing template
Charge-line editor: pick charge(s) → Standard/Applied charge, Discount %, Tax %, computed Amount,
running totals (Net / Paid / Balance), payment mode, `Save` / `Save & Print`. Shared by OPD, IPD,
Pharmacy, Pathology, Radiology, Blood, Ambulance (all consume the same Charge/Invoice engine).

### 4.6 Special interaction: Bed Status overlay
Full-screen modal grouped Floor → Ward/Bed Group; one tile per bed. Green + bed number = free,
pink + patient name = allotted. Click-through to the bed/patient record. Live from `bed.status`.

---

## 5. Shared Components Inventory
`<AppShell>` · `<Sidebar>` (permission-aware) · `<HeaderBar>` (+ each utility popover) ·
`<ResourceList>` / `<DataTable>` · `<ExportMenu>` · `<FilterBar>` · `<Tabs>` · `<FormDrawer>` /
`<FormDialog>` · `<Field>` set (Text, Textarea, Select, SearchableSelect, DatePicker, FileUpload
drag-drop, Checkbox, NumberWithCompute) · `<CustomFieldRenderer>` · `<StatusBadge>` ·
`<MoneyCell>` · `<ConfirmDialog>` · `<ChargeLineEditor>` · `<BedGrid>` · `<KpiCard>` · `<Chart>` ·
`<PrintPreview>` · `<NotificationFeed>` · `<ChatPanel>` · `<Toast>`.

---

## 6. Responsive Strategy
Breakpoints: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`.
- **Admin** is desktop-first (primary use is workstations). ≥`lg`: full sidebar + multi-column
  tables. `md`: sidebar collapses to icons, tables horizontally scroll with pinned first column.
  `< md`: sidebar → drawer, tables → stacked "cards" for the most-used lists; complex modals go
  full-screen. QR Attendance is a device/kiosk view (camera-first, large scan target).
- **Patient portal** is mobile-first: single column, bottom tab bar on small screens, generous
  touch targets (≥44px).
- **RTL**: full mirroring for Arabic via logical CSS properties + `dir="rtl"`.

---

## 7. Permission-Aware UI Rules
- Sidebar renders only modules in the role's ability (§PERMISSION_MATRIX §2).
- Add/Edit/Delete/Export buttons and bulk actions are hidden (not just disabled) when the
  action isn't granted; row action cluster adapts per row.
- Unauthorized columns (e.g. cost/margin) are dropped from the table config.
- UI gating is **UX only**; the API guard is the real boundary — never trust the client.
- Patient portal is hard-scoped to the signed-in patient's own records.

---

## 8. Accessibility (WCAG 2.1 AA)
- Semantic HTML + ARIA on custom widgets (menus, dialogs, tabs, tables via Radix/shadcn = mostly
  handled). Full keyboard operability incl. table row actions and modal focus-trap/restore.
- Contrast ≥ 4.5:1 text / 3:1 large; verified against tokens in both themes.
- Never color-only status (§2.1). Visible focus rings. Respect `prefers-reduced-motion`.
- Form fields programmatically labeled; errors announced via `aria-live`; required conveyed
  beyond the asterisk (`aria-required`).
- Localized number/date/currency formatting per active language.

---

## 9. Frontend Build Sequence (maps to plan phases)
1. **Tokens + theme + Tailwind/shadcn setup** → `packages/ui` primitives.
2. **AppShell + Sidebar + HeaderBar** (permission-aware) — Phase 0.
3. **ResourceList + FormDrawer/Dialog + Field set + ExportMenu** — Phase 0/1 (unlocks ~25 screens).
4. **ChargeLineEditor + PrintPreview** — Phase 2 (billing).
5. **Detail template + sub-tabs (Patient/Case, Staff Profile)** — Phase 1/6.
6. **BedGrid, Dashboard/KPI, Chart** — Phases 3 / 8.
7. **Patient portal shell + screens** — Phase 8b.
> Deliver a Storybook/component gallery so screens are assembled from reviewed, tokenized parts.
```
