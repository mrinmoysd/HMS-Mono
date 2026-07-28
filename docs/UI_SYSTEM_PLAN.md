# UI System Rebuild — Plan

Rebuild the `apps/web` presentation layer on a **new, original design language** that is
deliberately *not* a Smart Hospital look-alike, while preserving **100% of the functionality**
built from the complete screenshot sets across all 12 modules.

Supersedes the token/component sections of `FRONTEND_DESIGN.md` (§2, §4). Information
architecture, permission rules and screen templates in that doc still apply.

**Two hard constraints**
1. **Nothing breaks.** Every feature verified during module parity work must still work,
   look correct, and pass the same browser checks.
2. **Distinct identity.** The result must not read as a re-skin of the Smart Hospital demo.

---

## 1. Where we are today

### 1.1 Tokens (`globals.css`, `tailwind.config.ts`)
13 colour variables, 3 radii, one font family. That is the entire system. There is **no**
spacing scale, type scale, shadow scale, z-index scale, motion scale, focus-ring token, or
density control. Every layout decision is an ad-hoc Tailwind utility.

One genuinely good property: a repo-wide grep finds **0** uses of the raw Tailwind palette
(`bg-blue-500` etc.). Colour already flows through tokens, so a re-theme is mostly safe.

### 1.2 Primitives (`components/ui/`, 11 files, 735 LOC)
| Primitive | Files importing | Notes |
|---|---:|---|
| Button | 102 | 4 variants, 2 sizes |
| Field / TextInput / TextArea / Select | 93 | No error/help/disabled states wired |
| FormDrawer | 56 | Right-side drawer, `wide` flag |
| DataTable | 46 | No sorting, no column chooser, no row expand |
| ExportMenu | 29 | Copy/Excel/CSV/PDF/Print |
| Tabs | 26 | |
| StatusPill | 6 | |
| RichText, Barcode, Menu, DurationSelect | 1–3 | |

### 1.3 Duplication debt
- **51 hand-rolled modals.** Every module re-implements the same overlay markup
  (`fixed inset-0 z-50 … bg-black/40` + coloured header + footer). No focus trap, no
  Escape handling, no scroll lock, no `aria-modal` consistency.
- **34 `confirm()` calls** for destructive actions — blocking, unstyled, unbrandable.
- **34 hard-coded hex** + **29 arbitrary `[13px]`-style values**.
- **No toast/notification system** — mutations succeed silently.

### 1.4 App shell
`sidebar.tsx` (72 LOC) is a flat text list: no icons, no collapse, no sub-navigation. Because
of that, Duty Roster, Inventory, Referral, Messaging, TPA and Finance all fake sub-navigation
with in-page view switches — a workaround the new shell should make unnecessary.

---

## 2. Design language — "Meridian"

> **Chosen: the Slate palette at compact density.** Those are the CSS defaults in
> `globals.css`, so they apply with no JS. Meridian and Plum remain available via
> `data-theme`, and users can switch palette, density and light/dark from the
> header's appearance menu (persisted to `localStorage`). The table below
> describes the system's direction; Slate is its enterprise-leaning expression.

Chosen to be unmistakably distinct from the Smart Hospital demo (teal + dark boxed
bootstrap-admin) *and* from the current generic-blue build.

| Axis | Smart Hospital demo | Meridian (new) |
|---|---|---|
| Palette | Teal primary, saturated | Indigo-violet primary, **warm** neutral canvas |
| Surfaces | Hard 1px borders, boxed panels with filled header bars | Layered surfaces, soft low-opacity shadows, hairline borders |
| Radius | 2–4px | 10px controls / 14px cards / 20px sheets |
| Table headers | ALL-CAPS, grey fill | Sentence case, sunken surface, quiet |
| Density | Fixed tight | **Comfortable default + compact toggle** (clinical users scan) |
| Navigation | Dark boxed sidebar, flat | Icon rail → expandable panel, real sub-nav, collapsible |
| Motion | None | 120–240ms, purposeful only |

### 2.1 Colour roles (semantic, not raw)
```
--canvas                 app background (warm neutral, not blue-grey)
--surface-1 / -2 / -3    card / raised+popover / overlay
--surface-sunken         table headers, wells, inset panels
--line / --line-strong   hairline / emphasized divider
--fg / --fg-muted / --fg-subtle
--primary / -hover / -active / -soft / -fg
--accent  / -soft / -fg
--success | --warning | --danger | --info   (each + -soft + -fg)
--focus                  focus ring
--occupied               bed overlay (kept from FRD)
```
Every status colour keeps a `-soft` tinted-background companion so pills, banners and row
highlights stop inventing `/10` opacities inline.

**Compatibility:** the 13 existing variable names (`--primary`, `--bg`, `--surface`,
`--border`, `--fg`, `--fg-muted`, `--success`, `--danger`, `--warning`, `--occupied`,
`--info`, `--accent`, `--primary-fg`) are **retained as aliases** onto the new roles. That is
what makes a re-theme non-breaking across 108 components.

### 2.2 Other scales
- **Spacing** — 4px base, `0.5 … 20` (2px–80px).
- **Radius** — `xs 4 / sm 6 / md 10 / lg 14 / xl 20 / full`.
- **Type** — `2xs 11 / xs 12 / sm 13 / base 14 / md 15 / lg 17 / xl 20 / 2xl 24 / 3xl 30`,
  each with paired line-height and weight. Tabular figures retained for money/qty
  (`.tabular` class **must not be removed** — it is used across every billing surface).
- **Shadow** — `xs/sm/md/lg/xl`, layered and low-opacity (no hard drop shadows).
- **Z-index** — `sticky 10 / dropdown 40 / overlay 50 / modal 60 / popover 70 / toast 80`.
  Replaces today's uniform `z-50`, which is why nested popovers currently clip.
- **Motion** — `fast 120 / base 180 / slow 240`, standard + emphasized easing;
  respects `prefers-reduced-motion`.
- **Density** — `--row-h`, `--field-h`, `--pad-x` swap on a `[data-density]` root attribute.

---

## 3. Primitive library (target: ~24)

### 3.1 Rewritten, API-compatible (internals only)
`Button` · `Field` / `TextInput` / `TextArea` / `Select` · `FormDrawer` · `DataTable` ·
`Tabs` · `StatusPill` · `Menu` · `ExportMenu` · `RichText` · `Barcode` · `DurationSelect`

Existing props keep their meaning and their defaults. New capability arrives as **optional**
props only — e.g. `DataTable` gains `sortable`, `columns[].sortable`, `columnChooser`,
`expandable`, `density`, `stickyHeader`, none of which are required by the 46 current callers.

### 3.2 New primitives
| Primitive | Replaces / enables |
|---|---|
| **Modal** (sm/md/lg/xl/full) | the 51 hand-rolled overlays; focus trap, Escape, scroll lock, `aria-modal` |
| **ConfirmDialog** | the 34 `confirm()` calls; typed intent + danger styling |
| **Toast / Toaster** | silent mutations — success, error, undo |
| **Card** (+ Header/Body/Footer) | the ad-hoc `rounded-md border bg-surface` triplet |
| **PageHeader** | title + breadcrumb + action cluster, consistent across 48 pages |
| **Checkbox / Radio / Switch** | raw `<input type=checkbox>` everywhere |
| **SegmentedControl** | the Group/Individual + card/list toggles |
| **Badge** | inline chips (role chips, module tags) |
| **Combobox** (searchable select) | PatientSelect / StaffSelect one-offs |
| **DatePicker / DateRangePicker** | native `<input type=date>` inconsistency |
| **FileDrop** | the 6 hand-rolled base64 "Drop a file here or click" blocks |
| **Tooltip** | icon-only action buttons (currently `title=` only) |
| **EmptyState** | inconsistent "No records found" strings |
| **Skeleton** | today every list just says "Loading…" |
| **Pagination** | extracted from DataTable, reusable |
| **DescriptionList (KV)** | header/detail cards (TPA, Patient 360, Payslip) |
| **StatCard** | dashboard + Multi Branch KPIs |
| **Avatar** | staff/patient identity |
| **Breadcrumb** | deep routes (`setup/*`, `tpa/[id]`) |
| **Drawer** | generalized FormDrawer (any side) |

### 3.3 Feature-parity checklist the primitives must satisfy
Drawn from the complete screenshot sets — every one of these already exists in the app and
must survive the rebuild:

- Table toolbar: entries-per-page, quick search, **Copy/Excel/CSV/PDF/Print** cluster,
  sortable headers, `Records: 1 to N of M`, pagination
- Row action clusters of 2–5 icon buttons; row action **dropdown** menus
- In-cell action buttons (e.g. *Click To Return*) and status pills (Paid / Returned /
  Generated / Not Generated)
- Checkbox column with select-all (patient credentials, medicine bulk delete)
- Tabs for module sub-views; card **and** list view toggles (Staff Directory)
- Modal forms: small, wide, two-column, and multi-section variants
- Right-side drawers; rich-text editors; document upload; date + time pickers
- Searchable patient/staff selects with phone/ID matching
- Card grids (Setup landing), KPI cards + donut charts (Dashboard, Multi Branch)
- Branded print documents, Code39 barcodes, bed-status grid, calendar, clinical timeline

---

## 4. Phases

| Phase | Deliverable | Risk |
|---|---|---|
| **U0** ✅ | Token foundation — full scales in `globals.css` + `tailwind.config.ts`, legacy aliases, light/dark, density attribute | Low (additive) |
| **U1** ✅ | Primitive library — rewrites + new primitives, plus a live `/design-system` route rendering every primitive and state | Low (additive) |
| **U2** ✅ | App shell — icon sidebar w/ sub-nav + collapse, header bar, theme + density toggles | Medium |
| **U3** ✅ | **Pilot**: 3 pages, one per archetype — Patient (list), Patient 360 (detail/tabs), Blood Bank (modal-heavy) | Medium — decision point |
| **U4** | Rollout in 5 archetype batches, browser-verified per batch | Medium |
| **U5** | Debt sweep — 51 modals → `Modal`, 34 `confirm()` → `ConfirmDialog`, hex/arbitrary values → tokens, add toasts | Medium |
| **U6** | QA — a11y (contrast, focus, keyboard), responsive, dark mode, print regression, full 12-module pass | — |

**U3 is the gate.** After the pilot you see the real thing on real data and can redirect
before 45 more pages move.

### 4.1 Rollout batches (U4)
1. **Lists** — patient, appointment, opd, ipd, billing, pharmacy, pathology, radiology
2. **Modal-heavy** — blood_bank, ambulance, birth_death, inventory, tpa
3. **Split-view** — finance, referral, messaging, duty_roster, human_resource
4. **Setup** — 12 `setup/*` pages (highest repetition, lowest risk)
5. **Dashboards** — dashboard, multi_branch, reports, qr_attendance, calendar, front_office,
   certificate, front_cms, live_consultation, download_center

---

## 5. Not breaking things

1. **Additive-only tokens.** Old variable names alias onto new roles; nothing that reads
   `bg-surface` or `text-fg-muted` changes meaning.
2. **Frozen public APIs.** Button/Field/DataTable/FormDrawer prop contracts are unchanged;
   new features are optional props. Enforced by `tsc --noEmit` after every phase.
3. **Pure-CSS first.** U0 changes appearance without touching a single `.tsx`.
4. **One batch at a time**, each ending in a browser pass on the same flows verified during
   parity work.
5. **Preserve the verified DOM contracts** — `.tabular`, print helpers in `lib/print.ts`
   (separate document, unaffected by app CSS), RichText prose classes, Code39 rendering.
6. **`confirm()` → `ConfirmDialog` is a control-flow change** (sync → async) — migrated
   deliberately per call site, not mechanically.
7. **Rollback unit = phase.** Each phase is an isolated commit.

### 5.1 Traps found while building U0/U1 — keep these
- **Tailwind tree-shakes class selectors written inside its `@layer` directives.**
  `:root.dark { … }` inside `@layer base` was silently dropped from the build because
  the literal string `"dark"` appears in no source file (the toggle sets it at runtime).
  `[data-theme]` / `[data-density]` attribute selectors survived, which made the bug look
  theme-specific rather than layer-specific. **Token blocks stay unlayered.**
- **Colours must remain `R G B` channel triplets.** A hex value kills every `/10` alpha
  variant app-wide, silently.
- **Inputs size by padding (`.py-control`), not `.h-control`.** twMerge does not know that
  custom height utilities conflict, so an explicit `h-8` from a caller (the compact inline
  selects in `purchase-medicine-form` / `diagnostic-bill-form`) would fight a `h-*` class
  unpredictably. Padding-derived height lets an explicit height win.
- **Dark mode had never actually worked** — the old `.dark` block existed but nothing ever
  set the class. It works now, for free.
- **Modal focus must move via a ref callback, not an effect.** `mounted` starts false, so
  the panel does not exist on the first commit after `open` flips — an effect keyed on
  `open` alone runs while `panelRef` is null and silently skips the focus trap for every
  caller that guards with `if (!open) return null` (i.e. most of them). Adding `mounted` to
  the deps fixes the focus but makes the deps array change length. A ref callback fires
  exactly when the node appears and keeps the deps constant.
- **Never migrate a modal by slicing from the `if (!open)` guard.** In these components the
  guard sits *above* the handlers, so a scripted slice from the guard to the body `<div>`
  silently deletes `submit()`, derived values and delete handlers. Two files were damaged
  this way and recovered from the session transcript (there are no git commits yet).
  Do these migrations as explicit, reviewed edits.

> **Repo has no commits.** `git log` is empty, so there is no `git checkout --` safety net
> for a bad edit. Committing each phase (§5.7) is what makes the rollback story real.

---

## 6. Out of scope
`apps/patient` portal, backend/API, new features, new modules, i18n/RTL implementation
(tokens will be RTL-ready; the sweep is separate).
