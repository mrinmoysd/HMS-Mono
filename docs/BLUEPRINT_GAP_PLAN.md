# Blueprint gap audit — Patient / Appointment / OPD / IPD

Source of truth: `smart-hospital-blueprint.md` + `notes-raw.md` (demo capture, 31 Jul 2026).
Audited against this repo on 31 Jul 2026. Every finding below was traced to a
file and line, and the data-level ones were confirmed against the local database.

Phases are ordered by dependency, not by how visible the fix is. B-phases must
land before the rest: the later work reads from what they establish.

---

## Verdict in one paragraph

The four modules have the right *screens* — lists, tabs, forms, row actions are
largely present and match the reference. What is missing is the **spine**: the
Case ID lifecycle is wrong, the Charge Type visibility matrix is stored but
never consulted, the OPD Checkup entity does not exist, Bed History is
fabricated rather than recorded, and Discharge is a confirm dialog rather than
a clinical form. These are the five items the blueprint calls out as the ones
teams miss, and we missed four of them.

---

## Phase B0 — Case ID lifecycle (blocker)

**Blueprint:** §3.2 "the Case ID is the spine", rule #2, rule #13.
**Status:** wrong at the model level.

- `apps/api/src/patient/patient.service.ts:85` mints a case when the **patient**
  is created.
- `apps/api/src/opd/opd.service.ts:100` and `apps/api/src/ipd/ipd.service.ts:104`
  both do `patient.cases[0]` — the patient's oldest case — and never create one.

So a patient has exactly one case for life and every encounter hangs off it.
Confirmed in the local DB:

```
    name    | cases | opd | ipd
 Import One |     1 |   2 |   1
 Import Two |     1 |   1 |   2
```

Consequences, all real today: the Patient Details report cannot separate one
visit's bills from another's; the Overview progress bars aggregate every
encounter the patient has ever had rather than this one; "Case ID" is a
constant and therefore carries no information.

**Fix**
1. Stop creating a case in `patient.service.create`. A patient with no visits
   has no case (rule #2).
2. Mint a case inside `opd.create` and `ipd.create`, in the same transaction as
   the encounter, unless the caller passes one.
3. Add an optional `caseId` to `opdVisitSchema` / `ipdAdmissionSchema` so the
   New Visit "Case" field (blueprint §7.2) and Move-to-IPD can supply one.
4. `opd.service.ts:213` `moveToIpd` must pass `caseId: visit.caseId` — rule #13.
   It currently passes none. Today that is masked by the singleton case; the
   moment step 2 lands, OPD→IPD would fragment billing without this.
5. Data migration for existing rows: keep each patient's current case attached
   to their earliest encounter, mint fresh cases for the rest. Encounters that
   were genuinely one episode (OPD moved to IPD) stay joined — detectable via
   the `movedFromOpdId` custom field we already write.

**Verification:** two OPD visits for one patient get two Case IDs; a
Move-to-IPD keeps one; the Patient Details report groups accordingly.

---

## Phase B1 — Charge Type module visibility (blocker for correctness)

**Blueprint:** rule #1, "the single most-missed rule in the whole system".
**Status:** the matrix is captured and stored, then ignored.

`ChargeType.modules` is written by the Setup screen
(`masters/charge.service.ts:90`), but `ChargeService.list` (line 117) accepts no
module filter, and `ChargeLineEditor` renders every charge in the branch. So an
Ambulance-only charge is offered on an OPD bill, and the matrix the user
carefully ticks has no effect anywhere.

**Fix**
1. `ListQuery` for charges gains `module?: ChargeModule`; `list()` filters on
   `type.modules has module`.
2. `useCharges({ module })` — pass `'opd'`, `'ipd'`, `'appointment'` from the
   OPD form, IPD form, and Appointment slot setup respectively.
3. Add the **Charge Category → Charge** cascade the blueprint specifies for the
   OPD/IPD charge block (§7.2); today it is a flat charge list.
4. Surface `Standard Charge` read-only alongside the editable `Applied Charge`,
   per §7.2 — we currently show only one number.

---

## Phase B2 — ICD-10 and Symptoms masters

**Blueprint:** §4.4 (both are bold hard-dependencies), §7.2, §8.2.
**Status:** ICD-10 does not exist; Symptoms masters exist but are not wired.

- `opd-form.tsx:172-177` and `admission-form.tsx:165-170`: ICD-10 Group and
  ICD-10 Diagnosis are free-text `TextInput`s. There is no ICD master, no Setup
  screen, no group→code cascade.
- Symptoms Type / Title are also free text, even though Setup ▸ Clinical
  already has a Symptoms master with heads and types. The
  Type → Title → auto-filled Description cascade (§7.2) is not built.

**Fix**
1. Prisma: `IcdGroup` + `IcdCode` models, seeded with a starter set.
2. Setup ▸ Clinical gains two tabs: *ICD-10 Groups*, *ICD Code*.
3. Both forms: Group select → Code select (cascaded); Symptoms Type select →
   Title select → Description auto-fill (still editable).
4. Keep the stored columns as text so existing rows survive; store the code
   alongside for reporting.

Note the blueprint's label asymmetry: OPD says "ICD Group", IPD says "ICD-10
Groups". Same master — match the labels.

---

## Phase O1 — OPD Checkup (CHKID)

**Blueprint:** §7.3 tab 2, §7.1 Patient View "Total Recheckup", ID prefix
`CHKID`.
**Status:** the entity does not exist. `grep -ri checkup` over the API, shared
DTOs and web app returns nothing in the clinical path.

An OPD visit in the reference contains one or more checkups; the visit detail's
second tab lists them and offers `+ New Checkup`, and the Patient View tab
counts them. We have no such sub-entity, so:
- the OPD detail page has no Visits tab,
- Patient View cannot show Total Recheckup,
- the Patient Details report's "OPD Checkup ID" column has nothing to fill it.

**Fix**
1. Prisma `OpdCheckup` (visitId, checkupNo `CHKID…`, appointmentDate,
   consultantId, reference, symptoms, findings) + `CHKID` sequence.
2. `POST /opd/:id/checkups`, `GET /opd/:id/checkups`, PATCH/DELETE.
3. OPD detail: new **Visits** tab with the blueprint's five columns and
   `+ New Checkup`.
4. Backfill: each existing visit gets one checkup mirroring its own fields, so
   counts are not zero.
5. Patient View gains Total Recheckup; the Patient Details report gains the
   OPD Checkup ID column.

---

## Phase O2 — OPD detail page shell

**Blueprint:** §7.3.

| Gap | Where |
|---|---|
| Overview has no info grid (Patient, Case ID, OPD No, Gender, Age, Phone, Guardian, TPA, TPA ID, TPA Validity, Barcode, QR) | `opd/[id]/page.tsx:87` — we show vitals/findings/symptoms instead |
| The six Payment-Billing progress bars are not in the specified per-module form | same |
| No ✎ Edit / 🗑 Delete in the header (only Print Bill) | `opd/[id]/page.tsx:58` |
| No breadcrumb `OPD / {caseId} · {Patient (id)}` | — |
| No left-rail patient switcher (rule #12) | — |

The left rail is worth building once as `DetailPageShell` and reusing on IPD,
as the blueprint's shared-component list suggests.

---

## Phase O3 — New Visit form

**Blueprint:** §7.2.

- No read-only **patient info card** (Guardian, Gender, Blood Group, Marital
  Status, Age, Phone, Email, Address, TPA…, allergies, remarks, photo).
- No **Case** field (blank = generate new) — needed by B0.
- Appointment Date is `type="date"`; the blueprint specifies datetime.
- Casualty / Old Patient / Live Consultation are checkboxes rather than
  No/Yes selects. Cosmetic; I'd leave these unless you want literal parity.

Same three apply to the IPD admission form (§8.2), which additionally:
- carries an **Initial Charges** block that the blueprint says must not exist —
  rule #5, "IPD admission creates no bill". Charges accrue afterwards on the
  profile's Charges tab. Recommend removing it.

---

## Phase I1 — Discharge — DONE

**Blueprint:** §8.5, state machine §9.3, rule #7.
**Status:** ~~a confirm dialog, not a form~~ — done. `dischargeSchema` collects
the seven fields, `death` sets `patient.isDeceased` in the discharge
transaction, and the card prints from what was captured.

`ipd/page.tsx:78` and `ipd/[id]/page.tsx:73` both call `discharge.mutateAsync(id)`
behind a yes/no prompt. `ipd.service.ts:222` stamps `dischargeDate: new Date()`.
None of the seven blueprint fields are captured, and the two side-effects that
depend on them cannot fire:

- **Discharge Status = Death → `patient.isDeceased = true`** (rule #7) never
  happens. The Patient list's Dead column is therefore only ever set by hand.
- Discharge Date cannot be backdated, which is normal clinical practice.

Bed release *does* work (`ipd.service.ts:219`).

**Fix**
1. `dischargeSchema`: dischargeDate*, dischargeStatus* (death|referral|normal),
   note, operation, diagnosis, investigation, treatmentHome.
2. Discharge modal with the warning banner ("check patient bill before
   discharging"), wired from both the list and the detail header.
3. On `death`, set `patient.isDeceased` in the same transaction.
4. Print the discharge card from the captured fields rather than the current
   hand-rolled HTML in `ipd/page.tsx:94`.

---

## Phase I2 — Bed History is fabricated — DONE

**Blueprint:** §8.3 tab 11, rule #8 "Bed History is append-only".
**Status:** ~~synthesised at read time~~ — done.

The audit was half right. `bed_transfer` did exist and the transfer path *did*
write to it, so a transfer was not erasing anything. What was actually broken:

- **Admission wrote nothing**, so an untransferred stay had no record at all and
  the read path synthesised a row from the admission's *current* bed. Harmless
  until the patient moved, at which point the synthesis silently reported the
  new bed for the whole stay.
- **Discharge wrote nothing**, so a transferred-then-discharged patient kept an
  open occupancy claiming they were still in the bed.

**Done:** `bed_transfer` renamed to `bed_history` (the admission and discharge
rows are not transfers), written on admission, on transfer and on discharge;
read path returns real rows only; existing data backfilled and unclosed
occupancies stamped with their discharge date. The dry-run also turned up that
`discharge` accepted a date *before* the admission, which wrote an occupancy
ending before it began — now rejected.

---

## Phase I3 — IPD detail page shell

**Blueprint:** §8.3, §8.4.

- Overview lacks the info grid (Case ID, IPD No, Admission Date, Bed, TPA,
  Barcode, QR) and instead duplicates the Consultant Register and Bed History
  panels that already have their own tabs — `ipd/[id]/page.tsx:171`.
- No `≡` **Patient Details modal** in the header (§8.4).
- No left-rail patient switcher.
- Header omits Case ID. LOS is correct and live (line 41) — that one's fine.

---

## Phase P1 — Patient module

**Blueprint:** §5.1, rule #7, §9.2.

1. **`Dead = Yes` must suppress the Show/Action menu** — `patient/page.tsx:241`
   renders it unconditionally, so a deceased patient can still be pushed into a
   new OPD/IPD/Radiology/Pathology/Pharmacy record. This is rule #7 and the
   cheapest fix in the list.
2. Patient Details report rows do not link anywhere. The blueprint's navigation
   graph has `Patient Details --Case ID--> OPD Visit Detail / IPD Detail`.
   Make the OPD No / IPD No cells links.

---

## Phase N1 — Appointment → OPD conversion

**Blueprint:** §9.1 (`QUEUE → OPD`), state machine §9.3
(`Approved → Consumed: converted to OPD visit`).
**Status:** missing. No conversion action exists in the API or the UI.

Today an appointment is a dead end: the only way to turn it into a visit is to
open OPD and re-enter everything. This is the flow break most visible to a
front-desk user.

**Fix:** a "Convert to OPD" row action on the appointment list and the queue
that opens the New Visit form pre-filled from the appointment (patient, doctor,
date, fees as the charge) and, on save, stamps the appointment `consumed` with
a link to the visit.

---

## What is already right

Worth stating so it doesn't get re-litigated:

- Appointment list columns, tabs, priority master, Doctor Shift matrix, slot
  derivation, Doctor-Wise and Queue-with-reorder — all match §6.
- OPD list columns and the five row actions incl. Move in IPD — match §7.1.
- IPD list columns incl. Bed label and Credit Limit (default 20000) — match §8.1.
- Bed cascade on admission offers available beds only, and allocation is
  transactional with a "already allotted" guard.
- IPD's 14 tabs and OPD's tab set exist (modulo the missing Visits tab), with
  Nurse Notes / Prescription / Consultant Register correctly IPD-only.
- Vitals master rows drive the Vitals matrix columns (rule #6).
- Setup ▸ Appointment has all four sub-tabs and the slot engine now handles
  overnight shifts.

---

## Suggested order

```
B0 Case ID  →  B1 Charge visibility  →  B2 ICD/Symptoms masters
                        ↓
        O1 Checkups  →  O2 OPD shell  →  O3 forms
                        ↓
        I1 Discharge →  I2 Bed History →  I3 IPD shell
                        ↓
              P1 Patient  →  N1 Appointment→OPD
```

B0 and B1 are the two that change behaviour everywhere else reads from, so they
go first even though neither produces a screenshot. P1's first item (Dead
suppresses actions) is a five-line fix and can be pulled forward at any point.
