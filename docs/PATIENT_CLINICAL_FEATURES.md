# Patient · OPD · IPD — Full Clinical (EMR) Feature Spec

Captured from the live demo screenshots (`/admin/admin/search`, `/admin/patient/profile`,
`/admin/patient/visitdetails`, `/admin/patient/ipdprofile`). This documents the **full clinical
depth** each screen requires. Our current build (Phases 1–3) has the *skeletons* (patient record,
one OPD bill, IPD admission + bed); this spec defines the **EMR record** layered on top.

Legend: ✅ already in our system · 🟡 partial · ❌ missing.

---

## 1. Patient List (`/patient` list)

| Aspect | Details | Status |
|---|---|---|
| Columns | #, **Patient Name (with ID in parens)**, Age (**"Y, M, D"** format), Gender, Phone, Guardian Name, Address, **Dead (Yes/No)**, Action | 🟡 (age format, dead column, id-in-name missing) |
| Row checkbox | select for bulk delete | ✅ |
| Header actions | **Add New Patient**, **Import Patient**, **Disabled Patient List**, **Delete Selected** | 🟡 (disabled list missing) |
| Toolbar | Search, **page-size selector (100)**, export cluster: **Copy / Excel / CSV / PDF / Print** | 🟡 (only CSV) |
| **Per-row Action menu** (3-dot) | Quick-create shortcuts: **OPD, IPD, Radiology, Pathology, Pharmacy** — jumps to the create-bill/visit flow pre-filled with that patient | ❌ |
| Per-row list icon | opens the **Patient Profile (360 view)** | 🟡 |
| Pagination | "Records: 1 to 100 of 167" | ✅ |

## 2. Add / Edit Patient (modal)

Fields (`*` required): **Name\***, Guardian Name, Gender, **Date Of Birth** (separate), **Age (yy-mm-dd)\***
(3 boxes Year/Month/Day), Blood Group, Marital Status, **Patient Photo (drag-drop upload)**, Phone,
Email, Address, Remarks, **Any Known Allergies**, **TPA** (select), **TPA ID**, **TPA Validity** (date),
National Identification Number, Alternate Number. → Save.
Status: 🟡 — we have most fields but need: DOB separate from Age, 3-part Age input, photo file upload,
Marital Status, Known Allergies (we have), TPA ID/Validity (we have).

---

## 3. Patient Profile — 360 view (`/patient/profile/{id}`)

Top tabs: **Overview · Visits · Lab Investigation · Treatment History · Timeline · Vitals**.

### 3.1 Overview tab
**Left column**
- **Header card**: photo, Name (ID), Gender, Age, Guardian Name, Phone, TPA, TPA ID, TPA Validity,
  **Barcode**, **QR Code**. ❌ (barcode/QR generation)
- **Current Vitals**: Temperature, BP, Pulse, Height, Weight, **BMI** — each with value, unit,
  **status badge (Low / High / Normal)** and timestamp. BMI computed + color band. ❌
- **Known Allergies** (bullet list). ❌ (stored on patient, shown here)
- **Findings** (bullet list of clinical finding descriptions). ❌
- **Symptoms** (bullet list). ❌
- **Consultant Doctor** (avatar + name + ID, can be multiple). ❌
- **Timeline** (dated entries: title + description). ❌

**Right column**
- **Medical History** line chart — per-year counts for **OPD / Pharmacy / Pathology / Radiology /
  Blood Bank / Ambulance**. ❌
- **Visit Details** table: OPD No, Case ID, Appointment Date, Consultant, Reference, Symptoms. 🟡
- **Lab Investigation** table: Test Name, Case ID, **Lab (Pathology/Radiology)**, **Sample Collected**
  (collector + center + date), **Expected Date**, **Approved By**. ❌
- **Treatment History** table: OPD No, Case ID, Appointment Date, Consultant, Symptoms. 🟡

### 3.2 Visits tab
Table: OPD No, Case ID, Appointment Date, Consultant, Reference, Symptoms, **Previous Medical Issue**,
Action (**print / Rx-prescription / document / details / share**). **"New Visit"** button. 🟡

### 3.3 Lab Investigation tab
Aggregated pathology + radiology tests: Test Name (with code), Case ID, Lab, Sample Collected,
Expected Date, Approved By, Action. Row → **Lab Investigation Details** modal:
- Header: Bill No, Patient, Approve Date, Report Collection Date, Test Name, Expected Date,
  **Collection By**, **Pathology/Radiology Center**, Case ID, **Approved By**.
- Parameters table: #, **Test Parameter Name** (+ description), **Report Value**, **Reference Range**.
Status: ❌ — requires pathology/radiology tests to carry **per-parameter report values, reference
ranges, sample-collection & approval workflow**, not just a bill line.

### 3.4 Treatment History tab
Table: OPD No, Case ID, Appointment Date, Symptoms, Consultant, Action. 🟡

### 3.5 Timeline tab
Chronological entries (date, title, description) with edit/delete.
**Add Timeline** modal: Title\*, Date\*, Description, **Attach Document**, **Visible to this person**
(checkbox). ❌

### 3.6 Vitals tab
Matrix: **Date (rows) × Vital type (cols)**; each cell = value (time). Column headers show the
**reference range** (e.g. "Temperature (95.8–99.3 Fahrenheit)"). **Add Vital** modal: repeatable rows
of **Vital Name (select) + Vital Value + Date**, multi-add, Save. ❌

---

## 4. OPD Visit Details (`/patient/visitdetails/{case}/{opd}`)

Per-visit deep record. Tabs (horizontally scrollable):
**Overview · Visits · Medication · Lab Investigation · Operations · Charges · Payments ·
Live Consultation · Timeline · Treatment History · Vitals**.

### 4.1 Overview tab (per-visit 360)
- **Header**: photo, Name (ID), Gender, Age, Guardian, Phone, TPA/TPA ID/Validity, Barcode, QR;
  edit/delete/copy actions; **Case ID**, **OPD No**.
- **Current Vitals** (+ BMI, status badges).
- **Known Allergies · Findings · Symptoms · Consultant Doctor · Timeline** (same widgets as profile).
- **Billing summary bars** — one progress bar per department: **OPD / Pharmacy / Pathology /
  Radiology / Blood Bank / Ambulance PAYMENT/BILLING** showing `paid% $paid/$billed`. ❌
- **Medication** table (Date, Medicine Name, Dose, Time, Remark).
- **Lab Investigation** table.
- **Operation** table (Reference No, Operation Date, Operation Name, Operation Category, OT Technician).
- **Charges** table (Name, Charge Type, Standard, Discount, Tax, Applied, Amount).
- **Payment** table (Transaction ID, Date, Note, Payment Mode, Paid Amount).
- **Live Consultation** table (Consultation Title, Date, Created By, Created For, Patient).

### 4.2 Medication tab
List of administered doses. **Add Medication Dose** modal: Date\*, Time\*, **Medicine Category\***,
**Medicine Name\***, **Dosage\***, Remarks. ❌

### 4.3 Operations tab
Table (Reference No, Operation Date, Operation Name, Operation Category, OT Technician, Action).
**Add Operation** modal: Operation Category\*, Operation Name\*, Operation Date\*, **Consultant Doctor\***,
Assistant Consultant 1, Assistant Consultant 2, **Anesthetist**, **Anesthesia Type**, **OT Technician**,
**OT Assistant**, Remark, Result. ❌

### 4.4 Charges tab
Table: Date, Charge Name/Charge Note, Charge Type, **Charge Category**, Qty, Standard Charge,
**Applied Charge**, **TPA Charge**, Discount (amt + %), Tax (amt + %), Amount, Action
(print/edit/delete). **Total**. **Add Charges** modal (full width): **Apply TPA** toggle, Charge Type\*,
Charge Category\*, Charge Name\*, Standard Charge, TPA Charge, Qty\*, computed Total / Discount% / Tax% /
Net Amount, Charge Note, Date\*, **+Add** (line list), Save. 🟡 — maps to our invoice engine but must
be **scoped to the visit** and support Apply-TPA, per-line notes, multi-line add.

### 4.5 Payments tab
Table: Transaction ID, …, Paid Amount, Action. **Add Payment** modal: Date\*, Amount\*, Payment Mode
(Cash/…), Note. 🟡 (reuse payment engine, scope to visit).

### 4.6 Live Consultation tab
Table: Consultation Title, Date, Created By, Created For, Patient, **Status (Awaited/Finished)**,
Action (**Start** = join Zoom, delete). ❌ (patient-scoped consultations).

### 4.7 Visits / Lab Investigation / Timeline / Treatment History / Vitals
Same widgets as the profile tabs, scoped/available within the visit.

---

## 5. IPD Profile (`/patient/ipdprofile/{id}`)

Everything OPD has **plus** inpatient specifics. Tabs:
**Overview · Nurse Notes · Medication · Prescription · Consultant Register · Lab Investigation ·
Operations · Charges · Payments · Live Consultation · Bed History · Timeline · Treatment History ·
Vitals**.

### 5.1 Overview tab (adds vs OPD)
- Header adds **Admission Date**, **Bed** (e.g. "GF-101 – VIP Ward – Ground Floor").
- **Credit donut chart**: **Credit Limit**, **Used Credit Limit**, **Balance Credit Limit**, % used
  (turns red when over limit). ❌
- **Nurse Notes** widget (timeline: nurse name+id, Note, Comment, Created By).
- Right column adds: **Prescription** table (Prescription No, Date, Prescribe By, Generated By),
  **Consultant Register** table (Applied Date, Consultant Doctor, Instruction, Instruction Date),
  **Treatment History** (IPD No, Symptoms, Consultant, **Bed**), **Bed History** (Bed Group, Bed,
  From Date, To Date, Active Bed), and per-department billing bars incl. IPD.

### 5.2 Nurse Notes tab
Timeline of notes: **nurse (name+id)**, **Note**, **Comment**, **Created By**, edit/comment/delete.
**Add Nurse Note** modal. ❌

### 5.3 Medication tab (MAR — Medication Administration Record)
**Matrix**: Date (rows) × **Dose1…Dose8** (cols). Each medicine row per date; each dose cell shows
time + dosage + Created By, with **"+"** to add another dose. **Add Medication Dose** modal (Date,
Time, Medicine Category, Medicine Name, Dosage, Remarks). ❌

### 5.4 Prescription tab
List (Prescription No, Date, Finding, Action=view/print). **Add Prescription** button. Printable
**IPD Prescription** doc: hospital header, Prescription No, Date, Patient/Age/Gender/Blood Group/
Phone/Email, **Prescribe By**, **Consultant Doctor**, **Generated By**, **Symptoms**, **Finding**,
**Medicines** table (#, Category, Medicine, **Dosage**, **Dose Interval**, **Dose Duration**,
**Instruction**), **Radiology Test** list, **Pathology Test** list. ❌

### 5.5 Consultant Register tab
Table: Applied Date, **Consultant Doctor**, **Instruction**, **Consultant Date**, Action. Tracks
each doctor round/instruction. **+Consultant Register** modal. ❌

### 5.6 Bed History tab
Table: **Bed Group, Bed, From Date, To Date, Active Bed**. Records **bed transfers** across the stay.
❌ (needs a bed-transfer action that closes the old row and opens a new one).

### 5.7 Operations / Lab Investigation / Charges / Payments / Live Consultation / Timeline / Vitals
Same as OPD's (Operations, Charges w/ Apply-TPA, Payments, Live Consultation, Vitals matrix, Timeline).

---

## 6. New / Extended Domain Entities (summary)

| Entity | Purpose | New? |
|---|---|---|
| **VitalType** (name, unit, refMin, refMax) | Vitals master (Setup) | ❌ new |
| **VitalReading** (patient, encounter?, typeId, value, at, status) | time-series vitals + current + BMI | ❌ new |
| **FindingCategory / Finding** + **FindingRecord** (per encounter) | findings master + per-visit findings | ❌ new |
| **SymptomHead / SymptomType** + **SymptomRecord** | symptoms master + per-visit | ❌ new |
| **Prescription** (+ items: medicine cat/med/dosage/interval/duration/instruction; + pathology/radiology tests) | printable Rx per visit/IPD | ❌ new |
| **MedicationDose** (encounter, date, time, medicine, dosage, remarks, createdBy) | MAR list (OPD) / matrix (IPD) | ❌ new |
| **OperationRecord** (encounter, category, name, date, consultant, assistants, anesthetist, anesthesia type, OT tech/assistant, remark, result, refNo) | OT per encounter | ❌ new (OT catalog exists) |
| **ConsultantRegister** (ipd, appliedDate, doctor, instruction, consultantDate) | IPD doctor rounds | ❌ new |
| **NurseNote** (ipd, nurse, note, comment, createdBy, at) | IPD nursing timeline | ❌ new |
| **TimelineEntry** (patient/encounter, title, date, description, fileUrl, visibleToPatient) | patient timeline | ❌ new |
| **EncounterConsultant** (encounter, doctor) | multiple consultants | ❌ new |
| **BedTransfer / BedHistory** (ipd, bedId, fromDate, toDate, active) | bed history | ❌ new |
| **Diagnostic test result** (bill item → parameters with reportValue + referenceRange + collectionBy + approvedBy + center + sampleDate + expectedDate) | Lab Investigation depth | 🟡 extend |
| **Charge scoping** (invoice/items linked to opdVisitId/ipdAdmissionId; Apply-TPA; per-line note/qty) | per-encounter charges | 🟡 extend |
| **Payment scoping** (payments per encounter) | per-encounter payments | 🟡 extend |
| **Credit limit** on IPD admission (limit, used = sum charges, balance) | donut | 🟡 extend (field exists) |
| **Patient**: DOB, marital status, photo file, barcode/QR, deceased flag, allergies | header + list | 🟡 extend |
| **LiveConsultation**: link to patient + createdFor(doctor) + status Awaited/Finished + join URL | patient consults | 🟡 extend |
| **MedicalHistory aggregation** (per-year per-department counts) | overview chart | ❌ new (query) |
| **Per-department billing summary** (paid/billed per module for a case) | overview bars | ❌ new (query) |

## 7. Key cross-cutting behaviors
- **Encounter model**: an OPD visit and an IPD admission are each an **encounter** that aggregates
  charges, payments, medication, prescriptions, operations, lab tests, vitals, timeline, consultants,
  live consultations. Everything ties by **Case ID** + encounter id.
- **Vitals status**: computed vs VitalType reference range → Low / Normal / High; **BMI** auto from
  latest height+weight.
- **Lab Investigation** unifies pathology + radiology with parameter-level results & approval.
- **Charges/Payments** reuse the existing invoice engine but **scoped to the encounter**, with
  Apply-TPA and multi-line add; each encounter shows its own Total + per-department billing bars.
- **Print**: prescription, lab report, patient file, charges/bill — all printable with the hospital
  header/footer templates.
- Every list has the standard toolbar (search, page-size, Copy/Excel/CSV/PDF/Print) and row actions.
