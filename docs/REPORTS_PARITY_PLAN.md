# Reports parity plan

The reference product exposes **47 reports**. We implement **24**. This plan
closes the remaining 23.

Reports is the largest single block of unbuilt surface left in the project —
larger than the remaining Settings work — and it reads almost entirely on data
the operational modules already write.

## Why this phase is cheap per report

The engine is already the right shape. A report is three edits:

1. a `{ key, label }` in `REPORT_CATEGORIES` (`packages/shared/src/dto/reports.ts`)
2. a key → feature mapping in `REPORT_FEATURES` (`apps/api/src/reports/reports-features.ts`)
3. a builder in `ReportsService.builders` returning `{ title, columns, rows, summary }`

There is **no per-report frontend work**. `apps/web/src/app/(app)/reports/page.tsx`
renders any `{columns, rows, summary}` and exports it, and the catalogue is
already filtered per user by `visibleReportCategories`. `keys()` filters the
catalogue by which builders exist, so a registered-but-unbuilt report cannot
appear in the menu and 500 when clicked.

`reports-features.spec.ts` pins the mapping: every catalogue key must map to a
feature, and every feature must exist. Adding a key without a mapping fails the
suite. That guard is why this can move fast without drifting.

## The 23, by what they need

### Tier A — builder only, data already written (19)

No schema change, no new write path. These are queries over tables the product
already fills.

| Report | Reads |
| --- | --- |
| TPA Report | already built at `/reports/tpa` — needs catalogue wiring only |
| Discharge Patient Report | `IpdAdmission` discharge fields |
| OPD Balance Report | `Invoice` where `module=opd`, `balance > 0` |
| IPD Balance Report | `Invoice` where `module=ipd`, `balance > 0` |
| Pathology Balance Report | `Invoice` where `module=pathology`, `balance > 0` |
| Radiology Balance Report | `Invoice` where `module=radiology`, `balance > 0` |
| Balance Amount Report | `Invoice` across every module, `balance > 0` |
| Processing Transaction Report | `Invoice` where `status = partial` |
| Income Group Report | `Income` grouped by `IncomeHead` |
| Expense Group Report | `Expense` grouped by `ExpenseHead` |
| Referral Report | `ReferralPayment` + `ReferralPerson` |
| Inventory Item Report | `InventoryItem` + `ItemCategory` |
| Inventory Issue Report | `ItemIssue` |
| Stock Report | `Medicine` stock levels |
| Medicine Purchase Report | `MedicinePurchase` + `MedicinePurchaseItem` |
| Payroll Month Report | `Payroll` grouped by month |
| Payroll Report (2) | duplicate row in the reference; same builder as Payroll |
| Staff Day Wise Attendance Report | `Attendance` pivoted by day |
| Patient Login Credential | `User` where `type = patient` |

"Processing Transaction" is the one interpretation call here. The reference
means a transaction that is neither settled nor abandoned; our nearest true
equivalent is an invoice at `status = partial`. Documented in the builder.

### Tier B — needs a small write path first (2)

A report over a table nothing writes is an empty screen that looks broken. Both
of these need the write side before the read side is worth shipping.

| Report | Missing | Cost |
| --- | --- | --- |
| User Log | logins are not audited — `AuditLog` exists and its own comment lists `login`, but `auth.service` never records one | one `audit.record` call + builder |
| Email / SMS Log | channel sends are not persisted anywhere | new `MessageLog` model + write in the send path + builder |

Historical rows cannot be backfilled for either. Both start empty and fill from
the deploy forward; the builder should say so rather than render a bare "No
data" that reads as a bug.

### Tier C — needs a new entity, deferred pending a decision (2)

| Report | Why it is not just a report |
| --- | --- |
| Medicine Purchase Return Report | there is no purchase-return concept in the schema at all. A report needs a `MedicinePurchaseReturn` model **and** a UI to create returns — otherwise it is inert by construction |
| Live Meeting Report | the reference separates Live Consultation (with a patient) from Live Meeting (staff-to-staff). We have only `LiveConsultation`. This is a feature, not a report |

**These two are excluded from this phase and remain open.** Shipping a menu
entry over a table nothing can populate is the same mistake as shipping an
inert setting. Raised for a scope decision rather than quietly built or quietly
dropped.

## Cross-cutting fix, folded into RP0

`ReportsService.run` closes the date range with:

```ts
const end = new Date(to);
end.setHours(23, 59, 59, 999);
```

`new Date('2026-08-11')` is UTC midnight; `setHours` then moves it by the
**server's** offset, not the hospital's. This is the same defect class as the
attendance day-key bug (G8): a hospital in IST asking for "up to the 11th" gets
a window that ends 05:30 into the 12th, or clips the 11th, depending on where
the server sits. Fixed with the existing `dayKeyInZone` helper and the
hospital's configured `timeZone`.

## Phases

| Phase | Scope | Reports |
| --- | --- | --- |
| **RP0** | timezone-correct ranges; TPA catalogue wiring; a builder-coverage test | 1 |
| **RP1** | balance + transaction family | 7 |
| **RP2** | finance groups + referral | 3 |
| **RP3** | inventory + pharmacy | 4 |
| **RP4** | HR + patient credentials | 4 |
| **RP5** | Tier B — User Log, Email/SMS Log, with their write paths | 2 |
| **RP6** | verification sweep: every report run against seeded data | — |

Total: **21 of the 23**, with Tier C's two carried as an explicit open
decision.

## Acceptance

- Every catalogue key has a builder, enforced by a test — no menu entry can
  500.
- `reports-features.spec.ts` stays green: all 47 reference report features
  either map to a catalogue key or are listed here as deliberately unmapped.
- The access matrix regenerates with each new report's feature gate visible,
  and the role columns match the reference grants.
- Each report returns real rows against seeded data, verified by running it —
  not by the endpoint returning 200.
