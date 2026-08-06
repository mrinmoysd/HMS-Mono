# Settings parity plan

Reference capture of Smart Hospital's **Setup ▸ Settings** area (25 screenshots,
Super Admin / Admin), measured against what we have, with a phased plan.

Same discipline as `ROLE_PERMISSION_PARITY.md`: Part I is what the reference
does, Part II is what we actually have (measured, not assumed), Part III is the
plan, and there is an explicit anti-parity list of things we will **not**
reproduce.

---

# Part I — The reference

## The Settings shell

A second-level rail inside Setup ▸ Settings, 20 entries in 5 visual groups:

| Group | Entries |
| --- | --- |
| Identity | General Setting · Attendance Setting · Theme Studio |
| Notifications | Notification Setting · System Notification Setting |
| Channels | SMS Setting · WhatsApp Setting · Email Setting · Payment Methods |
| Platform | Front CMS Setting · Prefix Setting · Roles Permissions · Backup / Restore · Languages · Users · Captcha Settings |
| System | Addons · Modules · Queue Process · System Update |

## Screen by screen

**General Setting** — one long form, `Save` at the bottom. Sections:
Identity (Hospital Name*, Hospital Code, Address*, Phone*, Email*, Hospital
Logo*, Hospital Small Logo*) · Language · Date Time (Date Format*, Time Zone*) ·
Currency (Currency*, Currency Symbol*, Credit Limit*, Time Format*) · Mobile App
(Register Android App, API URL, primary/secondary colour, app logo) ·
Miscellaneous (Doctor Restriction Mode, Superadmin Visibility, Patient Panel,
Scan Type Barcode/QR, Patient Delete Account, Notification Poll Interval) ·
File Upload Path (Base URL*, File Upload Path*).

**Attendance Setting** — two blocks. Biometric Attendance (Disabled/Enabled +
device list) and, per role (9 of them), a 4-row grid: Present / Late / Half Day /
Half Day Second Shift, each with Entry From, Entry Upto, Total Hour, and a
per-role `Update`.

**Notification Setting** — a table of ~9 user-facing events (OPD/IPD
registration, IPD discharge, Login Credential, Appointment Approved, Live
Meeting, Live Consult, OPD discharge, Forgot Password) × channels (Email, SMS,
Mobile App, WhatsApp) as checkboxes, plus Template Id, WhatsApp Template ID, and
an editable Sample Message with `{{placeholders}}`.

**System Notification Setting** — a much longer table (~70 rows) of internal
events: Event, Subject, three toggles (Enabled / Staff / Patient), the message
body with placeholders, and an "import message" variant. Same shape repeated.

**SMS Setting** — provider tabs: Clickatell, Twilio, MSG91, Text Local, SMS
Country, Bulk SMS, Mobireach, Nexmo, AfricasTalking, Custom SMS, + more behind a
scroll arrow. Each tab is a small credential form with its own field set and a
`Status` Enabled/Disabled:
Clickatell (Username, Password, Api Key) · Twilio (Account SID, Auth Token,
Registered Phone Number) · MSG91 (Auth Key, Sender ID) · Text Local (Username,
Hash Key, Sender ID) · Bulk SMS (Username, Password).

**WhatsApp Setting** — two tabs. Twilio WhatsApp (Account SID, Auth Token,
Registered Phone Number, Status) and Meta WhatsApp (Access Token, Registered
Phone Number, Language, Status).

**Email Setting** — Email Engine dropdown (SendMail, and presumably SMTP with
more fields).

**Payment Methods** — ~22 gateway tabs (Paypal, Stripe, PayU, CCAvenue,
InstaMojo, Paystack, Razorpay, Paytm, Midtrans, Pesapal, Flutter Wave, iPay
Africa, JazzCash, Billplz, SSLCommerz, Walkingm, Mollie, Cashfree, PayFast,
ToyyibPay, 2checkout …). Each tab: credentials + an optional Processing Fees
Type (None / Percentage / Fix Amount) + amount. A right-hand rail picks the ONE
active gateway by radio, with its own Save. Saved secrets come back masked
(`sk****LL`) and the active gateway shows an `Active` pill.

**Prefix Setting** — 16 plain text inputs: IPD No, OPD No, IPD Prescription, OPD
Prescription, Appointment, Pharmacy Bill, Operation Reference No, Blood Bank
Bill, Ambulance Call Bill, Radiology Bill, Pathology Bill, OPD Checkup Id,
Pharmacy Purchase No, Transaction ID, Birth Record Reference No, Death Record
Reference No.

**Roles Permissions** — a Role create form + Role List (9 System roles, tag and
pencil actions). The tag action opens the per-role permission editor: 36 groups
in a rail, and a FEATURE × VIEW/ADD/EDIT/DELETE toggle grid. The first group is
Dashboard and Widgets (12 view-only widget rows).

**Backup / Restore** — Backup History (filename, download / restore / delete),
Create Backup, Upload From Local Directory (drop zone + Upload), and a Cron
Secret Key with Regenerate and a reveal eye.

**Users** — two tabs. Staff (Staff ID, Name, Email, Role, Designation,
Department, Phone, enable/disable toggle) and Patient (Patient Id, Name,
Username, Mobile Number, enable/disable). Both are DataTables with search, page
size, and copy/excel/csv/pdf/print export.

**Modules** — two tabs, System (35 module rows) and Patient (14 rows), each a
single on/off toggle. Turning a module off removes it system-wide.

Remaining screens not captured in depth: Theme Studio, Front CMS Setting,
Languages, Captcha Settings, Addons, Queue Process, System Update.

---

# Part II — What we have today

Measured, not assumed.

| Reference screen | Ours |
| --- | --- |
| Roles Permissions | **Done** — `/setup/roles` (phase R2), better than the reference: the read endpoint is guarded and Super Admin is not falsely editable. |
| Dashboard & Widget permissions | **Done** — it is the first group of the same editor. |
| Prefix Setting | **Half** — `SequenceCounter.prefix` is per-branch and already drives every generated number. No UI, and 4 of the reference's 16 keys have no counter. |
| Users (Staff) | **Half** — HR staff directory exists with enable/disable, but not under Settings. |
| Users (Patient) | **Half** — patient list exists; no enable/disable of the portal login. |
| Attendance Setting | **Half** — attendance records exist; the per-role time bands that classify Present/Late/Half Day do not. |
| Notification Setting | **No** — `Notification` is the notice board, not a channel matrix. |
| System Notification Setting | **No** |
| General Setting | **No** — `Branch.settings Json` exists and is unused. |
| SMS / WhatsApp / Email / Payment settings | **No** — the comms service has stubs; no credential storage at all. |
| Modules on/off | **No** |
| Backup / Restore | **No** in-app. `release.sh` takes a pre-migration dump on every deploy. |
| Theme Studio | **Partly** — three themes + density live in the UI already, per user, not per hospital. |
| Languages, Captcha, Addons, Queue Process, System Update, Front CMS Setting | **No** |

**The foundation is missing.** There is no settings store: no `Setting` model, no
typed get/set, no secret handling. Every screen below needs it, so it is phase
one and everything else depends on it.

---

# Part III — The plan

Phases are ordered so each one ships something usable. `G` = settings, and the
five remaining redesign screens are interleaved as `U4.x` — they are independent
of `G`, so they make good palate cleansers between the heavier backend phases.

## G0 — The settings foundation *(blocks everything else)*

- `Setting` model: `(branchId, key)` unique, `value Json`, `isSecret Boolean`.
  Per-branch so Multi Branch keeps working.
- `SettingsService`: typed `get<T>(key)` / `set(key, value)` with a Zod schema
  per key, defaults in code so a missing row is never a crash.
- **Secrets are encrypted at rest** (AES-GCM, key from env) and **never returned
  in plaintext** — the API returns `sk••••LL` exactly as the reference does, and
  a write that equals the mask is ignored rather than overwriting the real value.
  This is the one place in this plan with a real security cost to getting wrong.
- `/setup/settings` shell page with the 20-entry rail, role-gated to Admin and
  Super Admin exactly like `/setup/roles`.

## G1 — General Setting

The long form, backed by G0. Currency, date format, time zone and time format
then need honouring across the app (they are currently hard-coded in
`lib/format.ts` and several print helpers) — that sweep is most of the work, not
the form.

## U4.1 — Redesign: Finance + Referral

## G2 — Prefix Setting

Wire the 16 inputs to `SequenceCounter.prefix`. Add the 4 missing counters (IPD
Prescription, OPD Prescription, Operation Reference, Transaction ID) and align
`birth`/`death` to BREF/DREF. Changing a prefix must not renumber existing rows.

## G3 — Modules on/off

**This one touches the permission system.** A disabled module must be
unreachable regardless of permissions — so it belongs in `PermissionsGuard`, as
a check that runs *before* the feature check, and in the sidebar. The R5 matrix
will need a new invariant: a disabled module denies every role including Admin.

## U4.2 — Redesign: Messaging + Duty Roster

## G4 — Notification Setting + System Notification Setting

The event × channel matrix and the template table. Templates are stored with
`{{placeholder}}` bodies; a renderer resolves them against a per-event context.
Worth doing before G5 — the channels are what G5 configures.

## G5 — Channels: Email, SMS, WhatsApp

Provider registry with a credential schema per provider, one active provider per
channel, `Status` per provider. **Scope decision needed** — see below.

## U4.3 — Redesign: Human Resources

## G6 — Payment Methods

Same shape as G5: ~22 gateways, credentials, processing fee, one active. **Same
scope decision.**

## G7 — Users under Settings

Staff and Patient tabs. Mostly a re-presentation of data we already have, plus
enable/disable on the patient portal login.

## G8 — Attendance Setting

Biometric toggle + the per-role Present/Late/Half Day/Half Day Second Shift time
bands, and then actually classifying attendance against them.

## G9 — Backup / Restore

In-app backup history, download, upload, restore. **Restore is the most
dangerous button in the product** — it replaces the whole database. Gated,
confirmed by typing the hospital name, and audited.

## G10 — The remainder

Theme Studio (hospital-level defaults for the three themes we already have),
Languages, Captcha, Front CMS Setting, Queue Process. Addons and System Update
are anti-parity — see below.

---

## Anti-parity — what we deliberately will not build

1. **Addons / System Update.** These install code into a running PHP app from a
   vendor server. We deploy from CI with a reviewed git history; an in-app code
   installer would bypass every check we have and is a remote-code-execution
   surface. Updates stay a deploy.
2. **Plaintext credential display.** The reference masks on redisplay, which we
   copy, but we also encrypt at rest — a database dump of theirs yields live
   gateway keys.
3. **`File Upload Path` / `Base URL` as editable text.** These are deployment
   facts, not hospital preferences; making them editable in the UI is a path
   traversal invitation. Shown read-only, from env.
4. **Superadmin Visibility toggle.** Hiding the super admin from lists is
   security theatre — the role still bypasses every check. We show it, locked,
   with the reason, as `/setup/roles` already does.

---

## Scope decisions — settled

### Which providers we offer, and which actually work

Deliberately narrower than the reference, which lists ~11 SMS gateways and ~22
payment gateways. We offer what the hospital will plausibly use, and we are
honest in the UI about which are wired up.

Every provider below gets the full configuration layer — credential form,
validation, encrypted storage, `Status`, and a place in the active-provider
picker. The difference is whether sending/charging actually goes anywhere.

| Channel | Implemented end to end | Configurable, shown **Coming soon** |
| --- | --- | --- |
| SMS | Clickatell · Twilio · MSG91 | Text Local · Bulk SMS |
| WhatsApp | Twilio WhatsApp · Meta WhatsApp | — (both required) |
| Email | SMTP · SendGrid | — (both required) |
| Payments | Paypal · Razorpay · Stripe | PayU · CCAvenue · InstaMojo · Paytm |

**"Coming soon" is a real state, not a label.** A provider marked so cannot be
made the active provider, its `Status` cannot be set to Enabled, and the tab
carries a visible badge. The alternative — letting an admin select a gateway
that silently drops every payment — is the failure mode this exists to prevent.
The flag lives in the provider registry next to the credential schema, so
implementing one later is a one-line change plus the client.

The 15 SMS and 15 payment providers the reference lists that are **not** in the
table above are not offered at all. Adding one later is a registry entry.

### Module toggles for modules that do not exist

Chat, Calendar To-Do List, Survey Form, WhatsApp Messaging and Two Factor
Authenticator appear in the reference's Modules list but are parity phase R4,
unbuilt. They render in the list with the same **Coming soon** treatment: shown,
not toggleable, labelled. Consistent with how unimplemented providers behave, and
it keeps the Modules screen an honest inventory rather than a list with silent
gaps.
