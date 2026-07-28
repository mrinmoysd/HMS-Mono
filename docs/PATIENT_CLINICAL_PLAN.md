# Patient · OPD · IPD Clinical (EMR) — End-to-End Implementation Plan

Turns the gaps in [PATIENT_CLINICAL_FEATURES.md](PATIENT_CLINICAL_FEATURES.md) into a buildable,
phased plan. Follows the same standards as [EXECUTION_PHASES.md](EXECUTION_PHASES.md): contract-first
per module, backend + frontend tracks in parallel, branch-scoped + RBAC-guarded + audited, Definition
of Done per phase. These are **Phases C1–C7** (Clinical), layered on the existing Patients/OPD/IPD.

**Guiding architecture — the "Encounter" model**
Introduce a unifying concept: an **encounter** is an OPD visit *or* an IPD admission. All clinical
sub-records (vitals, findings, symptoms, medication, prescription, operations, charges, payments,
consultants, timeline, live consultation) hang off an encounter and roll up by **Case ID**. We add a
polymorphic link `encounterType (opd|ipd)` + `encounterId` (or nullable `opdVisitId`/`ipdAdmissionId`)
to each sub-record. This keeps OPD and IPD sharing one clinical engine — the same payoff the invoice
engine gave billing.

Estimated total: **~6–9 weeks** for a small team; phases are independently shippable.

---

> **Status:** Phases **C0–C2 delivered & validated**, including the **C0 polish pass**:
> patient form parity (DOB → auto-age, 3-part Y/M/D age, drag-drop photo upload, marital status),
> patient list (Y/M/D age display, Dead column, **Disabled Patient List** tab w/ backend filter,
> per-row **quick-create Action menu** → OPD/IPD open a prefilled form, Copy/Excel/CSV/PDF/Print
> **export cluster**), and a **Clinical Masters** setup screen (`/setup/clinical`: Vital Types,
> Findings, Symptoms). Plus the **Patient 360 Profile** (`/patient/[id]`) + Vitals matrix +
> medical-history chart. Remaining C0 nice-to-haves: presigned S3 photo storage (currently data-URL),
> barcode/QR image in the header, patient-scoped quick-create for Radiology/Pathology/Pharmacy
> (those land with C4 diagnostics).
>
> **C3 delivered & validated**: encounter-scoped billing. `EncounterBillingService` resolves an
> OPD/IPD encounter's primary invoice (OPD via `opdVisit.invoiceId`; IPD via its case's `ipd`
> invoice) — no schema migration needed. Endpoints `GET/POST /encounter-billing/:type/:id(/charges|
> /payments)`; `InvoiceService.addItems` appends charges and recomputes totals keeping paid.
> **`/opd/[id]`** & **`/ipd/[id]`** detail pages (Overview/Charges/Payments) with reusable widgets:
> `ChargesTab` (Add Charges + Apply-TPA + totals), `PaymentsTab` (Add Payment + Net/Paid/Balance),
> `BillingSummaryBars` (per-department billed/paid), `CreditDonut` (IPD used/limit/balance). List
> rows link via a **Details** action.
>
> **C4 delivered & validated**: diagnostics depth. New encounter-scoped models `LabInvestigation`,
> `Prescription`+`PrescriptionItem`, `MedicationDose` (migration `clinical_c4_diagnostics`).
> `DiagnosticsClinicalService`/controller under `/clinical` (lab order/report/approve,
> prescriptions, medication). Reusable widgets `LabTab` (order + report/approve + details modal),
> `PrescriptionTab` (builder + printable Rx), `MedicationTab` (OPD list / **IPD MAR matrix**), wired
> into `/opd/[id]` & `/ipd/[id]` (6 tabs each) and the Patient Profile Lab tab (now live).
>
> **C5 delivered & validated**: full **OPD Visit Details** page (`/opd/[id]`, 11 tabs: Overview ·
> Vitals · Lab · Prescription · Medication · Operations · Live Consultation · Charges · Payments ·
> Timeline · Treatment History) with an enriched two-column Overview (current vitals / findings /
> symptoms / consultant + billing bars + timeline, from the profile aggregation). New encounter-scoped
> `OperationRecord` (+ extended the existing `LiveConsultation` model with patient/encounter scoping)
> — service+endpoints under `/clinical/operations` & `/clinical/live-consults`; reusable
> `OperationsTab` and `LiveConsultTab` (Awaited/Finished + Join) widgets **also added to IPD** (C6
> reuse).
>
> **C6 delivered & validated**: full **IPD Profile** (`/ipd/[id]`, 11 tabs: Overview · Nurse Notes ·
> Medication (MAR) · Prescription · Consultant Register · Lab · Operations · Charges · Payments ·
> Live Consultation · Bed History) + credit donut + billing bars. New `NurseNote`, `ConsultantRegister`
> (encounter-scoped) and `BedTransfer` models (migration `clinical_c6_ipd_profile`). **Bed transfer**
> closes the active occupancy, opens the new one, flips bed statuses, updates `admission.bedId`; Bed
> History synthesises the current bed when no transfers exist yet. Widgets `NurseNotesTab`,
> `ConsultantRegisterTab`, `BedHistoryTab` (+ Transfer Bed).
>
> **C7 delivered & validated — clinical EMR series (C0–C7) COMPLETE.** Shared branded print helper
> `lib/print.ts` (hospital letterhead → header/meta/sections/footer, opens print dialog / Save-as-PDF)
> + `printEncounterBill`. Print actions wired: **Rx** (rebranded), **Lab Report** (lab tab), **Print
> Bill** (OPD/IPD detail headers), **Patient File** (profile 360 summary). Reusable `ExportMenu`
> (Copy/Excel/CSV/PDF/Print) extracted and added to the **Patient, OPD, and IPD** lists. Full parity
> with the demo across Patient 360, OPD Visit Details, and IPD Profile.

## Phase C0 — Foundations: Encounter, Patient parity, Setup masters (≈1 wk)

**BE**
- Add `Encounter` abstraction: extend `OpdVisit` & `IpdAdmission` with shared helpers; add
  `encounterRef(type,id)` resolution util. Add `opdVisitId?` / `ipdAdmissionId?` to `Invoice`
  (scope charges/payments to an encounter) + backfill by caseId.
- **Patient parity**: add `dob`, `maritalStatus` (have), `photoUrl` file upload (presigned S3),
  compute `age` from DOB or accept 3-part; `isDeceased`/`isDisabled` already present; barcode/QR
  values (store patientNo; render client-side).
- **Setup masters** (name/param catalogs, reuse the catalog engine): **VitalType** (name, unit,
  refMin, refMax), **SymptomHead + SymptomType**, **FindingCategory + Finding**, **Charge Category/
  Type** (have). Seed the common vitals (Temp, BP, Pulse, Height, Weight → BMI derived).

**FE**
- Patient form parity (DOB + 3-part age + photo drag-drop + marital status + allergies).
- **Patient List**: add per-row **Action menu** (OPD/IPD/Radiology/Pathology/Pharmacy quick-create),
  full column set (id-in-name, "Y,M,D" age, Dead column), **Disabled Patient List**, export cluster
  (Copy/Excel/CSV/PDF/Print via SheetJS + print), page-size selector.
- Setup screens for VitalType / Symptoms / Findings.

**Exit**: patient parity done; encounter link + setup masters in place; patient list matches demo.

---

## Phase C1 — Vitals, Findings, Symptoms, Timeline (≈1 wk)

**BE**
- `VitalReading` (patientId, encounterRef?, vitalTypeId, value, recordedAt) + status computed vs
  VitalType range; **current vitals** = latest per type; **BMI** derived from latest H+W.
- `FindingRecord` & `SymptomRecord` (encounter/patient scoped).
- `TimelineEntry` (patientId, title, date, description, fileUrl, visibleToPatient).
- Endpoints: list matrix (date×type), add-vital (multi-row), CRUD findings/symptoms/timeline.

**FE**
- **Vitals matrix** widget + Add Vital modal (multi-row) — reused in profile & encounter.
- **CurrentVitals** widget (badges Low/Normal/High + BMI band).
- Findings / Symptoms bullet widgets + editors.
- **Timeline** widget + Add Timeline modal (attach doc, visible-to-patient).

**Exit**: vitals/findings/symptoms/timeline work end-to-end on the patient profile.

---

## Phase C2 — Patient Profile 360 (≈1 wk)

**BE**
- Aggregation endpoints for the profile: header (with TPA, barcode/QR), current vitals, allergies,
  findings, symptoms, consultants; **Visit Details**, **Treatment History**, **Lab Investigation**
  (see C4), **Medical History** per-year per-department counts (query over invoices/visits).
- `EncounterConsultant` (multiple consultants per encounter/patient).

**FE**
- **Patient Profile** page shell with tabs **Overview / Visits / Lab Investigation / Treatment
  History / Timeline / Vitals**.
- Overview two-column layout (all widgets), **Medical History line chart** (Recharts), Visit/Treatment
  tables with row actions (print/Rx/details/share), "New Visit" flow.

**Exit**: the Patient 360 Overview matches the demo (minus lab-parameter depth from C4).

---

## Phase C3 — Encounter Charges & Payments, Billing summary, Credit limit (≈1 wk)

**BE**
- Scope `Invoice`/`InvoiceItem`/`Payment` to the encounter; **Add Charges** supports **Apply-TPA**,
  per-line note/qty/discount%/tax%, multi-line; **Add Payment** per encounter (txn id, mode, note).
- **Per-department billing summary** for a case: paid/billed per module (OPD/Pharmacy/Pathology/
  Radiology/Blood/Ambulance) → the progress bars.
- **IPD credit limit**: used = Σ encounter charges; balance = limit − used; expose for the donut.

**FE**
- **Charges** tab (table + Add Charges full-width modal with Apply-TPA + line editor + Total).
- **Payments** tab (table + Add Payment modal).
- **Billing summary bars** widget; **Credit donut** (IPD) widget.

**Exit**: per-encounter charges/payments + billing bars + IPD credit donut working.

---

## Phase C4 — Diagnostics depth: Lab Investigation, Prescription, Medication (≈1.5 wk)

**BE**
- Extend pathology/radiology bills to **test-level results**: `DiagnosticResult` (billItem, parameter,
  reportValue, referenceRange) + workflow fields (collectionBy, sampleDate, expectedDate, approvedBy,
  center, previousReportValue). Unified **Lab Investigation** query (pathology + radiology) per patient/
  encounter + details modal payload.
- `Prescription` (encounterRef, prescribeBy, consultant, generatedBy, symptoms, finding) + `PrescriptionItem`
  (medicine category, medicine, dosage, doseInterval, doseDuration, instruction) + attached pathology/
  radiology test lists. Printable HTML (reuse print-template engine).
- `MedicationDose` (encounterRef, medicineCategory, medicineId, dosage, date, time, remarks, createdBy)
  — list (OPD) + **MAR matrix** (IPD: date × Dose1..N).

**FE**
- **Lab Investigation** tab + **Details modal** (parameters, report values, reference ranges, approval).
- **Prescription** tab (list + Add Prescription builder + printable Rx).
- **Medication** tab: OPD list + Add Medication Dose; IPD **MAR matrix** with per-dose "+".

**Exit**: lab reports with parameter values, prescriptions (printable), and medication/MAR complete.

---

## Phase C5 — OPD Visit Details page (≈1 wk)

**BE**: per-visit aggregation endpoint (reuses C1–C4 services scoped to the OPD visit).

**FE**
- **OPD Visit Details** page with the full tab set: **Overview · Visits · Medication · Lab
  Investigation · Operations · Charges · Payments · Live Consultation · Timeline · Treatment History
  · Vitals** — reusing the C1–C4 widgets.
- Overview per-visit (header, vitals, findings, symptoms, consultants, timeline, billing bars, and the
  Medication/Lab/Operation/Charges/Payment/Live-consult summary tables).

**Exit**: OPD visit detail matches the demo.

---

## Phase C6 — IPD Profile page: Nurse Notes, Consultant Register, Bed History, OT (≈1.5 wk)

**BE**
- `NurseNote` (ipdId, nurseId, note, comment, createdBy, at).
- `ConsultantRegister` (ipdId, appliedDate, doctorId, instruction, consultantDate).
- `OperationRecord` (encounterRef, category, name, date, consultant, assistant1/2, anesthetist,
  anesthesiaType, otTechnician, otAssistant, remark, result, refNo).
- **Bed transfer**: `BedTransfer/BedHistory` (ipdId, bedId, fromDate, toDate, active); transfer action
  closes current + opens new + updates bed status.

**FE**
- **IPD Profile** page with full tabs: **Overview · Nurse Notes · Medication (MAR) · Prescription ·
  Consultant Register · Lab Investigation · Operations · Charges · Payments · Live Consultation ·
  Bed History · Timeline · Treatment History · Vitals**.
- Overview adds credit donut, admission/bed info, Nurse Notes + Prescription + Consultant Register +
  Bed History widgets.
- Nurse Notes timeline + add; Consultant Register table + add; Operations table + Add Operation modal;
  Bed History + **Transfer Bed** action.

**Exit**: IPD profile matches the demo.

---

## Phase C7 — Live Consultation (patient), Print templates, polish (≈0.5–1 wk)

**BE**: patient-scoped `LiveConsultation` (createdFor doctor, status Awaited/Finished, join URL);
print endpoints for Rx / lab report / patient file / encounter bill using the header/footer templates.

**FE**: Live Consultation tab (Start/join, status); wire all Print actions; export clusters on every
list; final parity pass against screenshots.

**Exit**: full clinical parity with the demo across Patient, OPD, IPD.

---

## Cross-phase notes
- **Reuse over rebuild**: vitals/findings/symptoms/timeline/charges/payments/medication/operations
  widgets are built once (C1–C4) and reused by both OPD (C5) and IPD (C6) detail pages — the same
  compounding strategy used for the invoice engine + DataTable.
- **RBAC**: all endpoints keep `patient`/`opd`/`ipd`/`pharmacy`/`pathology`/`radiology` permission
  guards; clinical writes (vitals, notes, prescriptions) follow the owning module's add/edit rights.
- **Standards**: contract-first (shared Zod DTOs), branch-scoped, audited, Definition-of-Done per
  phase, typecheck/build green, permission-matrix respected.
- **Migrations**: additive only; each phase ships its own Prisma migration.

## Suggested delivery order (fastest visible value)
C0 → C1 → C2 (Patient 360 visible) → C3 (money) → C4 (diagnostics depth) → C5 (OPD detail) →
C6 (IPD detail) → C7 (polish).
