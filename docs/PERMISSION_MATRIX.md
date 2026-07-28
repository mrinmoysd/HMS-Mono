# Smart Hospital — Roles & Permission Matrix

Complete role → module access model. Two layers:

1. **Module (navigation) access** — is the module in the sidebar at all (this doc, §2–3).
2. **Feature action rights** — View / Add / Edit / Delete per feature *within* an accessible
   module, stored in `role_permission` and admin-editable (Setup → Roles Permissions). §4.

Source: FRD §2.31 (captured by logging into the live demo as each role). These are the
**seed defaults**; everything is reconfigurable at runtime.

## 1. Roles (10)
| Role | Persona | Scope |
|---|---|---|
| **Super Admin** | Owner / IT admin | Full access to every module + system config; `protected`. |
| **Admin** | Operations manager | Near-full; **cannot** edit Super Admin's permission matrix; Setup omits Custom Fields/Roles/Users as dedicated links (reachable via Settings tabs). |
| **Accountant** | Finance officer | Broadest non-admin: full clinical set + Finance/Referral/TPA/Inventory + 14 report cats. |
| **Doctor** | Physician/surgeon | Clinical focus; Live Consultation (Consult + Meeting); 11 report cats. |
| **Pharmacist** | Pharmacy staff | Narrow: Pharmacy-centric; Pharmacy reports only. |
| **Pathologist** | Lab/pathology | Narrow: lab-centric; Pathology/Blood Bank/Log reports. |
| **Radiologist** | Imaging | Narrow: imaging-centric; Radiology reports only. |
| **Receptionist** | Front desk | Front-desk broad; unique access to Front Office + Birth/Death; 12 report cats. |
| **Nurse** | Ward/nursing | Most restricted: Dashboard/Patient/OPD/IPD/HR/Messaging + OPD/IPD/OT/Patient reports. |
| **Patient** *(portal)* | Self-service | Own records only (appointments, reports, bills, prescriptions). Not in admin sidebar. |

**Super Admin & Admin** have the full module list (Patient, Billing, Appointment, OPD, IPD,
Pharmacy, Pathology, Radiology, Blood Bank, Ambulance, Front Office, Birth & Death, Multi Branch,
Human Resource, QR Attendance, Duty Roster, Annual Calendar, Referral, TPA, Finance, Messaging,
Inventory, Download Center, Certificate, Front CMS, Live Consultation, Reports, Setup).

## 2. Sidebar module availability — 7 operational roles
`✓` = module in sidebar · blank = not present.

| Module | Doctor | Pharmacist | Pathologist | Radiologist | Accountant | Receptionist | Nurse |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Patient | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Billing | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| Appointment | ✓ |  |  |  | ✓ | ✓ |  |
| OPD – Out Patient | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| IPD – In Patient | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pharmacy |  | ✓ |  |  | ✓ | ✓ |  |
| Pathology | ✓ |  | ✓ |  | ✓ | ✓ |  |
| Radiology | ✓ |  |  | ✓ | ✓ | ✓ |  |
| Blood Bank | ✓ | ✓ | ✓ |  | ✓ | ✓ |  |
| Ambulance | ✓ |  |  |  | ✓ | ✓ |  |
| Front Office |  |  |  |  |  | ✓ |  |
| Birth & Death Record | ✓ |  |  |  |  | ✓ |  |
| Multi Branch |  |  |  |  |  |  |  |
| Human Resource | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QR Code Attendance | ✓ |  |  |  |  |  |  |
| Duty Roster |  |  |  |  |  |  |  |
| Annual Calendar |  |  |  |  |  |  |  |
| Referral |  |  |  |  | ✓ |  |  |
| TPA Management | ✓ |  |  |  | ✓ | ✓ |  |
| Finance (top-level) |  |  |  |  | ✓ |  |  |
| Messaging | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Inventory |  |  |  |  | ✓ | ✓ |  |
| Download Center | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Certificate |  |  |  |  |  |  |  |
| Front CMS |  |  |  |  |  |  |  |
| Live Consultation | ✓ both | Meeting | Meeting | Meeting | Meeting | Meeting | Meeting |
| Reports | 11 cats | Pharmacy | Path/Blood/Log | Radiology | 14 cats | 12 cats | OPD/IPD/OT/Patient |
| Setup | 7 items | 4 | 4 | 4 | 10 | 5 | 2 (Bed, Finance) |

> Multi Branch, Duty Roster, Annual Calendar, Certificate, Front CMS = **Super Admin / Admin only**
> among the observed roles.

## 3. Setup sub-item access (from §2.31.3)
| Role | Setup areas visible |
|---|---|
| Doctor | Hospital Charges, Bed (n/a), Print Header Footer, Pharmacy, Symptoms, Finance, Appointment (7) |
| Pharmacist | Hospital Charges, Print Header Footer, Pharmacy, Finance (4) |
| Pathologist | Print Header Footer, Pathology, Blood Bank, Finance (4) |
| Radiologist | Hospital Charges, Print Header Footer, Radiology, Finance (4) |
| Accountant | Settings, Hospital Charges, Bed, Print Header Footer, Pharmacy, Blood Bank, Finance, Referral, Appointment, Inventory (10) |
| Receptionist | Bed, Print Header Footer, Front Office, Finance, Appointment (5) |
| Nurse | Bed, Finance (2) |

## 4. Feature-action rights (View / Add / Edit / Delete)

Within each accessible module every **feature** has 4 independent booleans. This is the granular
matrix the admin edits in Setup → Roles Permissions. Modeled as:

```
permission(module, feature, action ∈ {view, add, edit, delete})
role_permission(role_id, permission_id, allowed: bool)
```

**Seed rules applied per role (defaults, all overridable):**
- **Super Admin** → all four on every feature (row locked/`protected`).
- **Admin** → all four on every feature **except** the Super Admin role row in Roles Permissions
  (no view/edit there — FRD §2.31.1).
- **Operational roles** → for each module in their sidebar (§2 above):
  - `view` = true on all their features.
  - `add` / `edit` = true on the operational features they own (e.g. Doctor: add/edit OPD, IPD,
    Pathology/Radiology findings, appointments; Pharmacist: add/edit Pharmacy bills & medicine).
  - `delete` = false by default (enable deliberately — matches conservative clinical practice).
  - Catalog/master-data under Setup: view-only unless the role's Setup list (§3) grants edit.
- **Patient (portal)** → `view` only, **scoped to own patient_id** (own appointments, cases,
  reports, bills, prescriptions); `add` limited to booking appointments & messages.

## 5. Enforcement (how the matrix becomes runtime behavior)
- **Single source of truth:** the `(module, feature, action)` catalog lives in
  `packages/shared/permissions.ts`, imported by both API and web.
- **API:** a CASL `Ability` is built per request from the user's `role_permission` rows; a NestJS
  `PermissionGuard(module, action)` protects every controller handler. Branch scope is applied by
  a separate `BranchContextInterceptor` (queries filtered by active `branch_id`).
- **Web:** the same ability object is hydrated client-side to (a) render only permitted sidebar
  items, (b) hide/disable Add/Edit/Delete buttons and export actions, (c) drop unauthorized table
  columns. UI hiding is UX only — the API guard is the real boundary.
- **Tests:** a dedicated matrix test suite asserts each of the 10 roles gets exactly the sidebar
  of §2 and is 403'd on every action outside its grants (including the Super-Admin-row protection).
- **Multi-branch:** consolidated cross-branch reports require an explicit `multibranch:view`
  permission (Super Admin / Admin only by default).
