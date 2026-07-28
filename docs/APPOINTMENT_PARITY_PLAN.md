# Appointments — Full Feature Parity Plan

Captured from the demo screenshots (`~/Downloads/Appointments` + `~/Downloads/Settings/Appointment`).
Turns the appointment scheduling gaps into a buildable, phased plan following the same standards as
the clinical EMR work (contract-first shared Zod DTOs, branch-scoped + RBAC-guarded + audited,
browser-verified, Definition of Done per phase). These are **Phases A0–A2 (Appointments)**.

Legend: ✅ built · 🟡 partial · ❌ missing.

---

## 1. Current state

**Have:** an `Appointment` model (apptNo, patient, doctor, apptDate, shift[string], slot[string],
fees, discountPct, paid, priority[enum normal/urgent/vip], source, paymentMode, liveConsult, status,
message, alternateAddress) and a basic Appointment page — tabs Today/Upcoming/Old, a list, an Add
form, status update, delete. A `Shift` model exists (name, startTime, endTime) but is only used by
Duty Roster and has **no appointment wiring or UI**.

**Missing (the whole scheduling engine + views):** appointment-priority master, shift CRUD UI,
doctor↔shift assignment, per-doctor slot configuration (duration + charge), generated time slots,
doctor-fee auto-fill, the Doctor-Wise view, the Patient Queue, the Appointment Details modal, the
Reschedule modal, Save-&-Print, the full list column set + row actions, and patient/appt→OPD links.

---

## 2. Gap analysis vs the screenshots

### 2.1 Setup → Appointment (4 sub-screens)
| Screen | What it does | Status |
|---|---|---|
| **Shift** | CRUD: Name, Time From, Time To (Morning 10:00–12:30, Evening 16:00–19:00) | 🟡 model exists, no UI/endpoints |
| **Appointment Priority** | CRUD master: Normal, Urgent, Very Urgent, Low | ❌ (we hardcode an enum) |
| **Doctor Shift** | Matrix **Doctor × Shift** with checkboxes — which shifts each doctor works | ❌ |
| **Slots** | Per **Doctor + Shift**: Consultation Duration (min), Charge Category, Charge, Amount (auto). Generates time slots + sets the doctor's fee | ❌ |

### 2.2 Appointment section
| Feature | Details | Status |
|---|---|---|
| **List** | Tabs Today/Upcoming/Old. Columns: Patient Name (id), Appointment No, Created By, Appointment Date, Phone, Gender, Doctor (id), Source, Priority, Live Consultant, Alternate Address, Fees, Discount (`0.00 (0.00 %)`), Paid, Status. | 🟡 (subset of columns, no created-by/source/live/alt) |
| **List links** | Patient Name **and** Appointment No → the patient's **OPD details** | ❌ |
| **List row actions** | ☰ details modal · 🖨 print · 📅 reschedule modal | ❌ |
| **Header buttons** | + Add Appointment · **Doctor Wise** · **Queue** | 🟡 (only Add) |
| **Toolbar** | search, page-size, export cluster (Copy/Excel/CSV/PDF/Print) | ❌ |
| **Add Appointment** | Patient (+ New Patient), Doctor, **Doctor Fees (auto, read-only)**, **Shift (doctor's shifts)**, Appointment Date, **Slot (generated, available)**, Appointment Priority (master), Payment Mode, Status, Discount %, Live Consultant, Message, Alternate Address, **Save & Print** | 🟡 (flat form, no fee-auto / shift / slot / priority-master / save-print) |
| **Appointment Details** modal | read-only: patient (name/age/email/phone/gender), doctor, department, live consult, payment note, message, alt address · appt no, s.no, date, priority, shift, slot, amount, status, payment mode, transaction id, source, collected by. Print / delete. | ❌ |
| **Reschedule** modal | edit doctor(ro)/fee(ro)/shift/date/slot/priority/discount/status/live/message/alt | ❌ |
| **Doctor Wise** | filter Doctor + Date → patients (name/phone/email/date/time/source) | ❌ |
| **Patient Queue** | filter Doctor + Shift + Date + Slot → ordered queue, **Reorder Queue** | ❌ |

---

## 3. Data model changes (additive migrations)

1. **`Shift`** (exists) — reuse `name`, `startTime`→"Time From", `endTime`→"Time To". Add branch-scoped
   CRUD endpoints + setup UI. (Times stored as `"HH:mm"`.)
2. **`AppointmentPriority`** (new) — `{ branchId, name, sortOrder }`. Seed Normal/Urgent/Very Urgent/Low.
   `Appointment.priority` stays a **string** (store the chosen name) so no data migration; the dropdown
   is driven by the master. (Alternative: `priorityId` FK — noted, not required.)
3. **`DoctorShift`** (new) — `{ branchId, doctorId, shiftId, active, consultationDurationMinutes?,
   chargeId?, amount? }`, unique `(doctorId, shiftId)`. The **Doctor Shift** matrix toggles `active`;
   the **Slots** screen sets `consultationDurationMinutes` + `chargeId` + `amount`. One row = one
   doctor's configuration for one shift.
4. **`Appointment`** (extend) — add `shiftId?`, `slotStart?`/`slotEnd?` (or keep `slot` label string),
   `queueOrder int?`, `transactionId?`, `paymentNote?`. `collectedBy` = existing `createdById`.
5. **Slot generation is computed, not stored**: for a `DoctorShift`, slice `[timeFrom, timeTo]` into
   `consultationDurationMinutes` chunks → slot list; for a given date, subtract slots already booked by
   that doctor → **available** slots.

---

## 4. Phased implementation

> **Status: Phase A0 DONE & verified** (2026-07-10). Migration `appointment_a0_scheduling` adds
> `AppointmentPriority` + `DoctorShift` (reuses existing `Shift`). Endpoints: `/shifts`,
> `/appointment-priorities` (CRUD), `/doctor-shifts` (matrix) + `/doctor-shifts/toggle` +
> `/doctor-shifts/slot-config`, `/appointments/slots` + `/appointments/doctor-fee`. Slot engine
> verified: Morning 08:00–16:00 ÷ 30min → 16 slots; doctor-fee $150. Setup → Appointment page with 4
> sub-tabs (Slots / Doctor Shift matrix / Shift / Appointment Priority) + Setup landing card.
>
> **Phase A1 DONE & verified** (2026-07-10). Appointment `priority` enum→string (master-driven);
> DTO gained `createdByName`/`alternateAddress`/`message`. Rebuilt **Add Appointment** form: Doctor →
> auto **Doctor Fees** (readonly), **Shift** filtered to the doctor's assigned shifts, **Slot** from
> the generated available slots, **Priority** from the master, Payment Mode / Status / Discount / Live
> Consultant / Message / Alt Address, **Save + Save & Print** (branded slip). Full **list** columns
> (created-by, source, live, alt address, `discount (pct%)`), Patient/Appt-No → patient profile links,
> **Export** cluster, **Doctor Wise** + **Queue** header buttons (A2 pages stubbed). Verified: Dr.
> Anita Sharma → Morning → fee $150 → 16 slots → booked APPT000003 (paid=net).
>
> **Phase A2 DONE & verified — Appointments parity (A0–A2) COMPLETE** (2026-07-10). Migration
> `appointment_a2_queue` adds `queueOrder`. Endpoints: `GET /appointments/:id` (detail incl. patient
> email/age + doctor **department**), `PATCH /appointments/:id` (reschedule, recomputes paid),
> `GET /appointments/doctor-wise`, `GET /appointments/queue`, `POST /appointments/queue/reorder`
> (setup controller registered first so `/appointments/slots` isn't shadowed by `:id`). Frontend:
> **Appointment Details** modal (read-only + print + delete), **Reschedule** modal (prefilled, reuses
> slot/fee logic), **Doctor Wise** page (doctor+date → patient table), **Patient Queue** page
> (doctor+shift+date+slot → ordered list with ▲▼ **Reorder Queue**); row actions (details/print/
> reschedule) wired. Verified: detail (dept Cardiology), reschedule (Normal→Very Urgent, approved→
> completed), doctor-wise (2 rows), queue. Full demo parity across the Appointments module + Setup.

### Phase A0 — Setup masters + scheduling foundation
**BE**
- `Shift` CRUD (`/shifts` GET/POST/PATCH/DELETE), branch-scoped, audited.
- `AppointmentPriority` CRUD (`/appointment-priorities`) + seed.
- `DoctorShift`: `GET /doctor-shifts` (matrix: doctors × shifts + active), `PUT /doctor-shifts`
  (toggle a doctor/shift), and slot-config `GET/PUT /doctor-shifts/slot-config` (duration + charge + amount).
- **Slot service**: `GET /appointments/slots?doctorId&shiftId&date` → available slots; `GET
  /appointments/doctor-fee?doctorId&shiftId` → auto fee.
**FE (Setup → Appointment)**
- New setup area with 4 sub-tabs (Slots / Doctor Shift / Shift / Appointment Priority), matching the
  demo's left sub-nav. Reuse `DataTable`, `FormDrawer`, the catalog patterns, and the charge picker.
- Doctor-Shift **checkbox matrix**; Slots config form (Doctor+Shift → duration + charge + amount).
- Add an **Appointment** card to the Setup landing.
**Exit**: masters manageable; slot generation + fee lookup return correct data.

### Phase A1 — Appointment form + list parity
**BE**
- Extend appointment create/update to use `shiftId` + `slot` + priority(name) + fee (from slot-config)
  + transaction/payment note; reuse the invoice/payment engine for the appointment fee like OPD.
- Full list DTO (created-by, source, live-consult, alternate address, discount display).
**FE**
- **Add Appointment** modal parity: PatientSelect + New Patient, Doctor → **auto Doctor Fees**,
  **Shift** (doctor's active shifts), **Slot** (available, regenerated on doctor/shift/date change),
  Appointment Priority (master), Payment Mode, Status, Discount %, Live Consultant, Message, Alt
  Address, **Save** + **Save & Print** (branded slip via the print helper).
- **List** parity: full columns, `Discount (%)` as `amt (pct %)`, Patient Name + Appointment No →
  `/opd/[id]` (the patient's OPD detail), export cluster, page-size.
**Exit**: create/list an appointment end-to-end with real slots, fee auto-fill, OPD links, export.

### Phase A2 — Details, Reschedule, Doctor-Wise, Queue
**BE**
- `GET /appointments/:id` (detail payload incl. department, transaction, collected-by).
- `GET /appointments/doctor-wise?doctorId&date`.
- Queue: `GET /appointments/queue?doctorId&shiftId&date&slot` (ordered by `queueOrder`); `PUT
  /appointments/queue/reorder` (persist new order).
**FE**
- **Appointment Details** modal (read-only + Print + Delete).
- **Reschedule** modal (edit scheduling → reuses the slot/fee logic).
- **Doctor Wise** page (filter → table).
- **Patient Queue** page (filter → ordered list, drag/▲▼ **Reorder Queue**).
- Row actions (details / print / reschedule); header **Doctor Wise** + **Queue** buttons.
**Exit**: full parity with the demo across list, details, reschedule, doctor-wise, queue.

---

## 5. Cross-cutting
- **Reuse**: `DataTable`, `FormDrawer`, `ExportMenu`, `PatientSelect`, `printDocument`, `useDoctors`,
  the charge picker, and the invoice engine — same components used across the clinical build.
- **RBAC**: `appointment` view/add/edit/delete for the section; `setup` add/edit for the masters.
- **Standards**: contract-first shared Zod DTOs, branch-scoped, audited, additive migrations,
  typecheck/build green, browser-verified per phase.

## 6. Suggested delivery order
A0 (masters + slot engine) → A1 (form + list, the daily-driver) → A2 (details/reschedule/doctor-wise/queue).
