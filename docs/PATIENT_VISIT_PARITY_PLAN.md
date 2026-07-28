# Patient Details → Visits Tab — Full Feature Parity Plan

**Status: ALL PHASES DONE (2026-07-13)** — V0–V5 complete, browser-verified, full action parity with
the demo.

Captured from the demo screenshots (`~/Downloads/Patient_Visit_Screens/`, reviewed 2026-07-11):
`Patient_Visit_List.png` (Visits tab + per-row action cluster), `Patient_Visit_Details.png` (Show →
Visit Details modal), `Patient_Visit_New.png` (New Visit / Edit → full "Patient Details" OPD form),
`Patient_Visit_Add_Prescription.png` (Add Prescription builder), `Patient_Visit_Manual.png` (Manual
Prescription → branded print preview), `Patient_Visit_Move_IPD.png` (Move Patient to IPD).

Turns the Visits-tab gaps into a buildable, phased plan following the same standards as the Setup /
Appointment / Clinical work (contract-first shared Zod DTOs, branch-scoped + RBAC-guarded + audited,
additive migrations, browser-verified, Definition of Done per phase). These are **Phases V0–V5**.

Legend: ✅ built · 🟡 partial · ❌ missing.

---

## 1. Current state (codebase, 2026-07-11)

**Patient Details page** `apps/web/src/app/(app)/patient/[id]/page.tsx` — already renders the correct
6 tabs (Overview, Visits, Lab Investigation, Treatment History, Timeline, Vitals). ✅ tab set matches
the demo.

**Visits tab** — a **bare read-only table** (`VisitTable` inline + shared
`components/emr/visit-table.tsx`, fed by `ProfileVisitRow[]` from `GET /patients/:id/profile`).
Columns today: OPD No, Case ID, Date, Consultant, Symptoms. **No toolbar (search / page-size / export
cluster / New Visit) and no per-row Action column at all.** This is the whole gap.

**Backend today**
- OPD: `GET /opd` (tab-scoped list: today/upcoming/old), `POST /opd` (create). **No `GET /opd/:id`
  detail, no `PATCH /opd/:id`, no `DELETE /opd/:id`, no patient-scoped list.**
- `GET /patients/:id/profile` returns `ProfileVisitRow` = `{ id, opdNo, caseNo, appointmentDate,
  consultantName, symptoms }` — **missing `reference` + `previousMedicalIssue`** columns the demo shows.
- Prescriptions: `GET/POST /clinical/prescriptions` (C4) — model has symptoms/findings/note + items
  (medicineName/dosage/interval/duration/instruction). **Missing the demo's header/footer note,
  structured findings, attachment, pathology/radiology links, notification recipients.**
- IPD: `GET /ipd`, `POST /ipd` (admit — schema already accepts patientId/consultantId/admissionDate/
  bedId/creditLimit/isAntenatal/reference/symptoms/note/items/payment), discharge, bed-history,
  bed-transfer. **Enough for Move-to-IPD** (bedGroup is only a UI filter over bedId).
- `OpdVisit` model has opdNo/patientId/caseId/consultantId/appointmentDate/symptomType/symptoms/note/
  isAntenatal/casualty/oldPatient/applyTpa/reference/invoiceId/customFields. **Missing the demo form's
  symptomTitle, symptomDescription, icd10Group, icd10Diagnosis, knownAllergies, previousMedicalIssue,
  liveConsult.**

**Existing reusable pieces to lean on**: `DataTable`, `FormDrawer`, `ExportMenu`, `ChargeLineEditor`,
`printDocument` (branded letterhead), `Menu`/`MenuItem`, the S5 Pharmacy masters + their hooks
(`useMedicines`, `useMedicineDosages`, `useCatalog('dosage-interval'|'dosage-duration'|'pharma-unit')`),
`useEncounterBilling`, `usePatientProfile`, `usePrescriptions`/`useCreatePrescription`.

---

## 2. Gap analysis vs the screenshots

### 2.1 Visits tab — toolbar & columns (`Patient_Visit_List.png`)
| Element | Status |
|---|---|
| Search box | ❌ |
| Page-size selector | ❌ |
| Export cluster (Copy/Excel/CSV/PDF/Print) | ❌ (have reusable `ExportMenu`) |
| **New Visit** button | ❌ |
| Columns: OPD No (link), Case ID, Appointment Date, Consultant, **Reference**, Symptoms, **Previous Medical Issue**, **Action** | 🟡 (5 of 8, no Reference/Prev-Issue/Action) |

### 2.2 Per-row Action cluster (5 actions)
| Action | Icon | Opens | Status |
|---|---|---|---|
| **Print** | printer | branded OPD-slip/prescription print via `printDocument` | ❌ |
| **Add Prescription** | Rx | full "Add Prescription" builder modal | ❌ |
| **Show** | file | read-only "Visit Details" modal (has Edit + Delete in header) | ❌ |
| **Manual Prescription** | list | branded "OPD Prescription" print-preview modal | ❌ |
| **Move to IPD** | export | "Move Patient to IPD" modal | ❌ |

### 2.3 Show → Visit Details modal (`Patient_Visit_Details.png`)
Read-only card: OPD Checkup ID, OPD ID, Case ID, Patient Name, Old Patient, Guardian, Gender, Marital
Status, Phone, Email, Address, Age, Blood Group, Known Allergies, Appointment Date, Case, Casualty,
Reference, TPA, Consultant Doctor, Is Antenatal, Note, Symptoms, Previous Medical Issue. Header **Edit
(pencil)** + **Delete (trash)** + Close. → needs `GET /opd/:id` detail DTO.

### 2.4 New Visit / Edit → "Patient Details" OPD form (`Patient_Visit_New.png`)
Two-column full-screen modal. Left: patient info card (read-only) + **Symptoms** section (Symptoms
Type, Symptoms Title, Symptoms Description, ICD-10 Group, ICD-10 Diagnosis, Any Known Allergies, Note,
Previous Medical Issue). Right: **Visit Details** (Visit Date, Case, Casualty, Old Patient, Reference,
Apply TPA), **Consultant Doctor & Charges** (Consultant, Charge Category, Charge, Standard Charge,
Applied Charge, Discount %, Tax %, Amount), **Payment** (Payment Mode, Paid Amount, Live Consultation).
Footer: Cancel, **Save & Print**, Save. → richer than today's `opd-form.tsx`; needs schema + model
columns for the new symptom/ICD/allergy/prev-issue/liveConsult fields.

### 2.5 Add Prescription builder (`Patient_Visit_Add_Prescription.png`)
Left: **Header Note** (rich text), **Findings** (Finding Category, Finding List, Finding Description,
Finding Print checkbox), **Medicine** table (Medicine, Dose, Dose Interval, Dose Duration, Instruction,
+ Add Medicine, per-row remove), **Footer Note** (rich text). Right: **Attachment** (drop file),
**Custom Fields**, **Pathology** (select), **Radiology** (select), **Notification To** (role
checkboxes: Admin/Accountant/Doctor/Pharmacist/Pathologist/Radiologist/Super Admin/Receptionist/Nurse).
Footer: Cancel, Save & Print, Save. → the medicine Dose/Interval/Duration selects map onto the **S5
pharmacy masters** (MedicineDosage / dosage-interval / dosage-duration catalogs) — the payoff for S5.

### 2.6 Manual Prescription (`Patient_Visit_Manual.png`)
Branded "OPD Prescription" letterhead preview (hospital header + Patient Details block: OPD No, OPD
Checkup ID, Date, Patient Name, Age, Gender, Blood Group, Address, Consultant Doctor, Known Allergies)
with a header Print button + Close. → FE-only, reuses `printDocument`.

### 2.7 Move Patient to IPD (`Patient_Visit_Move_IPD.png`)
Left: read-only patient card + **Symptoms** (Type, Title, Description prefilled from the visit, Note,
Previous Medical Issue). Right: **IPD Details** (Admission Date, Case, Casualty, Old Patient, Credit
Limit, Reference, Consultant Doctor, Bed Group → Bed Number cascade, Live Consultation, Is For
Antenatal checkbox). Footer: Cancel, **Move**. → reuses the existing `POST /ipd` admit engine; Bed
Group is a client-side filter over the bed picker.

---

## 3. Data-model changes (additive migrations, one per phase that needs it)

1. **`OpdVisit` (extend, V1)** — add `symptomTitle`, `symptomDescription`, `icd10Group`,
   `icd10Diagnosis`, `knownAllergies`, `previousMedicalIssue`, `liveConsult Boolean @default(false)`.
   All nullable/defaulted → purely additive.
2. **`Prescription` (extend, V2)** — add `headerNote`, `footerNote`, `findingCategoryId?`,
   `findingList?`, `findingDescription?`, `findingPrint Boolean @default(true)`, `attachmentUrl?`,
   `pathologyTestIds String[] @default([])`, `radiologyTestIds String[] @default([])`,
   `notifyRoles String[] @default([])`. Additive.
3. No new migration for V0 (detail/delete endpoints reuse existing columns), V3 (print, FE-only), V4
   (Move-to-IPD reuses `POST /ipd`), V5 (sweep).

---

## 4. Phased implementation

### Phase V0 — Visits-tab foundation + Show (Details) + Delete ✅ DONE (2026-07-13)
**BE**
- `GET /opd/:id` → new `OpdVisitDetailDto` (every field the Visit Details modal needs, joined from
  patient/case/consultant/tpa/invoice). Gated `opd view`.
- `DELETE /opd/:id` — soft-delete (`deletedAt`) + audit. Gated `opd delete`. **Decision (2026-07-11):**
  soft-delete removes the visit row but **leaves any linked invoice intact** — no paid-invoice guard;
  preserves financial history and mirrors every other soft-delete in the app.
- Enrich `ProfileVisitRow` (in `profile.service.ts`) with `reference` + `previousMedicalIssue` so the
  new columns render without a second fetch.
**FE**
- Replace the bare Visits table with a real `components/emr/visits-panel.tsx` (`DataTable`: OPD No →
  `/opd/[id]` link, Case ID, Appointment Date, Consultant, Reference, Symptoms, Previous Medical Issue,
  **Action** cluster) + search + page-size + `ExportMenu` + **New Visit** button (stub → V1).
- Action cluster: 5 icon buttons (Print/Rx/Show/Manual/Move) — wire **Show** now (fetch `GET /opd/:id`
  → read-only Visit Details modal with Edit pencil [→ V1] + Delete trash + Close) and **Delete** now;
  the other three open placeholder modals wired in V1–V4.
**Exit**: Visits tab matches the demo's columns + toolbar; Show modal renders full detail; Delete works
and refreshes the list. Browser-verified.

### Phase V1 — New Visit + Edit (full "Patient Details" OPD form) ✅ DONE (2026-07-13)
**BE**: migration `opd_visit_clinical_fields` (§3.1). Extend `opdVisitSchema` + `OpdVisitInput` +
`OpdVisitDetailDto` with the new symptom/ICD/allergy/prev-issue/liveConsult fields; `PATCH /opd/:id`
(update, recompute nothing billing-side unless charges change — reuse the create path's invoice logic).
Wire the new fields through `opd.service.ts` create + update + detail.
**FE**: build `components/emr/visit-form.tsx` — the two-column "Patient Details" modal (read-only
patient card + Symptoms section left; Visit Details + Consultant & Charges + Payment right), reused for
**New Visit** (blank) and **Edit** (prefilled from `GET /opd/:id`, opened from the Details modal's
pencil). Reuse `ChargeLineEditor` for the charge block; Save + **Save & Print** (branded slip).
**Exit**: New Visit creates and Edit updates a visit end-to-end with every demo field; Save & Print
emits the slip. Browser-verified.

### Phase V2 — Add Prescription (rich builder) ✅ DONE (2026-07-13)
**BE**: migration `prescription_rich_fields` (§3.2). Extend `createPrescriptionSchema` +
`PrescriptionDto` with header/footer note, structured findings, attachment, pathology/radiology test
id arrays, notifyRoles; persist + return them. (Medicine items already carry dosage/interval/duration/
instruction — no item-schema change; the FE just drives those inputs from the S5 masters.)
**FE**: `components/emr/prescription-builder.tsx` — full modal. Header/Footer Note are **true rich-text
(WYSIWYG) editors** — **Decision (2026-07-11):** add a lightweight editor dependency (TipTap or
equivalent) rather than plain textareas, matching the demo's bold/list/format toolbar; wrap it in one
reusable `components/ui/rich-text.tsx` (used by both notes, and available for future rich fields), and
add matching print-CSS so the formatting survives Save & Print. Then:
Findings (Finding Category + Finding List selects from the clinical finding masters, Description,
Finding Print checkbox), Medicine table (Medicine select from `useMedicines`; Dose from
`useMedicineDosages`; Dose Interval / Dose Duration from `useCatalog('dosage-interval'|'dosage-
duration')`; Instruction; +Add Medicine / remove row), Footer Note, Attachment (upload), Pathology /
Radiology selects (diagnostic tests), Notification To role checkboxes. Save + **Save & Print** (Rx
doc via `printDocument`). Wire the row's **Add Prescription** action to it.
**Exit**: Add Prescription persists a full prescription and Save & Print produces the branded Rx.
Browser-verified. (Follow-up, not blocking: surface the same builder on the OPD/IPD detail Prescription
tab to replace the thinner drawer.)

### Phase V3 — Manual Prescription preview + Print action ✅ DONE (2026-07-13)
**FE-only** (reuses `printDocument`): `Manual Prescription` action → branded "OPD Prescription"
letterhead preview modal (patient-details block from `GET /opd/:id`) with a header Print button +
Close; **Print** action → prints the OPD slip/prescription for that row directly. Both share one
`opdPrescriptionDoc(detail)` builder so the on-screen preview and the printout are identical.
**Exit**: both print paths emit correct branded documents. Browser-verified.

### Phase V4 — Move to IPD ✅ DONE (2026-07-13)
**BE**: `POST /opd/:id/move-to-ipd` — thin wrapper that reads the OPD visit, prefills an IPD admission
(patient, consultant, symptoms, casualty, reference, isAntenatal) and calls the existing IPD admit
service with the modal's bed/creditLimit/liveConsult inputs; returns the new `IpdAdmissionDto`. (Reuses
`ipdAdmissionSchema`; no new IPD columns.) Gated `ipd add`.
**FE**: `components/emr/move-to-ipd-modal.tsx` — left read-only patient + Symptoms prefilled from the
visit; right IPD Details (Admission Date, Case, Casualty, Old Patient, Credit Limit, Reference,
Consultant, **Bed Group → Bed Number** cascade via `useBedGroups` + available-beds filtered by group,
Live Consultation, Is For Antenatal). **Move** → admit + navigate to `/ipd/[id]`.
**Exit**: Move to IPD admits the patient onto the chosen bed and lands on the IPD detail page.
Browser-verified.

### Phase V5 — Cross-surface parity + final sweep ✅ DONE (2026-07-13)
- Reuse `visits-panel.tsx` on any other visit list that should carry the same actions (e.g. the OPD
  list page), if in scope.
- Final browser sweep: all 5 row actions + New Visit + Edit + Delete + export cluster, and confirm no
  regression on Overview / Lab Investigation / Treatment History / Timeline / Vitals.
**Exit**: 100% action parity with the demo across the Patient Details → Visits tab.

---

## 5. Cross-phase notes
- **Reuse over rebuild**: one `visits-panel.tsx` + one `visit-form.tsx` + one `prescription-builder.tsx`
  + one `opdPrescriptionDoc()` builder; the S5 pharmacy masters finally drive the prescription selects.
- **RBAC**: `opd` view/add/edit/delete for visits; `ipd add` for Move-to-IPD; clinical add for
  prescriptions — matching existing guards.
- **Standards**: contract-first shared Zod DTOs, branch-scoped, audited, additive migrations,
  typecheck + build green, browser-verified per phase (each phase runnable end-to-end before the next).
- **Migrations**: V1 (`OpdVisit` clinical fields), V2 (`Prescription` rich fields). All additive — no
  destructive-drop backfill needed (unlike the Setup S2/S4 renames).

## 6. Suggested delivery order
V0 (tab foundation + Show + Delete — unlocks the surface) → V1 (New Visit + Edit, the daily driver) →
V2 (Add Prescription, the biggest lift) → V3 (print paths) → V4 (Move to IPD) → V5 (sweep).
