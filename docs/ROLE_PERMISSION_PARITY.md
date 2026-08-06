# Role, Route & Permission Parity

Reference capture of Smart Hospital & Research Center's authorisation model, our
current state measured against it, and the plan to close the distance.

**Part I** is the captured reference spec, recorded as given.
**Part II** is what our system actually does today, measured — not assumed.
**Part III** is the phased plan.

One thing to settle before anything else, because it changes what "parity"
means. Part I section 7 documents *defects* in the reference build: a permission
editor that any authenticated user can read and submit, and five endpoints that
render real data server-side to roles with no view grant. Those are not
behaviours to reproduce. This document treats **section 6 (feature-level intent)
as the parity target** and **section 7 as anti-parity** — behaviour we
deliberately diverge from, listed explicitly in Part III so the divergence is a
decision on the record rather than an omission. Everything else is parity as
specified.

---

# Part I — The reference spec

## 1. How the permission system works

Permissions are stored per role and edited at `/admin/roles/permission/{role_id}`.
The editor renders **36 permission groups, 332 feature rows** (331 of which
expose a "view" toggle), and **751 individual checkboxes**. Each feature row
carries up to four independent toggles named `can_view-perm_{n}`,
`can_add-perm_{n}`, `can_edit-perm_{n}`, `can_delete-perm_{n}`, so a feature can
be readable without being writable, addable without being deletable, and so on.
Role id 7 (Super Admin) has no permission row at all — it is hard-coded to
bypass every check, which is why it returned 106 of 106 accessible routes.

Enforcement happens in three distinct layers, and they do not agree with each
other:

1. **The sidebar**, rendered from the permission set, hides most unauthorised modules.
2. **The controller guard**, which redirects to `/admin/unauthorized` and renders
   "Access Denied! You Are Not Authorised To Access This Page/Action."
3. **The AJAX datatable guard** on endpoints such as `POST /admin/income/getDatatable`,
   which returns the unauthorised page instead of JSON.

Because layer 2 is missing on a number of controllers, a hidden menu item does
not reliably mean a blocked page — see section 7.

Role ids: 1 Admin, 2 Accountant, 3 Doctor, 4 Pharmacist, 5 Pathologist,
6 Radiologist, 7 Super Admin, 8 Receptionist, 9 Nurse. `/admin/roles` returned 9 rows.

## 2. Roles and demo identities

| Role | id | Demo user | Landing page |
|---|---|---|---|
| Super Admin | 7 | Super Admin | `/admin/admin/dashboard` |
| Admin | 1 | Jason | `/admin/admin/dashboard` |
| Doctor | 3 | Sonia | `/admin/admin/dashboard` |
| Pharmacist | 4 | Harry | `/admin/admin/dashboard` |
| Pathologist | 5 | Belina | `/admin/admin/dashboard` |
| Radiologist | 6 | John | `/admin/admin/dashboard` |
| Accountant | 2 | Brad | `/admin/admin/dashboard` |
| Receptionist | 8 | Maria | `/admin/admin/dashboard` |
| Nurse | 9 | April | `/admin/admin/dashboard` |

## 3. Access summary (106-route grid)

| Role | Accessible | Denied | Sidebar links |
|---|---|---|---|
| Super Admin | 106 | 0 | 77 |
| Admin | 105 | 1 | 75 |
| Doctor | 71 | 35 | 42 |
| Receptionist | 70 | 36 | 40 |
| Accountant | 68 | 38 | 46 |
| Pharmacist | 57 | 49 | 18 |
| Pathologist | 57 | 49 | 20 |
| Radiologist | 57 | 49 | 17 |
| Nurse | 54 | 52 | 16 |

Every role returned zero LOGIN and zero NOTFOUND codes, so accessible + denied =
106 for all nine — the grid is internally consistent.

Dashboard widget rendering differs sharply and matches the config: Super Admin
and Admin see all 12 widgets, Accountant 7, Doctor 3, Pharmacist 3 (medicine
stock only, plus attendance), Radiologist 3 (outstanding bills), Pathologist 2
(today's appointments), Nurse 2, Receptionist 7.

## 4. Route × role matrix

SA = Super Admin, AD = Admin, DR = Doctor, PH = Pharmacist, PA = Pathologist,
RA = Radiologist, AC = Accountant, RE = Receptionist, NU = Nurse.
Y = page renders, · = redirected to `/admin/unauthorized`.

| # | Route | SA | AD | DR | PH | PA | RA | AC | RE | NU |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | /admin/admin/dashboard | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 2 | /admin/admin/search | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 3 | /admin/appointment/index | Y | Y | Y | · | · | · | · | Y | · |
| 4 | /admin/bill/dashboard | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 5 | /admin/birthordeath | Y | Y | Y | · | · | · | · | Y | · |
| 6 | /admin/birthordeath/death | Y | Y | Y | · | · | · | · | Y | · |
| 7 | /admin/bloodbank/products | Y | Y | · | · | Y | · | Y | · | · |
| 8 | /admin/bloodbankstatus/ | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 9 | /admin/charges | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 10 | /admin/content/list | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 11 | /admin/content/upload | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 12 | /admin/contenttype/ | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 13 | /admin/customfield | Y | · | · | · | · | · | · | · | · |
| 14 | /admin/dutyroster/roster_report | Y | Y | · | · | · | · | · | · | · |
| 15 | /admin/expense | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 16 | /admin/finding | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 17 | /admin/front/page | Y | Y | · | · | · | · | · | · | · |
| 18 | /admin/generatecertificate | Y | Y | Y | · | · | · | · | · | · |
| 19 | /admin/generatepatientidcard/ | Y | Y | Y | · | · | · | · | · | · |
| 20 | /admin/generatestaffidcard/ | Y | Y | · | · | · | · | · | · | · |
| 21 | /admin/holiday/index | Y | Y | · | · | · | · | · | · | · |
| 22 | /admin/icd10 | Y | Y | · | · | · | · | · | · | · |
| 23 | /admin/income | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 24 | /admin/incomehead | Y | Y | · | · | · | · | Y | · | · |
| 25 | /admin/itemcategory | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 26 | /admin/itemstock | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 27 | /admin/lab/addlab | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 28 | /admin/leavetypes | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 29 | /admin/medicinecategory/medicine | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 30 | /admin/multibranch/branch | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 31 | /admin/multibranch/branch/overview | Y | Y | · | · | · | · | · | · | · |
| 32 | /admin/multibranch/branch/report | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 33 | /admin/notification | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 34 | /admin/onlineappointment/index | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 35 | /admin/operationtheatre/index | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 36 | /admin/pathology/gettestreportbatch | Y | Y | Y | · | Y | · | · | Y | · |
| 37 | /admin/pathologycategory/addcategory | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 38 | /admin/patient/ipdsearch | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 39 | /admin/patient/search | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 40 | /admin/pharmacy/bill | Y | Y | · | Y | · | · | Y | Y | · |
| 41 | /admin/printing | Y | Y | · | · | · | · | · | Y | · |
| 42 | /admin/qrattendance/attendance/index | Y | Y | Y | · | · | · | · | · | · |
| 43 | /admin/qrattendance/setting/index | Y | Y | Y | · | · | · | · | · | · |
| 44 | /admin/radio/gettestreportbatch | Y | Y | Y | · | · | Y | Y | Y | · |
| 45 | /admin/referral/commission | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 46 | /admin/referral/payment | Y | Y | · | · | · | · | Y | · | · |
| 47 | /admin/report/ambulance | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 48 | /admin/report/appointment | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 49 | /admin/report/birth_death | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 50 | /admin/report/blood_bank | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 51 | /admin/report/finance | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 52 | /admin/report/human_resource | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 53 | /admin/report/inventory | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 54 | /admin/report/ipd | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 55 | /admin/report/live_consultation | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 56 | /admin/report/log | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 57 | /admin/report/opd | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 58 | /admin/report/ot | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 59 | /admin/report/pathology | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 60 | /admin/report/patient | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 61 | /admin/report/pharmacy | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 62 | /admin/report/radiology | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 63 | /admin/report/tpa | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 64 | /admin/setup/bed/status | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 65 | /admin/staff | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 66 | /admin/survey | Y | Y | · | · | · | · | · | · | · |
| 67 | /admin/survey/staff_forms | Y | Y | · | · | · | · | · | · | · |
| 68 | /admin/symptoms | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 69 | /admin/tpamanagement | Y | Y | Y | · | · | · | Y | Y | · |
| 70 | /admin/vehicle/getcallambulance | Y | Y | Y | · | · | · | Y | Y | · |
| 71 | /admin/visitors | Y | Y | · | · | · | · | · | Y | · |
| 72 | /admin/visitorspurpose | Y | Y | · | · | · | · | · | Y | · |
| 73 | /admin/vital | Y | Y | · | · | · | · | · | · | · |
| 74 | /admin/zoom_conference | Y | Y | · | · | · | · | · | · | · |
| 75 | /admin/zoom_conference/consult | Y | Y | Y | · | · | · | · | · | · |
| 76 | /admin/zoom_conference/meeting | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 77 | /schsettings | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 78 | /admin/roles | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 79 | /admin/roles/permission/9 | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 80 | /admin/users | Y | Y | · | · | · | · | · | · | · |
| 81 | /admin/language | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 82 | /admin/patient | Y | Y | Y | · | · | · | Y | Y | · |
| 83 | /admin/complaint | Y | Y | · | · | · | · | · | Y | · |
| 84 | /admin/dispatch | Y | Y | · | · | · | · | · | Y | · |
| 85 | /admin/receive | Y | Y | · | · | · | · | · | Y | · |
| 86 | /admin/department | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 87 | /admin/item | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 88 | /admin/issueitem | Y | Y | · | · | · | · | Y | Y | · |
| 89 | /admin/certificate | Y | Y | Y | · | · | · | · | · | · |
| 90 | /admin/expensehead | Y | Y | · | · | · | · | Y | · | · |
| 91 | /admin/chat | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 92 | /admin/payroll | Y | Y | · | · | · | · | Y | · | · |
| 93 | /admin/prefix | Y | Y | · | · | · | · | · | · | · |
| 94 | /admin/themestudio | Y | Y | · | · | · | · | · | · | · |
| 95 | /admin/front/gallery | Y | Y | · | · | · | · | · | · | · |
| 96 | /admin/front/media | Y | Y | · | · | · | · | · | · | · |
| 97 | /admin/front/banner | Y | Y | · | · | · | · | · | · | · |
| 98 | /admin/staffidcard | Y | Y | · | · | · | · | · | · | · |
| 99 | /admin/patientidcard | Y | Y | Y | · | · | · | · | · | · |
| 100 | /admin/referral/person | Y | Y | · | · | · | · | Y | · | · |
| 101 | /admin/setup/bed | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| 102 | /admin/unittype | Y | Y | Y | Y | · | Y | Y | · | · |
| 103 | /admin/taxcategory | Y | Y | Y | Y | · | Y | Y | · | · |
| 104 | /admin/survey/index | Y | Y | · | · | · | · | · | · | · |
| 105 | /admin/audit | Y | Y | · | · | Y | · | · | · | · |
| 106 | /admin/captcha | Y | Y | · | · | · | · | · | · | · |

**Routes confirmed not to exist on this build** (returned "Page Not Found" even
as Super Admin — do not put them in test suites): `/admin/postal`,
`/admin/designation`, `/admin/store`, `/admin/supplier`, `/admin/bloodbank`,
`/admin/shift`, `/admin/annualcalendar`, `/admin/referralcategory`,
`/admin/notice`, `/admin/todo`, `/admin/attendance`, `/admin/leaverequest`,
`/admin/backup`, `/admin/paymentmethod`, `/admin/front/menu`,
`/admin/front/event`, `/admin/front/news`, `/admin/pathology`,
`/admin/radiology`, `/admin/medicine`, `/admin/inventory`, `/admin/opd`,
`/admin/ipd`, `/admin/tpacharges`, `/admin/chargecategory`,
`/admin/symptomshead`, `/admin/findingcategory`, `/admin/dutyroster`,
`/admin/zoom_conference/setting`, `/admin/generalsetting`, `/admin/smssetting`,
`/admin/emailsetting`, `/admin/notificationsetting`, `/admin/twofactor`,
`/admin/enquiry`, `/admin/opdpatient`, `/admin/ipdpatient`,
`/admin/bloodbankstatus/donor`, `/admin/vehicle`, `/admin/pathologyunit`,
`/admin/radiologyunit`, `/admin/disablestaff`, `/admin/whatsapp`,
`/admin/frontsetting`.

## 5. Module-level view permission (from the live config)

"Features with view granted / total features with a view toggle", in role-id
order Admin, Accountant, Doctor, Pharmacist, Pathologist, Radiologist,
Receptionist, Nurse.

| Module | Total | AD | AC | DR | PH | PA | RA | RE | NU |
|---|---|---|---|---|---|---|---|---|---|
| Dashboard and Widgets | 12 | 12 | 12 | 3 | 3 | 2 | 3 | 7 | 2 |
| Billing | 18 | 18 | 16 | 17 | 2 | 2 | 2 | 7 | 0 |
| Appointment | 9 | 9 | 5 | 7 | 0 | 0 | 0 | 9 | 0 |
| OPD | 22 | 22 | 12 | 18 | 1 | 3 | 4 | 12 | 13 |
| IPD | 30 | 30 | 18 | 23 | 1 | 4 | 5 | 11 | 15 |
| Pharmacy | 15 | 15 | 7 | 4 | 12 | 0 | 0 | 4 | 0 |
| Pathology | 9 | 9 | 4 | 4 | 0 | 9 | 0 | 2 | 0 |
| Radiology | 9 | 9 | 4 | 5 | 0 | 0 | 9 | 2 | 0 |
| Blood Bank | 8 | 8 | 6 | 5 | 1 | 8 | 0 | 5 | 0 |
| Ambulance | 4 | 4 | 4 | 2 | 0 | 0 | 0 | 4 | 0 |
| Front Office | 6 | 6 | 0 | 0 | 0 | 0 | 0 | 6 | 0 |
| Birth Death Record | 4 | 4 | 0 | 4 | 0 | 0 | 0 | 2 | 0 |
| Human Resource | 12 | 12 | 5 | 2 | 2 | 2 | 2 | 2 | 2 |
| Duty Roster | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Annual Calendar | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Referral | 4 | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| TPA Management | 2 | 2 | 2 | 2 | 0 | 0 | 0 | 2 | 0 |
| Income | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Expense | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Messaging | 3 | 3 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| Inventory | 6 | 6 | 6 | 0 | 0 | 0 | 0 | 2 | 0 |
| Download Center | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 |
| Certificate | 6 | 6 | 0 | 4 | 0 | 0 | 0 | 0 | 0 |
| Front CMS | 7 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Live Consultation | 3 | 3 | 1 | 2 | 1 | 1 | 1 | 1 | 1 |
| Reports | 47 | 47 | 26 | 18 | 2 | 5 | 1 | 17 | 4 |
| System Settings | 24 | 24 | 3 | 3 | 1 | 1 | 1 | 1 | 1 |
| Patient | 3 | 3 | 2 | 2 | 1 | 1 | 1 | 1 | 1 |
| Hospital Charges | 5 | 5 | 5 | 3 | 5 | 0 | 5 | 0 | 0 |
| Chat | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| Calendar To Do List | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| Survey Form | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Whatsapp Messaging | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Two Factor Authenticator | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| QR Code Attendence | 2 | 2 | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| Multi Branch | 40 | 40 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Admin holds view on all 331 view-capable features; Super Admin bypasses the
table entirely.

## 6. Feature-level CRUD matrix

**Encoding:** one hex digit per role, bits `1`=view, `2`=add, `4`=edit,
`8`=delete. So `f`=full CRUD, `3`=view+add, `b`=view+add+delete, `5`=view+edit,
`7`=view+add+edit, `d`=view+edit+delete, `a`=add+delete, `9`=view+delete.
**Digit order: Admin, Accountant, Doctor, Pharmacist, Pathologist, Radiologist,
Receptionist, Nurse.**

### Dashboard and Widgets
Staff Role Count Widget `11110111` · Total Revenue `11100010` · Bed Occupancy `11000010` ·
Medicines Stock `11010010` · Today's Appointments `11001010` · Outstanding Bills `11000100` ·
Blood Bank `11000000` · Recent Activity `11000010` · Yearly Income & Expense Chart `11000000` ·
Monthly Income Overview `11000000` · Notification Center `11111111` · Income by Module `11000000`

### Billing
OPD Billing `11100010` · OPD Billing Payment `33300000` · IPD Billing `11100010` ·
IPD Billing Payment `33300000` · Pharmacy Billing `11110010` · Pharmacy Billing Payment `33130000` ·
Pathology Billing `11101010` · Pathology Billing Payment `33103000` · Radiology Billing `11100110` ·
Radiology Billing Payment `33100300` · Blood Bank Billing `11100010` · Blood Bank Billing Payment `33100000` ·
Ambulance Billing `11100010` · Ambulance Billing Payment `33300000` · Generate Bill `11100000` ·
Generate Discharge Card `11100000` · Appointment Billing `10100000` · Payment Receipt Header Footer `10000000`

### Appointment
Slot `fff000f0` · Doctor Shift `55500050` · Shift `fff000f0` · Doctor Wise Appointment `11100010` ·
Patient Queue `11100010` · Appointment `b0b000b0` · Reschedule `10100010` ·
Print Appointment Header Footer `10000010` · Appointment Priority `f00000f0`

### OPD
OPD Patient `f7f111f1` · Prescription `f0f00001` · Visit `f7f001f1` · OPD Timeline `f0f0000f` ·
OPD Prescription Print Header Footer `10100000` · Move Patient in IPD `10100011` ·
Manual Prescription `10100011` · Charges `fff000f0` · Payment `fbb000b0` · OPD Medication `f1f0000f` ·
Operation Theatre `f1f00001` · Lab Investigation `11101111` · Patient Discharge `55500051` ·
Patient Discharge Revert `10100010` · Treatment History `11101011` · Checkup `f1f001f1` ·
Print Bill `11100010` · Live Consult `11100001` · OPD Vitals `f0000000` · Antenatal `f0000000` ·
OPD Antenatal Finding Print Header Footer `10000000` · OPD Bill Print Header Footer `50000000`

### IPD
IPD Patients `f7f111f1` · Discharged Patients `f7f011f1` · Consultant Register `f0f0000f` ·
IPD Timeline `f0f0000f` · Charges `fff000f0` · Payment `fbb000b0` · Bed `f0f000f1` ·
IPD Prescription Print Header Footer `11100000` · Bed Status `11100011` · Prescription `f0f00001` ·
IPD Bill Print Header Footer `11100000` · IPD Medication `fff0000f` · Bed History `11100011` ·
Lab Investigation `11101101` · Patient Discharge `51500151` · Patient Discharge Revert `11100010` ·
Nurse Note `f0f0000f` · Bed Type `fff00000` · Bed Group `fff00000` · Floor `fff00000` ·
Operation Theatre `f1f00011` · Live Consult `11100001` · Treatment History `11101111` ·
IPD Vitals `f0000000` · Previous Obstetric History `f0000000` · Postnatal History `f0000000` ·
Antenatal `f0000000` · IPD Antenatal Finding Print Header Footer `10000000` ·
Discharge Summary Print Header Footer `10000000` · IPD Obstetric History Print Header Footer `10000000`

### Pharmacy
Medicine `f11f0010` · Pharmacy Bill `f10f0010` · Medicine Category `f00f0000` ·
Medicine Bad Stock `b10b0010` · Pharmacy Bill print Header Footer `10010000` ·
Import Medicine `10010000` · Medicine Purchase `b10b0010` · Medicine Supplier `f01f0000` ·
Medicine Dosage `f00f0000` · Dosage Interval `f31f0000` · Dosage Duration `f31f0000` ·
Partial Payment `b30b0000` · Unit `f0000000` · Company `f0000000` · Medicine Group `f0000000`

### Pathology
Pathology Test `f110f010` · Pathology Category `f000f000` · Print Header Footer `10001000` ·
Pathology Bill `f010f010` · Pathology Unit `f000f000` · Pathology Parameter `f000f000` ·
Add/Edit Collection Person `55105000` · Partial Payment `bb00b000` · Add/Edit Report `55105000`

### Radiology
Radiology Test `f1100f10` · Radiology Bill `f1100f10` · Radiology Category `f0000f00` ·
Print Header Footer `10100100` · Radiology Unit `f0000f00` · Radiology Parameter `f0000f00` ·
Partial Payment `bb000b00` · Add/Edit Collection Person `55100500` · Add/Edit Report `50100500`

### Blood Bank
Blood Issue `f130f010` · Blood Donor `f000f010` · Blood Stock `b111b010` ·
Print Header Footer `10101000` · Blood Bank Product `f100f000` · Blood Bank Components `b110b010` ·
Issue Component `f110f010` · Partial Payment `bb00b000`

### Ambulance
Ambulance Call `f11000f0` · Ambulance `f11000f0` · Print Header Footer `11000010` ·
Partial Payment `bb0000b0`

### Front Office
Visitor Book `f00000f0` · Phone Call Log `f00000f0` · Postal Dispatch `f00000f0` ·
Postal Receive `f00000f0` · Complain `f00000f0` · Setup Front Office `f00000f0`

### Birth Death Record
Birth Record `f0f00010` · Death Record `f0f00010` · Birth Print Header Footer `10100000` ·
Death Print Header Footer `10100000`

### Human Resource
Staff `ff111111` · Disable Staff `10000000` · Staff Attendance `71000000` · Staff Payroll `f1000000` ·
Approve Leave Request `f0000000` · Apply Leave `bbbbbbbb` · Leave Types `f0000000` ·
Department `f0000000` · Designation `f0000000` · Can See Other Users Profile `10000000` ·
Staff Timeline `aaa00000` · Print Payslip Header Footer `11000000` · Specialist `f0000000`

> **Apply Leave** is the single row with no `can_view` toggle — add/delete only,
> granted to every role. That is why the group counts 13 rows but 12
> view-capable features.

### Duty Roster
Duty Roster `10000000` · Shift `f0000000` · Roster List `b0000000` · Roster Assign `f0000000`

### Annual Calendar
Annual Calendar `f0000000`

### Referral
Referral Category `ff000000` · Referral Commission `ff000000` · Referral Person `ff000000` ·
Referral Payment `ff000000`

### TPA Management
Organisation `ff100010` · TPA Charges `dd100010`

### Income
Income `ff000000` · Income Head `ff000000`

### Expense
Expense `ff000000` · Expense Head `ff000000`

### Messaging
Notice Board `ffffffff` · Email / SMS `11111111` · Send Credential `10000000`

### Inventory
Issue Item `bb000010` · Item Stock `ff000010` · Item `ff000000` · Store `ff000000` ·
Supplier `ff000000` · Item Category `ff000000`

### Download Center
Content Type `ff111111` · Content Share List `99111111` · Upload/Share Content `bb111111` ·
Generate URL `11111111` · Share `11111111`

### Certificate
Generate Certificate `10100000` · Certificate `f0f00000` · Generate Staff ID Card `10000000` ·
Staff ID Card `f0000000` · Generate Patient ID Card `10100000` · Patient ID Card `f0f00000`

### Front CMS
Menus `b0000000` · Media Manager `b0000000` · Banner Images `b0000000` · Pages `f0000000` ·
Gallery `f0000000` · Event `f0000000` · News `f0000000`

### Live Consultation
Live Consultation `b0b00000` · Live Meeting `b1b11111` · Setting `50000000`

### Reports
OPD Report `11100011` · Staff Attendance Report `10000010` · Payroll Report `10000000` ·
IPD Report `11100011` · Pharmacy Bill Report `11010000` · Pathology Patient Report `11001010` ·
Radiology Patient Report `11000110` · OT Report `11100011` · Blood Donor Report `10101010` ·
Payroll Month Report `10000000` · Payroll Report `10000000` · User Log `10000000` ·
Patient Login Credential `11100000` · Email / SMS Log `11000000` · TPA Report `11100000` ·
Ambulance Report `11100010` · Discharge Patient Report `11100010` · Appointment Report `11100010` ·
Blood Issue Report `10101000` · Income Report `11000000` · Expense Report `11000000` ·
Income Group Report `11000000` · Expense Group Report `11000000` · Inventory Stock Report `11000010` ·
Inventory Item Report `11000010` · Inventory Issue Report `11000010` · Expiry Medicine Report `10010010` ·
Birth Report `10100010` · Death Report `10000010` · OPD Balance Report `10100000` ·
IPD Balance Report `11100000` · Live Consultation Report `11100000` · Live Meeting Report `11100000` ·
All Transaction Report `11000000` · Patient Visit Report `11100011` · Patient Bill Report `11000000` ·
Referral Report `11000000` · Component Issue Report `10101000` · Audit Trail Report `10001000` ·
Radiology Balance Report `10000000` · Pathology Balance Report `10000000` ·
Staff Day Wise Attendance Report `10000000` · Balance Amount Report `10100000` ·
Processing Transaction Report `10000000` · Stock Report `10000000` ·
Medicine Purchase Report `10000000` · Medicine Purchase Return Report `10000000`

### System Settings
Languages `30000000` · General Setting `51000000` · Notification Setting `51000000` ·
SMS Setting `50000000` · Email Setting `50000000` · Front CMS Setting `50000000` ·
Payment Methods `50000000` · Users `10000000` · Backup `b0000000` · Restore `10000000` ·
Symptoms Type `f0f00000` · Language Switcher `10111111` · Symptoms Head `f0f00000` ·
Prefix Setting `50000000` · Captcha Setting `50000000` · System Notification Setting `55000000` ·
Findings `f0000000` · Finding `f0000000` · Finding Category `f0000000` · Vital `f0000000` ·
Attendance Setting `50000000` · ICD-10 Groups `f0000000` · ICD-10 Codes `f0000000` ·
Theme Studio `50000000`

### Patient
Patient `f7f11171` · Enabled/Disabled `11100000` · Import `10000000`

### Hospital Charges
Hospital Charges `ff1f0f00` · Charge Category `ff0f0f00` · Charge Type `fb0b0b00` ·
Tax Category `ff1f0f00` · Unit Type `ff1f0f00`

### Small single-feature groups
Chat `11111111` · Calendar To Do List `ffffffff` · Survey Form → Survey Form `f0000000`,
My Survey `10000000` · Whatsapp Messaging `10000000` · Two Factor Authenticator →
Setting `10000000`, Setup 2FA `10000000` · QR Code Attendence → Attendance `10100000`,
Setting `10100000`

### Multi Branch
All 40 features are `10000000` — Admin only, no other role has any bit set:
Overview, Setting, Appointment Report, OPD Report, IPD Report, Pharmacy Report,
Medicine Expiry Report, Pathology Report, Radiology Report, Blood Donor Report,
Blood Issue Report, Component Issue Report, Ambulance Report, Birth Report,
Death Report, Payroll Report, Income Report, Income Detailed Report, Expense
Report, Expense Detailed Report, Live Consultation Report, OT Report,
Transaction Report, Transaction Detailed Report, and the sixteen Overview
sub-views (Appointment, OPD, IPD, Operation Theatre, Pharmacy, Pathology,
Radiology, Blood Donor, Blood Issue, Component Issue, Ambulance, Birth Record,
Death Record, Staff Attendance, Staff Payroll, Transactions).

## 7. Enforcement gaps found during validation

> **These are the reference build's defects. They are anti-parity — see Part III §C.**

The most serious finding is that **role and permission administration is not
guarded at all**. `/admin/roles` and `/admin/roles/permission/{id}` returned a
fully rendered page for every one of the nine roles, including Nurse, the least
privileged. Fetched as Nurse, `/admin/roles` returned 9 data rows and
`/admin/roles/permission/9` returned 332 rows with 751 checkboxes and a working
submit button. Since the permission editor is the control surface for the entire
authorisation model, any authenticated user can read the full security
configuration and, on the face of it, post changes to it. The form was not
submitted — verified read-only. This is a privilege-escalation path.

A second cluster: server-rendered pages that load for roles with zero configured
view permission. `/schsettings` loads for all nine roles despite System Settings
granting Nurse only 1 of 24. `/admin/language` returned 78 rows and 155
checkboxes to Nurse. `/admin/charges` returned 10 rows of charge data to Nurse
despite Hospital Charges being 0 of 5 for that role. `/admin/contenttype/`
returned 4 rows. `/admin/income`, `/admin/expense`, `/admin/itemstock`,
`/admin/item`, `/admin/itemcategory`, `/admin/multibranch/branch`,
`/admin/multibranch/branch/report`, `/admin/symptoms`, `/admin/finding`,
`/admin/department`, `/admin/leavetypes`, `/admin/referral/commission`,
`/admin/setup/bed`, `/admin/setup/bed/status`, `/admin/operationtheatre/index`,
`/admin/lab/addlab`, `/admin/medicinecategory/medicine`,
`/admin/pathologycategory/addcategory` and all 17 `/admin/report/*` landing
pages behave the same way. Multi Branch is the starkest case: Admin-only across
all 40 features, yet `/admin/multibranch/branch` and
`/admin/multibranch/branch/report` load for everyone, while only
`/admin/multibranch/branch/overview` is properly blocked.

The mitigating factor is that the AJAX layer *is* enforced. `POST
/admin/income/getDatatable` as Nurse returned the unauthorised page rather than
JSON, and most of the gap pages came back as empty shells with zero rows. So
exposure splits into two tiers: pages that leak only an empty UI, and the
genuinely leaky set that renders data server-side — `/admin/roles`,
`/admin/roles/permission/{id}`, `/admin/charges`, `/admin/language`,
`/admin/contenttype/`.

There are also menu-versus-route inconsistencies in both directions. Nurse's
sidebar links `/admin/expensehead`, which is denied for Nurse — an access-denied
page reached from the user's own menu. Doctor's sidebar exposes Setup → Print
Header Footer while `/admin/printing` is denied. Accountant's sidebar shows
Appointment, yet `/admin/appointment/index` is denied and only
`/admin/onlineappointment/index` works. Conversely `/admin/customfield` is
denied even for Admin — Super Admin alone can open it, worth confirming as
intentional.

Properly enforced areas, for contrast: the whole Front Office cluster
(`/admin/visitors`, `/admin/visitorspurpose`, `/admin/complaint`,
`/admin/dispatch`, `/admin/receive` — Super Admin, Admin, Receptionist only,
exactly matching 6-of-6 versus 0-of-6), Front CMS, user management, Survey
Forms, Duty Roster, Annual Calendar, ICD-10, Theme Studio, Prefix and Captcha.

## 8. How to use this spec

For regression testing, treat section 4 as the assertion table: log in as a
role, request each route, assert a normal page for Y and a redirect to
`/admin/unauthorized` for ·. **Do not assert on HTTP status alone** — denied
requests still return 200 after the redirect; match on destination URL or on the
"You Are Not Authorised" text. Do not include the non-existent routes.

For permission work, **section 6 is the source of truth about intent** and
section 4 is the source of truth about behaviour. Where they disagree, section 7
names the controller missing its guard.

---

# Part II — Our system, measured

Measured against commit `92643ca` on `main`, dev database, 2026-08-04. Every
number below came from reading the code or querying the database, not from
assumption.

## A. What we have

**Roles — 10 (spec has 9).** `packages/shared/src/rbac/roles.ts` defines
`super_admin, admin, accountant, doctor, pharmacist, pathologist, radiologist,
receptionist, nurse` — all nine, exact match — **plus `patient`** for the
self-service portal. The tenth role is an addition of ours, not a gap.

**Permission atoms — 116.** `MODULES` (29) × `ACTIONS` (4). Confirmed by
`SELECT count(*) FROM permission` → 116.

**Grants per role**, from `role_permission`:

| Role | allowed | rows | Role | allowed | rows |
|---|---|---|---|---|---|
| super_admin | 116 | 116 | pathologist | 21 | 52 |
| admin | 116 | 116 | pharmacist | 21 | 52 |
| accountant | 47 | 84 | radiologist | 18 | 48 |
| doctor | 35 | 76 | nurse | 14 | 40 |
| receptionist | 35 | 84 | patient | 10 | 32 |

**Enforcement — one layer, and it is the right one.** `PermissionsGuard`
(`apps/api/src/rbac/permissions.guard.ts`) checks the `(module, action)` declared
by `@RequirePermission` against the JWT's permission list and throws
`ForbiddenException`. Its own doc comment states the principle we already hold:
*"This is the REAL access boundary — UI hiding is cosmetic only."*

**Guard coverage — 383 of 402 HTTP handlers (95%).** Per-controller audit:
every business controller is at 100% except six.

## B. Gap 1 — granularity: 116 atoms vs 751

This is the structural gap and it dominates everything else.

| | Reference | Ours | Ratio |
|---|---|---|---|
| Permission groups | 36 | 29 modules | — |
| Feature rows | 332 | 29 | 11.4× |
| Checkboxes / atoms | 751 | 116 | 6.5× |

We grant `opd:view`. The spec grants view independently on 22 OPD features —
OPD Patient, Prescription, Visit, Timeline, Move Patient in IPD, Charges,
Payment, Medication, Lab Investigation, Patient Discharge, Checkup, Vitals,
Antenatal and the rest. Consequences visible in the data we already hold:

- **Nurse** is `opd:view` + `ipd:view` with no write. The spec gives Nurse
  `f`(full CRUD) on OPD Timeline, OPD Medication, IPD Consultant Register, IPD
  Timeline, IPD Medication and Nurse Note, while withholding OPD Patient
  add/edit. We cannot express "may write nurse notes but may not register a
  patient" — one module, one switch.
- **Patient Discharge** is `55500051` — view+edit for Admin/Accountant/Doctor,
  view+edit for Nurse, nothing for the diagnostic roles. Ours falls under
  `ipd:edit`, which also unlocks admission editing.
- **Partial Payment** is a distinct feature in five modules (`b`/`bb00b000` etc.).
  Ours is `billing:add`.

## C. Gap 2 — no permission editor exists

The reference's `/admin/roles/permission/{id}` has **no counterpart in our
system at all**. Grants are computed in code by `defaultGrantsFor()` and seeded
into `role_permission`; there is no UI and no API to change them at runtime. An
admin who wants to vary a permission today needs a code change and a redeploy.

Note the irony worth keeping: the reference's editor is also its worst
vulnerability. We get to build the surface *with* the guard from the start.

## D. Gap 3 — five spec groups have no module

Verified absent from `modules.ts`, the API, and the web app:

| Spec group | Features | Reference grants | Ours |
|---|---|---|---|
| Chat | 1 | all 8 roles view | **absent** |
| Calendar To Do List | 1 | all 8 roles full CRUD | **absent** |
| Survey Form | 2 | Admin only | **absent** |
| Whatsapp Messaging | 1 | Admin only | **absent** |
| Two Factor Authenticator | 2 | Admin only | **absent** |

Two more are shape mismatches rather than absences:

- **Income and Expense are two groups in the spec** (2 features each, both
  `ff000000`); we have one module, `finance`.
- **Hospital Charges is its own group** (5 features, and notably the only group
  where Pharmacist and Radiologist hold `f`); ours lives inside `setup`.

## E. Gap 4 — our own enforcement holes

Six controllers have handlers with no `@RequirePermission`. Three are correct
and three are not:

| Controller | Handlers | Guarded | Verdict |
|---|---|---|---|
| `auth.controller.ts` | 4 | 0 | **Correct** — login/refresh must be public |
| `health.controller.ts` | 1 | 0 | **Correct** — liveness probe |
| `portal.controller.ts` | 9 | 0 | **Correct** — every handler routes through `PortalService.requirePatient`, which scopes to the caller's own records; `register` is explicitly `@Public()`. Verified, not assumed |
| `cms.controller.ts` | 8 | 6 | 2 unguarded, both under `public/` — the marketing site, intentional |
| `custom-field.controller.ts` | 4 | 3 | **1 genuinely unguarded** |
| `workforce.controller.ts` | 19 | 18 | **1 genuinely unguarded** |
| `meta.controller.ts` | 1 | 0 | **1 genuinely unguarded** |
| `directory.controller.ts` | 1 | 0 | **1 genuinely unguarded** |

So the real hole is **4 handlers**, not 19 — the rest are correct by design.

Underneath those four is a design decision worth revisiting: the permissions
guard **fails open**. `if (!required) return true` means any handler someone
forgets to decorate is reachable by every authenticated user, including
`patient`. That is the same failure mode as the reference's missing controller
guards, reached by a different route.

The fix is cheap because the machinery already exists: `@Public()`
(`apps/api/src/common/decorators/public.decorator.ts`) is already defined and
already honoured — but by `JwtAuthGuard`, for *authentication*. Extending the
same decorator to satisfy `PermissionsGuard`, then flipping its default to
fail-closed, makes this class of gap impossible to reintroduce without an
explicit, greppable opt-out.

## F. What already matches

Worth stating so it isn't re-litigated. All nine role names and their semantics
match. The module→role access shape in `OPERATIONAL_ACCESS` broadly tracks
section 5 — Front Office is Receptionist-only, Front CMS and Multi Branch are
Admin-only, Duty Roster and Annual Calendar are Admin-only, Download Center is
open to everyone, Messaging is near-universal. Our guard is enforced at the API,
which is the layer that matters, and it does not have the reference's
sidebar-versus-route disagreement because both read the same permission list.

---

# Part III — The plan

Ordered by what unblocks what. Phases R0–R2 are the structural work; nothing
else can be accurate until the permission atom is feature-shaped.

## Phase R0 — Feature-level permission model

Replace the 29-module × 4-action matrix with the spec's 36 groups / 332
features, preserving module keys as the group layer.

1. `packages/shared/src/rbac/features.ts` — the 332 feature rows, each
   `{ key, group, label, actions: ActionKey[] }`. `Apply Leave` carries
   `['add','delete']` with no `view`; every other row includes `view`.
2. Transcribe section 6 into `DEFAULT_GRANTS: Record<RoleKey, Record<FeatureKey, number>>`
   using the hex encoding directly — it is compact and diffable against the spec.
3. Migration: **add** the 751 feature rows to `permission` and seed
   `role_permission` for them, leaving the existing 116 module rows in place.
   Module keys are derived at read time (`opd:view` = OR over the OPD group) so
   existing `@RequirePermission('opd','view')` call sites keep working during
   the transition. The module rows are retired per-module in R1, not replaced
   here — see the R0 finding below for why replacing them would escalate.
4. `Ability` gains `canFeature(featureKey, action)` alongside today's `can()`.

**Verification:** assert the seeded matrix reproduces section 5's counts exactly
— 331 view-capable features, Admin 331/331, Nurse's per-module counts
(OPD 13, IPD 15, Reports 4, …). That table is a checksum on the transcription,
and it will catch a mistyped hex digit.

### R0 finding — the rollup must never be persisted

Building R0.3 turned up a defect in this plan's original ordering, worth
recording because it would have shipped as a privilege escalation.

`deriveModulePermissions` ORs a group's features up to `module:action`, which is
what keeps today's call sites working. But a nurse holds `delete` on OPD
Timeline, OPD Medication and Nurse Note — so the rollup yields `opd:delete` and
`ipd:delete`, and *that* is the key guarding `DELETE /opd/:id`, the entire
visit. On the encounter row itself the nurse holds view and nothing else.

So the rollup is sound as a **read-time compatibility shim** and unsound as
**stored state**. R0.4 as first written — "rewrite role_permission from the hex
table" — would have granted every nurse the ability to delete visits and
admissions.

**The order is therefore R1 before R0.4**, and R0.4 loses the reseed:

- Migrate call sites to feature keys first, so the precise check is the one
  being enforced.
- Only once a module has no module-level call sites left may its module rows be
  retired.
- `role_permission` keeps its current module rows untouched until then.

Locked in by `ability.test.ts`, "the rollup over-grants delete on encounter
modules", which asserts the divergence rather than papering over it.

A second finding, benign: the rollup yields 102 keys for super_admin, not 116.
Dashboard, Reports, Multi Branch and QR Attendance are view-only across every
feature, and Billing has no edit or delete anywhere. No controller guards any of
those 14 absent pairs, so nothing fails closed — but a future call site needing
one has to change the feature table, not the guard.

## Phase R1 — Migrate call sites to feature keys — **DONE**

Re-decorate the guarded handlers from module granularity to feature
granularity. Mechanical but large; done module by module, following the same
order as the blueprint work (OPD, IPD, Patient, Appointment first).

**Ran before R0.4** — see the finding above.

### What R1 actually turned up

It was not mechanical. Three kinds of thing came out of it:

1. **Rights nobody had.** Every clinical record was gated on `patient:edit`,
   which no operational role holds, so a nurse could not write a nurse note.
   `ipd.nurse_note` is `f0f0000f` and now she can.
2. **Rights everybody had.** `/masters/:catalog` served 25 masters behind one
   `setup:*` switch; `reports:view` was one switch over the whole reporting
   suite. Both are now per-feature, and the per-role answers differ sharply —
   the reports menu went from 24 items for everyone to 24/15/11/5/1/14/4.
3. **Data-dependent authorisation a decorator cannot express.** Billing rows by
   module, leave requests by owner, staff profiles by self-vs-other. These live
   in the services, using `abilityOf(user)` from `rbac/ability-of.ts`.

Three of the four unguarded handlers from Part II §E were closed in passing:
`POST /hr/attendance/mark`, `GET /custom-fields`, and the catalog reads. The
guard is still fail-open, which is what R3 fixes.

### Deliberately left module-level

There is no feature key to migrate these to, and inventing one would be worse
than leaving them visible:

| Handler | Why |
| --- | --- |
| `DELETE /invoices/:id/payments/:paymentId` | No Billing feature has a delete toggle. Now a soft delete (`payment_void`). |
| `/invoices` reads and payment add | Coarse gate here, per-module assertion in `InvoiceService`. |
| `clinical/findings`, `clinical/symptoms` | The spec has Findings and Symptoms Type as System Settings *masters*; no feature covers recorded values. |
| `/custom-fields` (4) | Custom Fields have no permission row in the spec at all. |

### Two inferred mappings, flagged for review

Both concern Operations, and both are recorded in code as well as here:
`operation-category` (in `masters/catalog-features.ts`) and the Operations
master list (in `operation.controller.ts`) take `ipd.operation_theatre`, on the
reading that whoever manages operations manages the list of them. The spec
models Operation Theatre only as an encounter record and never exposes its
masters.

## Phase R2 — The permission editor

Build what the reference has at `/admin/roles/permission/{id}`: 36 collapsible
groups, a row per feature, up to 4 checkboxes per row, group-level and
column-level select-all. Plus what the reference lacks:

- `@RequirePermission('setup','edit')` on both the read and the write endpoint —
  **the defect in Part I §7 is not reproduced**;
- Super Admin's row is not editable and not rendered as editable;
- an audit record per change (we already have `AuditService`).

## Phase R3 — Close our own holes (Part II §E) — **DONE**

`PermissionsGuard` now fails **closed**. A handler that declares nothing is
denied, with a message naming the fix rather than the symptom. Every one of the
372 route handlers must now say which of four kinds it is:

| Decorator | Count | Meaning |
| --- | --- | --- |
| `@RequireFeature` | 307 | a named feature and action |
| `@RequireFeatureFor` | 34 | the feature depends on the request |
| `@RequirePermission` | 13 | legacy module gate; the documented exceptions |
| `@Authenticated` | 12 | signed in is the whole check |
| `@Public` | 6 | no authentication at all |
| *nothing* | **0** | — |

### The audit found thirteen, not four

The earlier count of four came from a grep that could let one handler's
decorator vouch for the handler next to it. Reading decorators forward-only —
attributing them to the handler that follows, never the one before — found
thirteen. Two were genuinely forgotten (`meta/modules`, `directory/doctors`);
`directory/doctors` now takes `human_resource.staff:view`, which is what a
doctor lookup is. The other eleven were legitimate and now say so with
`@Authenticated`: your own profile and password, the patient portal's eight
endpoints, and the reports catalogue.

`@Authenticated` exists so that "no permission needed" is a decision on the
record instead of an absence. Before the flip, a deliberate exemption and a
forgotten decorator were the same thing to both the reader and the runtime.

### Verified

- The guard spec asserts the default is deny; flipping the branch back to
  `return true` makes exactly those assertions fail, so the test is load-bearing.
- Login, health and the CMS marketing routes still answer unauthenticated —
  `@Public` had to be honoured here too, or the flip would have broken sign-in.
- All 114 parameterless GET routes probed as Admin: zero "declares no
  permission" denials. The only 403s are the patient portal's own
  `requirePatient` boundary correctly refusing a staff account.

The one thing R3 does not do is remove `Ability.canFeature`'s module fallback.
It still exists, and it still means a token carrying no feature keys silently
degrades to module granularity. That was deliberate for R0.4 and is now the
last thing standing between us and a fully feature-level system — but removing
it is its own change, with a session-invalidation cost, and belongs with R2.

## Phase R4 — The five missing modules

Chat, Calendar To Do List, Survey Form, Whatsapp Messaging, Two Factor
Authenticator. Independent of R0–R3 and independently schedulable; Chat and
To Do List are the only two granted to non-Admin roles, so they carry the most
user-visible weight.

Also in this phase: split `finance` into `Income` and `Expense` groups, and lift
`Hospital Charges` out of `setup` into its own group.

## Phase R5 — The regression grid

Section 8's methodology, adapted: our API returns 403 rather than redirecting, so
assert on status and the `Missing permission:` body. Build the 9-role × N-route
table as an automated test, seeded from `DEFAULT_GRANTS` so the test and the
model cannot silently drift apart.

## C. Anti-parity — deliberate divergence

Recorded so these read as decisions, not oversights. We do **not** reproduce:

1. **The unguarded permission editor.** Part I §7's privilege-escalation path.
   Ours is guarded on read and write (R2).
2. **The five server-side data leaks** (`/admin/charges`, `/admin/language`,
   `/admin/contenttype/` and the two roles routes rendering real rows to
   unauthorised roles).
3. **The ~35 pages that render an empty shell** to roles with zero view grant.
   Ours 403 at the API, so the page has nothing to render either way.
4. **The sidebar/route disagreements** (Nurse's menu linking a denied
   `/admin/expensehead`, etc.). Both our layers read one permission list, so
   this class of bug cannot occur.
5. **Super Admin as a hard-coded bypass with no permission row.** Ours holds a
   real 116-row (soon 751-row) grant set. Same effective access, but auditable,
   and it means the editor can display it.

Where the spec's *intent* (section 6) and the reference's *behaviour* (section 4)
disagree, we implement section 6.
