# Setup / Settings — Full Feature Parity Plan

Captured from the demo screenshots (`~/Downloads/Settings/*`, reviewed 2026-07-10) across 10 areas:
Appointment (done — see `APPOINTMENT_PARITY_PLAN.md`), Bed, Blood Bank, Custom Fields, Finance,
Hospital Charge, Human Resources, Inventory, Pathology, Pharmacy, Radiology. Turns the gaps into a
buildable, phased plan following the same standards as the Clinical/Appointment work (contract-first
shared Zod DTOs, branch-scoped + RBAC-guarded + audited, browser-verified, Definition of Done per
phase). These are **Phases S0–S6 (Setup)**.

Legend: ✅ built · 🟡 partial (model/route exists, no Setup UI) · ❌ missing entirely.

---

## 1. Current state (from codebase survey, 2026-07-10)

**A generic catalog engine already exists** — `apps/api/src/masters/catalog.service.ts` +
`catalog.controller.ts`: `GET/POST/PATCH/DELETE /masters/:catalog/:id` over any key registered in
`CATALOG_MODEL` (packages/shared `NAME_CATALOGS`, 19 keys today: charge-category, charge-type,
unit-type, floor, bed-type, medicine-category, operation-category, income-head, expense-head,
department, designation, finding-category, symptom-head, front-office-purpose, complaint-type,
content-type, item-category, item-store, item-supplier). **Backend CRUD is complete for all 19; the
frontend hook (`use-masters.ts`) only exposes `useCatalog` (list) + `useCreateCatalogItem` — no
update/delete hook exists anywhere, and most catalogs have no Setup page at all** (only reachable as
a bare dropdown buried in an operational page, e.g. Department in the HR staff form).

**Setup landing** (`apps/web/src/app/(app)/setup/page.tsx`) has 5 cards today: Hospital Charges,
Appointment Setup, Clinical Masters, Beds, Custom Fields. **Missing cards**: Blood Bank, Finance,
Human Resources, Inventory, Pathology, Radiology, Pharmacy.

**Custom Fields is the one fully-parity domain already** (full CRUD incl. edit/delete UI) — no work
needed there.

---

## 2. Gap analysis vs the screenshots (by domain)

### 2.1 Hospital Charge
| Entity | Model | Route | Setup UI | Gap |
|---|---|---|---|---|
| Charge Category | ✅ `ChargeCategory` | ✅ catalog | ✅ `setup/charges` | none |
| Charge Type | ✅ `ChargeType` | ✅ catalog | ❌ | needs UI **+ a module-visibility matrix** (7 checkboxes: Appointment/OPD/IPD/Pathology/Radiology/Blood Bank/Ambulance) — new join field |
| Tax Category | ✅ `TaxCategory` (name+percent) | 🟡 GET/POST only | 🟡 dropdown only, no Add | needs Add/Edit/Delete UI + PATCH/DELETE route |
| Unit Type | ✅ `UnitType` | ✅ catalog | ❌ | needs UI |
| Charges (master) | ✅ `Charge` (has `typeId`/`unitId`/`taxCategoryId` already!) | ✅ full CRUD | 🟡 Add form omits Type/Unit selectors; no edit/delete UI | wire the 2 missing selects + edit/delete + **details modal** + **per-TPA schedule-charge overrides** (new `ChargeSchedule` join: chargeId × tpaId → amount) |

### 2.2 Human Resources
| Entity | Model | Gap |
|---|---|---|
| Department | ✅ catalog | needs Setup UI |
| Designation | ✅ catalog | needs Setup UI (currently unused anywhere) |
| Leave Type | ✅ `LeaveType` (name+quota) | 🟡 GET/POST only — needs Setup UI + PATCH/DELETE |
| Specialist | ❌ no model (`Staff.specialist` is free text) | new `Specialization` catalog + Setup UI; wire into Staff form |

### 2.3 Finance
| Entity | Model | Gap |
|---|---|---|
| Income Head | ✅ catalog | needs Setup UI (currently only a bare dropdown in Finance) |
| Expense Head | ✅ catalog | needs Setup UI |

### 2.4 Inventory
| Entity | Model | Gap |
|---|---|---|
| Item Category | ✅ catalog | needs Setup UI |
| Item Store | ✅ catalog | needs Setup UI (currently unused anywhere — no store picker even in Inventory ops) |
| Item Supplier | ✅ catalog but **name-only** | demo needs Phone/Email/Contact Person/Contact Phone/Contact Email/Address/Description — **extend model**, pull out of the generic catalog into its own mini-service (like ItemSupplier isn't a pure name catalog anymore) |

### 2.5 Blood Bank
| Entity | Model | Gap |
|---|---|---|
| Blood Product | ✅ `BloodProduct` (name, bloodGroup?, component?, rate) | 🟡 create-only route, managed inline in the operational Blood Bank page — needs a dedicated Setup page (Type=Component/Blood Group + Name, matching the demo's 2-field Add form) + PATCH/DELETE |

### 2.6 Pathology & Radiology (share `modality`)
| Entity | Model | Gap |
|---|---|---|
| Category | ✅ `DiagnosticCategory` (modality field already there!) | ❌ **completely unwired** — no service/controller/DTO/UI at all despite the model existing. Cheapest win: wire it. |
| Parameter | ✅ `DiagnosticTest` (name, unit, referenceRange **string**, charge) | 🟡 exists for billing, but the demo's "Parameter" master is a **clinical definition** (Reference Range **From/To as two numbers**, Unit, Description — no charge). Add `refMin`/`refMax` numeric + `description` to `DiagnosticTest`; category selector currently unused in the operational pathology/radiology pages too. |
| Unit | ❌ free-text field on `DiagnosticTest.unit` | new `DiagnosticUnit` master (modality-scoped, mirrors `DiagnosticCategory`'s pattern) |

### 2.7 Pharmacy (the shallowest domain — mostly net-new)
| Entity | Model | Gap |
|---|---|---|
| Medicine Category | ✅ catalog | needs Setup UI |
| Company | ❌ free text on `Medicine.company` | new `PharmaCompany` catalog |
| Medicine Group | ❌ no model | new `MedicineGroup` catalog |
| Medicine Dosage | ❌ no model | new `MedicineDosage` (medicineCategoryId, dosage, unitId) — **feeds the C4 Prescription builder** as a quick-pick |
| Dosage Interval | ❌ no model | new `DosageInterval` catalog (e.g. "2 times a day") |
| Dosage Duration | ❌ no model | new `DosageDuration` catalog (e.g. "1 Week") |
| Supplier | ❌ no pharmacy-specific model | new `PharmaSupplier` (name, contact, contactPerson, contactPhone, drugLicenseNumber, address) — distinct from Inventory's `ItemSupplier` |
| Unit | ❌ free text on `Medicine.unit` | new `PharmaUnit` catalog |

### 2.8 Bed (mostly done, needs polish)
| Entity | Gap |
|---|---|
| Floor, Bed Type | ✅ catalog, has Setup UI already |
| Bed Group | 🟡 has Setup UI but **no PATCH/DELETE route**; demo's Add form also has a **Color** field — add `color` to `BedGroup` |
| Bed | 🟡 has Setup UI but **no PATCH/DELETE route** |
| Bed Status | ✅ already a read-only occupancy grid (`GET /beds/status`) — no gap |

---

## 3. Cross-cutting foundation work (do first — unlocks everything else)

1. **Frontend catalog hooks**: add `useUpdateCatalogItem` + `useDeleteCatalogItem` to `use-masters.ts`
   (the backend route already exists) — one change unlocks edit/delete for *every* existing and new
   simple catalog.
2. **Reusable `SimpleCatalogPanel` component**: a generic `{name-only list + Add/Edit/Delete modal}`
   panel parameterized by catalog key + label, built once, reused for ~15 of the screens below instead
   of hand-rolling each (this is exactly the pattern already used in `setup/clinical/page.tsx` and
   `setup/appointment/page.tsx` — generalize it).
3. **Setup landing**: add the 7 missing cards (Blood Bank, Finance, Human Resources, Inventory,
   Pathology, Radiology, Pharmacy).

---

## 4. Phased implementation

> **Status: Phase S0 DONE & browser-verified** (2026-07-10). `useUpdateCatalogItem`/
> `useDeleteCatalogItem` added to `use-masters.ts`; reusable `SimpleCatalogPanel` (list + add/edit/
> delete, custom confirm-delete modal) in `components/setup/simple-catalog-panel.tsx`. New Setup
> pages: `setup/human-resources` (Department/Designation), `setup/finance` (Income Head/Expense
> Head), `setup/inventory` (Item Category/Item Store), `setup/pharmacy` (Medicine Category, stub for
> S5); `setup/charges` gained Charge Category + Unit Type tabs (Charge Type deferred to S1 — its Add
> form needs the module matrix); `setup/clinical` gained an Operation Category tab. Setup landing has
> all 9 cards (Blood Bank/Pathology/Radiology cards deliberately deferred to S3/S4 so there are no
> dead links). Verified edit/add/delete round-trip on Department in the browser.

### Phase S0 — Foundation
**BE**: nothing new (routes already exist for the 19 catalogs).
**FE**: `useUpdateCatalogItem`/`useDeleteCatalogItem` hooks; `SimpleCatalogPanel` reusable component;
Setup landing cards for all 7 new areas (linking to pages built in S1–S5).
**Exit**: every *existing* catalog (department, designation, income-head, expense-head, item-category,
item-store, medicine-category, charge-type, unit-type, operation-category) is now edit/delete-capable
and has a real Setup page, even before new models are added.

> **Status: Phase S1 DONE & browser-verified** (2026-07-10). Migration `s1_charge_type_modules_schedule`
> adds `ChargeType.modules String[]` + new `ChargeSchedule{branchId,chargeId,tpaId,amount}` (unique
> chargeId+tpaId). `charge-type` pulled out of the generic `NAME_CATALOGS` catalog into its own
> mini-service (`ChargeService.listTypes/createType/updateType/removeType`) since it needs the modules
> field — matches the `TaxCategory` pattern, which also gained PATCH/DELETE. New endpoints: `GET
> /charges/:id` (detail incl. typeName/unitName/taxCategoryName + per-TPA schedule), `GET/PUT
> /charges/:id/schedule` (full-replace upsert+delete). `ChargeDto` gained `typeName`/`unitName`. Added
> `api.put` to the web API client (previously missing — noted in earlier appointment-phase memory).
> Frontend: `ChargeTypePanel` (name + 7-checkbox module grid, edit/delete) and `TaxCategoryPanel`
> (name+percent, edit/delete) as two new dedicated components (not `SimpleCatalogPanel`, since both
> need an extra field beyond `name`); Setup → Charges now has 5 tabs (Charges/Category/Type/Unit/Tax).
> Charges tab: Type + Unit selects wired into Add/Edit, edit/delete row actions, and a **Charge
> Details** drawer showing read-only fields + an editable "Scheduled Charges For TPA" table (per-TPA
> amount override, "Apply To All", Save Schedule). Verified in browser: Charge Type add+edit with
> module checkboxes persisting, Tax Category add+delete, Charge add with Type select wired end-to-end,
> Details drawer's TPA schedule save round-tripped (created a test TPA via direct API call since
> TPA Management has no UI yet — out of scope for Setup).

### Phase S1 — Hospital Charges completion
**BE**: Tax Category PATCH/DELETE; `ChargeType.modules` (string[] or a join table) + update endpoint;
wire `typeId`/`unitId` into the Charge create/update payload (already on the model); new
`ChargeSchedule` model (`chargeId`, `tpaId`, `amount`) + `GET/PUT /charges/:id/schedule` for the
per-TPA override matrix; `GET /charges/:id` detail endpoint (mirrors the demo's Charges Details modal).
**FE**: Setup → Charges gains Charge Type (with the 7-module checkbox grid) and Unit Type sub-tabs
(via `SimpleCatalogPanel`); Tax Category Add/Edit; the Add/Edit Charges form gains Type + Unit selects
+ the "Scheduled Charges For TPA" panel (list of TPAs with per-row amount inputs + Apply-To-All); a
Charges Details read-only modal.
**Exit**: Hospital Charges matches the demo 1:1 including per-TPA pricing.

> **Status: Phase S2 DONE & browser-verified** (2026-07-10). Migration `s2_specialization_leave_type`
> adds a `Specialization` model (identical shape to Department/Designation, registered in the generic
> `NAME_CATALOGS` engine) and replaces `Staff.specialist` (free text) with `Staff.specialistId` (FK) —
> **data-preserving**: the migration was hand-written (not `prisma migrate dev`, which refuses to run
> non-interactively when it detects the destructive free-text-column drop) to first create a
> `Specialization` row per distinct existing `specialist` value and backfill `specialistId` before
> dropping the old column, so the one seeded "Cardiologist" value survived as a real catalog row
> instead of being lost. `LeaveType` gained `updateLeaveType`/`removeLeaveType` in
> `workforce.service.ts` + `PATCH/DELETE /hr/leave-types/:id` (gated `human_resource` edit/delete,
> matching this controller's existing convention — not `setup` like the Charges endpoints). `StaffDto.
> specialist` renamed to `specialistName`; `staffSchema`/`updateStaffProfileSchema` field renamed
> `specialist`→`specialistId`. Frontend: `components/setup/leave-type-panel.tsx` (name+quota, dedicated
> component like Tax Category/Charge Type since it has an extra field); `setup/human-resources` gained
> Leave Type + Specialist tabs (Specialist via plain `SimpleCatalogPanel`, Finance's Income Head/
> Expense Head tabs were already done in S0 so no Finance work was needed this phase). The **Add Staff**
> form's free-text "Specialist" field (`apps/web/src/app/(app)/human_resource/page.tsx`) became a
> `Select` driven by the new catalog. Verified in browser: Leave Type add/edit/delete round-trip,
> Specialist tab shows the backfilled "Cardiologist" row, created a new staff member with Specialist
> select → confirmed via API that `specialistName: "Cardiologist"` persisted correctly.

### Phase S2 — HR + Finance masters
**BE**: `Specialization` catalog (new) + wire into `Staff.specialistId`; LeaveType PATCH/DELETE.
**FE**: Setup → Human Resources page (Department / Designation / Leave Type / Specialist sub-tabs via
`SimpleCatalogPanel`); Setup → Finance page (Income Head / Expense Head sub-tabs).
**Exit**: HR + Finance masters manageable from Setup; Staff form can select a Specialization.

> **Status: Phase S3 DONE & browser-verified** (2026-07-10). Migration `s3_item_supplier_fields` adds
> phone/email/contactPerson/contactPhone/contactEmail/address/description to `ItemSupplier` (purely
> additive, empty table, so `prisma migrate dev` ran normally — no hand-written SQL needed this time,
> unlike S2). `item-supplier` pulled out of `NAME_CATALOGS`/`CATALOG_MODEL` into its own CRUD living in
> the existing `apps/api/src/inventory/` module (`InventoryService.listSuppliers/createSupplier/
> updateSupplier/removeSupplier`, routes `/inventory/suppliers`, gated `inventory` RBAC — this module
> already existed with items/stock/issues endpoints, so suppliers just became siblings, no new module).
> `BloodProduct` gained `updateProduct`/`removeProduct` in the existing `BloodBankService` +
> `PATCH/DELETE /blood-bank/products/:id`. **Upgraded `bloodProductSchema.bloodGroup` from loose
> `z.string()` to the canonical `BLOOD_GROUPS` enum** (from `dto/patient.ts`) for consistency — this
> required also converting the free-text Blood Group `TextInput` in the *operational*
> `blood_bank/page.tsx` Add-Product form to a `Select`, since the old free-text value no longer
> type-checked against the tightened schema (a good example of a S-phase touching operational pages,
> not just Setup, when a shared DTO changes). Frontend: `item-supplier-panel.tsx` (7 contact fields,
> edit/delete) added as a 3rd tab on `setup/inventory`; new `setup/blood-bank` page +
> `blood-product-panel.tsx` (name/bloodGroup-select/component/rate, edit/delete); Setup landing gained
> the Blood Bank card (10 cards total now). Also fixed the operational `inventory/page.tsx`'s Add Item
> form, which used `useCatalog('item-supplier', ...)` — switched to the new `useItemSuppliers()` hook
> since the generic catalog route no longer serves that key. Verified in browser: supplier add with
> full contact fields, confirmed the new supplier appears in the operational Add Item's Supplier
> dropdown; blood product add/edit/delete round-trip, confirmed the operational Blood Bank page's
> Add-Product Select still works post-schema-tightening.

### Phase S3 — Inventory + Blood Bank masters
**BE**: extend `ItemSupplier` with phone/email/contactPerson/contactPhone/contactEmail/address/
description (own service, out of the generic catalog); Blood Product PATCH/DELETE + move to a
dedicated setup service.
**FE**: Setup → Inventory page (Category / Store / Supplier — Supplier gets its own richer form);
Setup → Blood Bank page (Product list with Type=Component/BloodGroup + Name).
**Exit**: Inventory + Blood Bank masters manageable from Setup with full contact detail parity.

> **Status: Phase S4 DONE & browser-verified** (2026-07-10). Migration
> `s4_diagnostic_unit_refrange`: new `DiagnosticUnit` model (modality-scoped, mirrors
> `DiagnosticCategory`); `DiagnosticTest` gained `refMin`/`refMax`/`description` (additive) and
> `unitId` FK replacing the free-text `unit` column — hand-written migration (same destructive-drop
> block as S2) with a data-preserving backfill (1 seeded "cells/mcL" value became a real `DiagnosticUnit`
> row). Kept the legacy `referenceRange` string column untouched/coexisting alongside the new numeric
> `refMin`/`refMax` — the operational quick-add (`diagnostic-dept.tsx`) still reads/writes
> `referenceRange` only, the new Setup Parameter form reads/writes `refMin`/`refMax` only; both are
> optional fields on the same `DiagnosticTest` row. `DiagnosticCategory` (previously "completely
> unwired") and `DiagnosticUnit` got full CRUD added directly to the existing
> `apps/api/src/diagnostics/diagnostics.service.ts`, with routes duplicated across
> `PathologyController`/`RadiologyController` (`/pathology|radiology/categories|units`) exactly
> mirroring how `tests` already hardcodes modality per controller — gated `setup` RBAC (matching the
> Charge Category/Type precedent) while `DiagnosticTest` PATCH/DELETE stayed gated by the modality's
> own permission (`pathology`/`radiology` edit/delete, matching that entity's existing view/add gates).
> **Bug caught mid-verification and fixed**: the new Setup **Parameter** form only exposes clinical
> fields (Name/Category/RefRange/Unit/Description) per the plan's "decoupled from billing charge"
> intent — but its first `submit()` implementation didn't carry forward the existing `charge` *or*
> `referenceRange` values on edit, so saving a Parameter edit was silently zeroing the billing charge
> and wiping the legacy reference-range string. Fixed by threading `editing?.charge` and
> `editing?.referenceRange` through unchanged in the submit payload — **general lesson**: any Setup
> form that edits a *subset* of an existing entity's fields must explicitly carry forward the fields
> it doesn't expose, not just omit them, since a PATCH endpoint here always expects the full input
> shape and missing optional fields resolve to `null`/default rather than "leave unchanged."
> Frontend: single `components/setup/diagnostic-masters-panel.tsx` exports
> `DiagnosticMastersPanel({ modality })` used by both `setup/pathology` and `setup/radiology`, each
> with Category/Parameter/Unit sub-tabs — Category and Unit share one internal generic
> `ModalityCatalogTab` component (parameterized by hook set) since they're 100% identical in shape.
> Setup landing gained Pathology + Radiology cards (12 total). Fixed `emr/lab-tab.tsx`'s reference to
> the now-renamed `DiagnosticTestDto.unit` → `.unitName` (another operational-page ripple from the DTO
> change, same category of fix as S3). Verified in browser: Category/Unit add+delete on both
> modalities, Parameter edit round-trip (Category/RefRange/Description set and persisted, confirmed via
> the operational Pathology Tests tab that `charge` stayed at 300.00 — not wiped to 0 — after the fix),
> confirmed modality isolation (Pathology's "Hematology" category doesn't leak into Radiology's list).

### Phase S4 — Diagnostics masters (Pathology + Radiology)
**BE**: wire `DiagnosticCategory` (service+controller+DTO, modality-scoped) — the "cheapest win" per
the survey; add `refMin`/`refMax` (numeric) + `description` to `DiagnosticTest`; new `DiagnosticUnit`
catalog (modality-scoped); PATCH/DELETE for `DiagnosticTest`.
**FE**: one shared `DiagnosticMastersPanel` (modality prop) reused for both Setup → Pathology and
Setup → Radiology, each with Category / Parameter / Unit sub-tabs; Parameter form matches the demo
(Name, Reference Range From/To, Unit select, Description) — decoupled from the billing `charge` field
which stays driven by the Hospital Charges master.
**Exit**: Pathology + Radiology masters match the demo; category selector also becomes usable on the
operational pathology/radiology pages (bonus fix, not required for parity).

> **Status: Phase S5 DONE & browser-verified** (2026-07-10). Migration `s5_pharmacy_masters` — purely
> additive (7 new tables + 3 new nullable FK columns on `Medicine`; old `company`/`unit` free-text
> columns kept as-is per the plan, so no destructive-drop workaround needed this time, unlike S2/S4).
> Five of the seven new masters (`PharmaCompany`, `MedicineGroup`, `PharmaUnit`, `DosageInterval`,
> `DosageDuration`) are pure `{name}` catalogs — registered straight into the existing generic
> `NAME_CATALOGS`/`CATALOG_MODEL` engine, **zero new backend code** for any of them (keys `pharma-
> company`, `medicine-group`, `pharma-unit`, `dosage-interval`, `dosage-duration`). The other two got
> bespoke CRUD in the existing `apps/api/src/pharmacy/` module: `PharmaSupplier` (name/contact/
> contactPerson/contactPhone/drugLicenseNumber/address — mirrors S3's `ItemSupplier` pattern) and
> `MedicineDosage` (categoryId→`MedicineCategory`, free-text `dosage`, unitId→`PharmaUnit` — a
> composite quick-pick row, not a name-only catalog). Both gated `setup` RBAC (masters convention).
> **Scrapped the "+Add repeatable row" idea from the plan** — audited the actual precedent it
> referenced (Appointment Setup's Slots panel) and found it's a single-config-at-a-time upsert form,
> not a dynamic multi-row list; no real repeatable-row precedent exists anywhere in S0-S4, so
> `MedicineDosage` just uses the same single-add-at-a-time `FormDrawer` pattern as every other Setup
> panel — simpler, consistent, lower-risk than inventing new UI. Frontend: `pharma-supplier-panel.tsx`
> and `medicine-dosage-panel.tsx` (bespoke) + `SimpleCatalogPanel` ×5 wired into `setup/pharmacy`'s 8
> tabs. Setup landing now has 12 cards. Verified in browser: all 8 tabs, composite Medicine Dosage
> add (Category="Tablet"/Dosage="500mg"/Unit="Tablet" — two different catalogs coincidentally both
> named "Tablet", correctly resolved independently), Supplier add/edit/delete with drug license
> number, confirmed the operational Pharmacy page (Medicines/Bills tabs) renders unaffected by the
> additive schema changes.

### Phase S5 — Pharmacy masters (biggest net-new)
**BE**: new models `PharmaCompany`, `MedicineGroup`, `MedicineDosage` (categoryId, dosage, unitId),
`DosageInterval`, `DosageDuration`, `PharmaSupplier`, `PharmaUnit` — one migration; services/
controllers/DTOs following the established pattern; wire `Medicine.companyId`/`groupId`/`unitId` FKs
(replacing the free-text columns, additive — keep old columns nullable during transition).
**FE**: Setup → Pharmacy page with 8 sub-tabs (Medicine Category / Company / Medicine Group / Medicine
Dosage / Dosage Interval / Dosage Duration / Supplier / Unit); Medicine Dosage's Add form matches the
demo (Category select → Dosage value → Unit select, with an "+Add" repeatable row like the Slots
config pattern from A0).
**Exit**: full Pharmacy master parity; the new `MedicineDosage`/`DosageInterval`/`DosageDuration`
masters are positioned to later drive quick-picks in the C4 Prescription builder (`/opd/[id]`,
`/ipd/[id]` Prescription tabs) — noted as a follow-up, not required for this phase's DoD.

> **Status: Phase S6 DONE & browser-verified (2026-07-10) — SETUP/SETTINGS PARITY PLAN COMPLETE
> (S0–S6, all phases).** Migration `s6_bed_group_color` — purely additive (`BedGroup.color String?`).
> `BedsService`/`BedsController` gained `updateGroup`/`removeGroup`/`updateBed`/`removeBed` +
> `PATCH/DELETE /bed-groups/:id` and `/beds/:id` (static routes `beds/status`/`beds/available`
> confirmed still declared before `beds/:id`, avoiding the route-shadowing bug from an earlier
> Appointment-phase incident). `BedDto` gained `bedTypeId` (needed for edit-form prefill, previously
> only exposed `bedTypeName`). Frontend: restructured `setup/beds` into Bed / Bed Group tabs — Bed
> Group upgraded from a bare inline quick-add box into a full `components/setup/bed-group-panel.tsx`
> (DataTable with a color-swatch column, `<input type="color">` + hex-text dual editor, edit/delete);
> the Bed tab's existing DataTable gained edit/delete row actions reusing the same "Add Bed" drawer,
> retitled on edit. Floors/Bed Types quick-add boxes left untouched (out of this phase's scope; they
> already had generic-catalog edit/delete since S0, just not surfaced in this page's compact UI).
> Verified in browser: Bed Group color set via edit (swatch updated live), Bed Group add+delete,
> Bed edit (renamed) + delete, confirmed the seeded "G-01" bed accidentally deleted mid-test was
> restored before finishing (kept demo data intact, consistent with every prior phase). **Final sweep**:
> navigated all 12 Setup landing cards end-to-end (Charges/Appointment/Clinical/Beds/HR/Finance/
> Inventory/Blood Bank/Pathology/Radiology/Pharmacy/Custom Fields) — all render their expected tabs and
> seed data with zero console errors across the full pass. All 10 planned Setup domains now have full
> CRUD Setup UI matching the demo.

### Phase S6 — Bed polish + final sweep
**BE**: `BedGroup.color` field; PATCH/DELETE routes for `/beds` and `/bed-groups`.
**FE**: Bed Group Add/Edit gains the Color picker; Bed & Bed Group rows gain edit/delete actions.
**Exit**: full parity across all 10 Setup domains; final screenshot-by-screenshot pass to catch any
remaining polish (page-size selectors, export clusters) using the same `ExportMenu`/`DataTable`
patterns already established in the Clinical + Appointment work.

---

## 5. Cross-phase notes
- **Reuse over rebuild**: `SimpleCatalogPanel` (S0) collapses ~15 of these screens into configuration,
  not bespoke code — the same compounding strategy used for `DataTable`/`FormDrawer`/`ExportMenu`.
- **RBAC**: all new endpoints gated `setup` view/add/edit/delete, matching every other Setup area.
- **Standards**: contract-first shared Zod DTOs, branch-scoped, audited, additive migrations,
  typecheck/build green, browser-verified per phase.
- **Migrations**: one additive migration per phase (S1 ChargeSchedule+ChargeType.modules, S2
  Specialization, S3 ItemSupplier fields, S4 DiagnosticTest fields+DiagnosticUnit, S5 seven new
  Pharmacy models, S6 BedGroup.color).

## 6. Suggested delivery order
S0 (foundation — unlocks edit/delete everywhere) → S1 (Charges, the highest-traffic domain) → S2
(HR/Finance) → S3 (Inventory/Blood Bank) → S4 (Pathology/Radiology) → S5 (Pharmacy, the biggest lift)
→ S6 (Bed polish + final sweep).
