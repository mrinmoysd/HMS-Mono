# Access matrix

**Generated — do not edit by hand.** Produced by
`apps/api/src/rbac/access-matrix.spec.ts` from the decorators Nest records,
and the seed grants in `packages/shared/src/rbac`. Regenerate with:

```bash
UPDATE_ACCESS_MATRIX=1 pnpm --filter @smart-hospital/api exec jest src/rbac/access-matrix.spec.ts
```

The test fails when this file and the code disagree, so a permission change
always shows up here as a reviewable diff. `✓` allowed, `·` denied,
`?` decided per request by a resolver (it depends on the URL or body, so it
cannot be answered without one).

## Summary

- routes: **380**
- feature-gated: 307
- resolver-gated: 34
- module-gated (documented exceptions): 13
- authenticated, no permission: 12
- public: 6
- **unguarded: 0**

## Routes

| Method | Route | Guard | super | admin | accoun | doctor | pharma | pathol | radiol | recept | nurse |
|---|---|---|---|---|---|---|---|---|---|---|---|
| GET | `/ambulance/calls` | `ambulance.ambulance_call:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| POST | `/ambulance/calls` | `ambulance.ambulance_call:add` | ✓ | ✓ | · | · | · | · | · | ✓ | · |
| GET | `/ambulance/calls/:id` | `ambulance.ambulance_call:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| GET | `/ambulance/vehicles` | `ambulance.ambulance:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| POST | `/ambulance/vehicles` | `ambulance.ambulance:add` | ✓ | ✓ | · | · | · | · | · | ✓ | · |
| DELETE | `/ambulance/vehicles/:id` | `ambulance.ambulance:delete` | ✓ | ✓ | · | · | · | · | · | ✓ | · |
| PATCH | `/ambulance/vehicles/:id` | `ambulance.ambulance:edit` | ✓ | ✓ | · | · | · | · | · | ✓ | · |
| GET | `/appointment-priorities` | `appointment.appointment_priority:view` | ✓ | ✓ | · | · | · | · | · | ✓ | · |
| POST | `/appointment-priorities` | `appointment.appointment_priority:add` | ✓ | ✓ | · | · | · | · | · | ✓ | · |
| DELETE | `/appointment-priorities/:id` | `appointment.appointment_priority:delete` | ✓ | ✓ | · | · | · | · | · | ✓ | · |
| PATCH | `/appointment-priorities/:id` | `appointment.appointment_priority:edit` | ✓ | ✓ | · | · | · | · | · | ✓ | · |
| GET | `/appointments` | `appointment.appointment:view` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| POST | `/appointments` | `appointment.appointment:add` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| DELETE | `/appointments/:id` | `appointment.appointment:delete` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| GET | `/appointments/:id` | `appointment.appointment:view` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| PATCH | `/appointments/:id` | `appointment.reschedule:view` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| POST | `/appointments/:id/convert-to-opd` | `opd.opd_patient:add` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| PATCH | `/appointments/:id/status` | `appointment.reschedule:view` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| GET | `/appointments/doctor-fee` | `appointment.appointment:view` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| GET | `/appointments/doctor-wise` | `appointment.doctor_wise_appointment:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| GET | `/appointments/queue` | `appointment.patient_queue:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| POST | `/appointments/queue/reorder` | `appointment.patient_queue:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| GET | `/appointments/slots` | `appointment.slot:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| POST | `/auth/change-password` | *authenticated* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST | `/auth/login` | *public* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/auth/me` | *authenticated* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST | `/auth/refresh` | *public* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/bed-groups` | `ipd.bed_group:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | · | · |
| POST | `/bed-groups` | `ipd.bed_group:add` | ✓ | ✓ | ✓ | ✓ | · | · | · | · | · |
| DELETE | `/bed-groups/:id` | `ipd.bed_group:delete` | ✓ | ✓ | ✓ | ✓ | · | · | · | · | · |
| PATCH | `/bed-groups/:id` | `ipd.bed_group:edit` | ✓ | ✓ | ✓ | ✓ | · | · | · | · | · |
| GET | `/beds` | `ipd.bed:view` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | ✓ |
| POST | `/beds` | `ipd.bed:add` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| DELETE | `/beds/:id` | `ipd.bed:delete` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| PATCH | `/beds/:id` | `ipd.bed:edit` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| GET | `/beds/available` | `ipd.bed:view` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | ✓ |
| GET | `/beds/status` | `ipd.bed_status:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | ✓ |
| GET | `/blood-bank/bags` | `blood_bank.blood_stock:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | · |
| POST | `/blood-bank/bags` | `blood_bank.blood_stock:add` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| DELETE | `/blood-bank/bags/:id` | `blood_bank.blood_stock:delete` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| GET | `/blood-bank/bags/status` | `blood_bank.blood_stock:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | · |
| POST | `/blood-bank/components` | `blood_bank.blood_bank_components:add` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| GET | `/blood-bank/donors` | `blood_bank.blood_donor:view` | ✓ | ✓ | · | · | · | ✓ | · | ✓ | · |
| POST | `/blood-bank/donors` | `blood_bank.blood_donor:add` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| DELETE | `/blood-bank/donors/:id` | `blood_bank.blood_donor:delete` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| GET | `/blood-bank/donors/:id` | `blood_bank.blood_donor:view` | ✓ | ✓ | · | · | · | ✓ | · | ✓ | · |
| PATCH | `/blood-bank/donors/:id` | `blood_bank.blood_donor:edit` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| GET | `/blood-bank/issues` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| POST | `/blood-bank/issues` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| DELETE | `/blood-bank/issues/:id` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| GET | `/blood-bank/issues/:id` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| PATCH | `/blood-bank/issues/:id` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| GET | `/blood-bank/issues/next-no` | `blood_bank.blood_issue:add` | ✓ | ✓ | · | ✓ | · | ✓ | · | · | · |
| GET | `/blood-bank/products` | `blood_bank.blood_bank_product:view` | ✓ | ✓ | ✓ | · | · | ✓ | · | · | · |
| POST | `/blood-bank/products` | `blood_bank.blood_bank_product:add` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| DELETE | `/blood-bank/products/:id` | `blood_bank.blood_bank_product:delete` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| PATCH | `/blood-bank/products/:id` | `blood_bank.blood_bank_product:edit` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| GET | `/calendar/holidays` | `annual_calendar.annual_calendar:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/calendar/holidays` | `annual_calendar.annual_calendar:add` | ✓ | ✓ | · | · | · | · | · | · | · |
| DELETE | `/calendar/holidays/:id` | `annual_calendar.annual_calendar:delete` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/certificates/generate` | `certificate.generate_certificate:view` | ✓ | ✓ | · | ✓ | · | · | · | · | · |
| GET | `/charge-types` | `hospital_charges.charge_type:view` | ✓ | ✓ | ✓ | · | ✓ | · | ✓ | · | · |
| POST | `/charge-types` | `hospital_charges.charge_type:add` | ✓ | ✓ | ✓ | · | ✓ | · | ✓ | · | · |
| DELETE | `/charge-types/:id` | `hospital_charges.charge_type:delete` | ✓ | ✓ | ✓ | · | ✓ | · | ✓ | · | · |
| PATCH | `/charge-types/:id` | `hospital_charges.charge_type:add` | ✓ | ✓ | ✓ | · | ✓ | · | ✓ | · | · |
| GET | `/charges` | `hospital_charges.hospital_charges:view` | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | · | · |
| POST | `/charges` | `hospital_charges.hospital_charges:add` | ✓ | ✓ | ✓ | · | ✓ | · | ✓ | · | · |
| DELETE | `/charges/:id` | `hospital_charges.hospital_charges:delete` | ✓ | ✓ | ✓ | · | ✓ | · | ✓ | · | · |
| GET | `/charges/:id` | `hospital_charges.hospital_charges:view` | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | · | · |
| PATCH | `/charges/:id` | `hospital_charges.hospital_charges:edit` | ✓ | ✓ | ✓ | · | ✓ | · | ✓ | · | · |
| GET | `/charges/:id/schedule` | `hospital_charges.hospital_charges:view` | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | · | · |
| PUT | `/charges/:id/schedule` | `hospital_charges.hospital_charges:edit` | ✓ | ✓ | ✓ | · | ✓ | · | ✓ | · | · |
| GET | `/clinical/consultant-register` | `ipd.consultant_register:view` | ✓ | ✓ | · | ✓ | · | · | · | · | ✓ |
| POST | `/clinical/consultant-register` | `ipd.consultant_register:add` | ✓ | ✓ | · | ✓ | · | · | · | · | ✓ |
| GET | `/clinical/findings` | `patient:view` *(module)* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST | `/clinical/findings` | `patient:edit` *(module)* | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/clinical/lab` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| POST | `/clinical/lab` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| PATCH | `/clinical/lab/:id` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| GET | `/clinical/live-consults` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| POST | `/clinical/live-consults` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| PATCH | `/clinical/live-consults/:id` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| GET | `/clinical/medication` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| POST | `/clinical/medication` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| GET | `/clinical/nurse-notes` | `ipd.nurse_note:view` | ✓ | ✓ | · | ✓ | · | · | · | · | ✓ |
| POST | `/clinical/nurse-notes` | `ipd.nurse_note:add` | ✓ | ✓ | · | ✓ | · | · | · | · | ✓ |
| GET | `/clinical/operations` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| POST | `/clinical/operations` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| GET | `/clinical/prescriptions` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| POST | `/clinical/prescriptions` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| GET | `/clinical/symptoms` | `patient:view` *(module)* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST | `/clinical/symptoms` | `patient:edit` *(module)* | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/clinical/timeline` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| POST | `/clinical/timeline` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| DELETE | `/clinical/timeline/:id` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| PATCH | `/clinical/timeline/:id` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| POST | `/clinical/vitals` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| DELETE | `/clinical/vitals/:id` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| PATCH | `/clinical/vitals/:id` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| GET | `/clinical/vitals/current` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| GET | `/clinical/vitals/matrix` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| GET | `/cms/banners` | `front_cms.banner_images:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/cms/banners` | `front_cms.banner_images:add` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/cms/menus` | `front_cms.menus:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/cms/menus` | `front_cms.menus:add` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/cms/pages` | `front_cms.pages:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/cms/pages` | `front_cms.pages:add` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/cms/public/pages/:slug` | *public* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/cms/public/site` | *public* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/content` | `download_center.content_share_list:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST | `/content` | `download_center.upload_share_content:add` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/custom-fields` | `setup:view` *(module)* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST | `/custom-fields` | `setup:add` *(module)* | ✓ | ✓ | · | · | · | · | · | · | · |
| DELETE | `/custom-fields/:id` | `setup:delete` *(module)* | ✓ | ✓ | · | · | · | · | · | · | · |
| PATCH | `/custom-fields/:id` | `setup:edit` *(module)* | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/dashboard/overview` | `dashboard.notification_center:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/directory/doctors` | `human_resource.staff:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/doctor-shifts` | `appointment.doctor_shift:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| GET | `/doctor-shifts/slot-config` | `appointment.slot:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| POST | `/doctor-shifts/slot-config` | `appointment.slot:edit` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| POST | `/doctor-shifts/toggle` | `appointment.doctor_shift:edit` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| GET | `/duty-roster` | `duty_roster.duty_roster:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/duty-roster/assignments` | `duty_roster.roster_assign:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/duty-roster/assignments` | `duty_roster.roster_assign:add` | ✓ | ✓ | · | · | · | · | · | · | · |
| DELETE | `/duty-roster/assignments/:id` | `duty_roster.roster_assign:delete` | ✓ | ✓ | · | · | · | · | · | · | · |
| PATCH | `/duty-roster/assignments/:id` | `duty_roster.roster_assign:edit` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/duty-roster/rosters` | `duty_roster.roster_list:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/duty-roster/rosters` | `duty_roster.roster_list:add` | ✓ | ✓ | · | · | · | · | · | · | · |
| DELETE | `/duty-roster/rosters/:id` | `duty_roster.roster_list:delete` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/duty-roster/rosters/all` | `duty_roster.roster_list:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/duty-roster/shifts` | `duty_roster.shift:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/duty-roster/shifts` | `duty_roster.shift:add` | ✓ | ✓ | · | · | · | · | · | · | · |
| DELETE | `/duty-roster/shifts/:id` | `duty_roster.shift:delete` | ✓ | ✓ | · | · | · | · | · | · | · |
| PATCH | `/duty-roster/shifts/:id` | `duty_roster.shift:edit` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/encounter-billing/:type/:id` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| POST | `/encounter-billing/:type/:id/charges` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| POST | `/encounter-billing/:type/:id/payments` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| GET | `/finance/expense` | `expense.expense:view` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| POST | `/finance/expense` | `expense.expense:add` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| DELETE | `/finance/expense/:id` | `expense.expense:delete` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| PATCH | `/finance/expense/:id` | `expense.expense:edit` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/finance/income` | `income.income:view` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| POST | `/finance/income` | `income.income:add` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| DELETE | `/finance/income/:id` | `income.income:delete` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| PATCH | `/finance/income/:id` | `income.income:edit` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/finance/summary` | `income.income:view` + `expense.expense:view` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/findings` | `system_settings.findings:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/findings` | `system_settings.findings:add` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/front-office/calls` | `front_office.phone_call_log:view` | ✓ | ✓ | · | · | · | · | · | ✓ | · |
| POST | `/front-office/calls` | `front_office.phone_call_log:add` | ✓ | ✓ | · | · | · | · | · | ✓ | · |
| GET | `/front-office/complaints` | `front_office.complain:view` | ✓ | ✓ | · | · | · | · | · | ✓ | · |
| POST | `/front-office/complaints` | `front_office.complain:add` | ✓ | ✓ | · | · | · | · | · | ✓ | · |
| GET | `/front-office/visitors` | `front_office.visitor_book:view` | ✓ | ✓ | · | · | · | · | · | ✓ | · |
| POST | `/front-office/visitors` | `front_office.visitor_book:add` | ✓ | ✓ | · | · | · | · | · | ✓ | · |
| GET | `/health` | *public* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/hr/attendance` | `human_resource.staff_attendance:view` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| POST | `/hr/attendance/mark` | `human_resource.staff_attendance:add` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/hr/attendance/save` | `human_resource.staff_attendance:edit` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/hr/leave-types` | `human_resource.leave_types:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/hr/leave-types` | `human_resource.leave_types:add` | ✓ | ✓ | · | · | · | · | · | · | · |
| DELETE | `/hr/leave-types/:id` | `human_resource.leave_types:delete` | ✓ | ✓ | · | · | · | · | · | · | · |
| PATCH | `/hr/leave-types/:id` | `human_resource.leave_types:edit` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/hr/leaves` | `human_resource.apply_leave:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST | `/hr/leaves` | `human_resource.apply_leave:add` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DELETE | `/hr/leaves/:id` | `human_resource.apply_leave:delete` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/hr/leaves/:id` | `human_resource.apply_leave:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PATCH | `/hr/leaves/:id/status` | `human_resource.approve_leave_request:edit` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/hr/payroll` | `human_resource.staff_payroll:view` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| POST | `/hr/payroll` | `human_resource.staff_payroll:add` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/hr/payroll/:userId` | `human_resource.staff_payroll:view` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/hr/roster` | `duty_roster.roster_list:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/hr/roster` | `duty_roster.roster_assign:add` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/hr/shifts` | `duty_roster.shift:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/hr/shifts` | `duty_roster.shift:add` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/hr/staff` | `human_resource.staff:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST | `/hr/staff` | `human_resource.staff:add` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| DELETE | `/hr/staff/:userId` | `human_resource.staff:delete` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/hr/staff/:userId` | `human_resource.staff:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PATCH | `/hr/staff/:userId` | `human_resource.staff:edit` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| POST | `/hr/staff/:userId/change-password` | `human_resource.staff:edit` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/hr/staff/roles` | `human_resource.staff:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/icd-codes` | `system_settings.icd_10_codes:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/icd-codes` | `system_settings.icd_10_codes:add` | ✓ | ✓ | · | · | · | · | · | · | · |
| DELETE | `/icd-codes/:id` | `system_settings.icd_10_codes:delete` | ✓ | ✓ | · | · | · | · | · | · | · |
| PATCH | `/icd-codes/:id` | `system_settings.icd_10_codes:edit` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/inventory/issues` | `inventory.issue_item:view` | ✓ | ✓ | ✓ | · | · | · | · | ✓ | · |
| POST | `/inventory/issues` | `inventory.issue_item:add` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| DELETE | `/inventory/issues/:id` | `inventory.issue_item:delete` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| PATCH | `/inventory/issues/:id` | `inventory.issue_item:add` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| POST | `/inventory/issues/:id/return` | `inventory.issue_item:delete` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/inventory/items` | `inventory.item:view` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| POST | `/inventory/items` | `inventory.item:add` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| DELETE | `/inventory/items/:id` | `inventory.item:delete` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| PATCH | `/inventory/items/:id` | `inventory.item:edit` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/inventory/stock` | `inventory.item_stock:view` | ✓ | ✓ | ✓ | · | · | · | · | ✓ | · |
| POST | `/inventory/stock` | `inventory.item_stock:add` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| DELETE | `/inventory/stock/:id` | `inventory.item_stock:delete` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| PATCH | `/inventory/stock/:id` | `inventory.item_stock:edit` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/inventory/suppliers` | `inventory.supplier:view` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| POST | `/inventory/suppliers` | `inventory.supplier:add` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| DELETE | `/inventory/suppliers/:id` | `inventory.supplier:delete` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| PATCH | `/inventory/suppliers/:id` | `inventory.supplier:edit` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/invoices` | `billing:view` *(module)* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · |
| GET | `/invoices/:id` | `billing:view` *(module)* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · |
| POST | `/invoices/:id/payments` | `billing:edit` *(module)* | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| DELETE | `/invoices/:id/payments/:paymentId` | `billing:edit` *(module)* | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/invoices/by-case/:caseNo` | `billing:view` *(module)* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · |
| GET | `/ipd` | `ipd.ipd_patients:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST | `/ipd` | `ipd.ipd_patients:add` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| DELETE | `/ipd/:id` | `ipd.ipd_patients:delete` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| GET | `/ipd/:id` | `ipd.ipd_patients:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PATCH | `/ipd/:id` | `ipd.ipd_patients:edit` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| GET | `/ipd/:id/bed-history` | `ipd.bed_history:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | ✓ |
| POST | `/ipd/:id/bed-transfer` | `ipd.bed:edit` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| POST | `/ipd/:id/discharge` | `ipd.patient_discharge:edit` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| GET | `/ipd/by-patient/:patientId` | `ipd.ipd_patients:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/live` | `live_consultation.live_consultation:view` | ✓ | ✓ | · | ✓ | · | · | · | · | · |
| POST | `/live` | `live_consultation.live_consultation:add` | ✓ | ✓ | · | ✓ | · | · | · | · | · |
| GET | `/masters/:catalog` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| POST | `/masters/:catalog` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| DELETE | `/masters/:catalog/:id` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| PATCH | `/masters/:catalog/:id` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| POST | `/messaging/credential` | `messaging.send_credential:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/messaging/email` | `messaging.email_sms:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/messaging/patient-credentials` | `messaging.send_credential:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/messaging/sms` | `messaging.email_sms:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/meta/modules` | *authenticated* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/multibranch/branches` | `multi_branch.setting:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/multibranch/branches` | `multi_branch.setting:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| DELETE | `/multibranch/branches/:id` | `multi_branch.setting:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| PATCH | `/multibranch/branches/:id` | `multi_branch.setting:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/multibranch/overview` | `multi_branch.overview:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/notifications` | `messaging.notice_board:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST | `/notifications` | `messaging.notice_board:add` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DELETE | `/notifications/:id` | `messaging.notice_board:delete` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PATCH | `/notifications/:id` | `messaging.notice_board:edit` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/opd` | `opd.opd_patient:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST | `/opd` | `opd.opd_patient:add` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| DELETE | `/opd/:id` | `opd.opd_patient:delete` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| GET | `/opd/:id` | `opd.opd_patient:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PATCH | `/opd/:id` | `opd.opd_patient:edit` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| GET | `/opd/:id/checkups` | `opd.checkup:view` | ✓ | ✓ | ✓ | ✓ | · | · | ✓ | ✓ | ✓ |
| POST | `/opd/:id/checkups` | `opd.checkup:add` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| POST | `/opd/:id/move-to-ipd` | `ipd.ipd_patients:add` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| DELETE | `/opd/checkups/:checkupId` | `opd.checkup:delete` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| PATCH | `/opd/checkups/:checkupId` | `opd.checkup:edit` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| GET | `/opd/patient-view` | `opd.opd_patient:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/operations` | `ipd.operation_theatre:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | ✓ |
| POST | `/operations` | `ipd.operation_theatre:add` | ✓ | ✓ | · | ✓ | · | · | · | · | · |
| POST | `/pathology/bills` | `pathology.pathology_bill:add` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| DELETE | `/pathology/bills/:id` | `pathology.pathology_bill:delete` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| PATCH | `/pathology/bills/:id` | `pathology.pathology_bill:edit` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| GET | `/pathology/bills/next-no` | `pathology.pathology_bill:add` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| GET | `/pathology/categories` | `pathology.pathology_category:view` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| POST | `/pathology/categories` | `pathology.pathology_category:add` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| DELETE | `/pathology/categories/:id` | `pathology.pathology_category:delete` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| PATCH | `/pathology/categories/:id` | `pathology.pathology_category:edit` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| GET | `/pathology/previous-reports` | `pathology.pathology_test:view` | ✓ | ✓ | ✓ | ✓ | · | ✓ | · | ✓ | · |
| GET | `/pathology/tests` | `pathology.pathology_test:view` | ✓ | ✓ | ✓ | ✓ | · | ✓ | · | ✓ | · |
| POST | `/pathology/tests` | `pathology.pathology_test:add` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| DELETE | `/pathology/tests/:id` | `pathology.pathology_test:delete` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| GET | `/pathology/tests/:id` | `pathology.pathology_test:view` | ✓ | ✓ | ✓ | ✓ | · | ✓ | · | ✓ | · |
| PATCH | `/pathology/tests/:id` | `pathology.pathology_test:edit` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| GET | `/pathology/units` | `pathology.pathology_unit:view` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| POST | `/pathology/units` | `pathology.pathology_unit:add` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| DELETE | `/pathology/units/:id` | `pathology.pathology_unit:delete` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| PATCH | `/pathology/units/:id` | `pathology.pathology_unit:edit` | ✓ | ✓ | · | · | · | ✓ | · | · | · |
| GET | `/patients` | `patient.patient:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST | `/patients` | `patient.patient:add` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| DELETE | `/patients/:id` | `patient.patient:delete` | ✓ | ✓ | · | ✓ | · | · | · | · | · |
| GET | `/patients/:id` | `patient.patient:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PATCH | `/patients/:id` | `patient.patient:edit` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| GET | `/patients/:id/profile` | `patient.patient:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/patients/:id/report` | `patient.patient:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DELETE | `/patients/bulk` | `patient.patient:delete` | ✓ | ✓ | · | ✓ | · | · | · | · | · |
| POST | `/patients/import` | `patient.import:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/patients/lookup` | `patient.patient:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST | `/pharmacy/bills` | `pharmacy.pharmacy_bill:add` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| DELETE | `/pharmacy/bills/:id` | `pharmacy.pharmacy_bill:delete` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| PATCH | `/pharmacy/bills/:id` | `pharmacy.pharmacy_bill:edit` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| GET | `/pharmacy/bills/next-no` | `pharmacy.pharmacy_bill:add` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| GET | `/pharmacy/dosages` | `pharmacy.medicine_dosage:view` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| POST | `/pharmacy/dosages` | `pharmacy.medicine_dosage:add` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| DELETE | `/pharmacy/dosages/:id` | `pharmacy.medicine_dosage:delete` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| PATCH | `/pharmacy/dosages/:id` | `pharmacy.medicine_dosage:edit` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| GET | `/pharmacy/medicines` | `pharmacy.medicine:view` | ✓ | ✓ | ✓ | ✓ | ✓ | · | · | ✓ | · |
| POST | `/pharmacy/medicines` | `pharmacy.medicine:add` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| GET | `/pharmacy/medicines/:id` | `pharmacy.medicine:view` | ✓ | ✓ | ✓ | ✓ | ✓ | · | · | ✓ | · |
| PATCH | `/pharmacy/medicines/:id` | `pharmacy.medicine:edit` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| POST | `/pharmacy/medicines/:id/bad-stock` | `pharmacy.medicine_bad_stock:add` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| POST | `/pharmacy/medicines/bulk-delete` | `pharmacy.medicine:delete` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| POST | `/pharmacy/medicines/import` | `pharmacy.import_medicine:view` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| GET | `/pharmacy/purchase-items/:id/tpa` | `pharmacy.medicine_purchase:view` | ✓ | ✓ | ✓ | · | ✓ | · | · | ✓ | · |
| PUT | `/pharmacy/purchase-items/:id/tpa` | `pharmacy.medicine_purchase:add` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| GET | `/pharmacy/purchases` | `pharmacy.medicine_purchase:view` | ✓ | ✓ | ✓ | · | ✓ | · | · | ✓ | · |
| POST | `/pharmacy/purchases` | `pharmacy.medicine_purchase:add` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| DELETE | `/pharmacy/purchases/:id` | `pharmacy.medicine_purchase:delete` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| GET | `/pharmacy/purchases/:id` | `pharmacy.medicine_purchase:view` | ✓ | ✓ | ✓ | · | ✓ | · | · | ✓ | · |
| GET | `/pharmacy/suppliers` | `pharmacy.medicine_supplier:view` | ✓ | ✓ | · | ✓ | ✓ | · | · | · | · |
| POST | `/pharmacy/suppliers` | `pharmacy.medicine_supplier:add` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| DELETE | `/pharmacy/suppliers/:id` | `pharmacy.medicine_supplier:delete` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| PATCH | `/pharmacy/suppliers/:id` | `pharmacy.medicine_supplier:edit` | ✓ | ✓ | · | · | ✓ | · | · | · | · |
| GET | `/portal/appointments` | *authenticated* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST | `/portal/appointments` | *authenticated* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/portal/doctors` | *authenticated* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/portal/invoices` | *authenticated* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST | `/portal/invoices/:id/pay` | *authenticated* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/portal/me` | *authenticated* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/portal/notifications` | *authenticated* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST | `/portal/register` | *public* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/portal/visits` | *authenticated* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST | `/radiology/bills` | `radiology.radiology_bill:add` | ✓ | ✓ | · | · | · | · | ✓ | · | · |
| DELETE | `/radiology/bills/:id` | `radiology.radiology_bill:delete` | ✓ | ✓ | · | · | · | · | ✓ | · | · |
| PATCH | `/radiology/bills/:id` | `radiology.radiology_bill:edit` | ✓ | ✓ | · | · | · | · | ✓ | · | · |
| GET | `/radiology/bills/next-no` | `radiology.radiology_bill:add` | ✓ | ✓ | · | · | · | · | ✓ | · | · |
| GET | `/radiology/categories` | `radiology.radiology_category:view` | ✓ | ✓ | · | · | · | · | ✓ | · | · |
| POST | `/radiology/categories` | `radiology.radiology_category:add` | ✓ | ✓ | · | · | · | · | ✓ | · | · |
| DELETE | `/radiology/categories/:id` | `radiology.radiology_category:delete` | ✓ | ✓ | · | · | · | · | ✓ | · | · |
| PATCH | `/radiology/categories/:id` | `radiology.radiology_category:edit` | ✓ | ✓ | · | · | · | · | ✓ | · | · |
| GET | `/radiology/previous-reports` | `radiology.radiology_test:view` | ✓ | ✓ | ✓ | ✓ | · | · | ✓ | ✓ | · |
| GET | `/radiology/tests` | `radiology.radiology_test:view` | ✓ | ✓ | ✓ | ✓ | · | · | ✓ | ✓ | · |
| POST | `/radiology/tests` | `radiology.radiology_test:add` | ✓ | ✓ | · | · | · | · | ✓ | · | · |
| DELETE | `/radiology/tests/:id` | `radiology.radiology_test:delete` | ✓ | ✓ | · | · | · | · | ✓ | · | · |
| GET | `/radiology/tests/:id` | `radiology.radiology_test:view` | ✓ | ✓ | ✓ | ✓ | · | · | ✓ | ✓ | · |
| PATCH | `/radiology/tests/:id` | `radiology.radiology_test:edit` | ✓ | ✓ | · | · | · | · | ✓ | · | · |
| GET | `/radiology/units` | `radiology.radiology_unit:view` | ✓ | ✓ | · | · | · | · | ✓ | · | · |
| POST | `/radiology/units` | `radiology.radiology_unit:add` | ✓ | ✓ | · | · | · | · | ✓ | · | · |
| DELETE | `/radiology/units/:id` | `radiology.radiology_unit:delete` | ✓ | ✓ | · | · | · | · | ✓ | · | · |
| PATCH | `/radiology/units/:id` | `radiology.radiology_unit:edit` | ✓ | ✓ | · | · | · | · | ✓ | · | · |
| GET | `/rbac/roles` | *role* | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/rbac/roles/:slug/permissions` | *role* | ✓ | ✓ | · | · | · | · | · | · | · |
| PUT | `/rbac/roles/:slug/permissions` | *role* | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/records/births` | `birth_death.birth_record:view` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| POST | `/records/births` | `birth_death.birth_record:add` | ✓ | ✓ | · | ✓ | · | · | · | · | · |
| DELETE | `/records/births/:id` | `birth_death.birth_record:delete` | ✓ | ✓ | · | ✓ | · | · | · | · | · |
| GET | `/records/births/:id` | `birth_death.birth_record:view` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| PATCH | `/records/births/:id` | `birth_death.birth_record:edit` | ✓ | ✓ | · | ✓ | · | · | · | · | · |
| GET | `/records/deaths` | `birth_death.death_record:view` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| POST | `/records/deaths` | `birth_death.death_record:add` | ✓ | ✓ | · | ✓ | · | · | · | · | · |
| DELETE | `/records/deaths/:id` | `birth_death.death_record:delete` | ✓ | ✓ | · | ✓ | · | · | · | · | · |
| GET | `/records/deaths/:id` | `birth_death.death_record:view` | ✓ | ✓ | · | ✓ | · | · | · | ✓ | · |
| PATCH | `/records/deaths/:id` | `birth_death.death_record:edit` | ✓ | ✓ | · | ✓ | · | · | · | · | · |
| GET | `/referral/patients/:patientId` | `referral.referral_commission:view` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/referral/payments` | `referral.referral_payment:view` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| POST | `/referral/payments` | `referral.referral_payment:add` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| DELETE | `/referral/payments/:id` | `referral.referral_payment:delete` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| PATCH | `/referral/payments/:id` | `referral.referral_payment:edit` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/referral/persons` | `referral.referral_person:view` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| POST | `/referral/persons` | `referral.referral_person:add` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| DELETE | `/referral/persons/:id` | `referral.referral_person:delete` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| PATCH | `/referral/persons/:id` | `referral.referral_person:edit` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/reports/:key` | *per request* | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| GET | `/reports/categories` | *authenticated* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET | `/settings` | *role* | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/settings/general` | *role* | ✓ | ✓ | · | · | · | · | · | · | · |
| PUT | `/settings/general` | *role* | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/settings/prefixes` | *role* | ✓ | ✓ | · | · | · | · | · | · | · |
| PUT | `/settings/prefixes` | *role* | ✓ | ✓ | · | · | · | · | · | · | · |
| GET | `/shifts` | `appointment.shift:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| POST | `/shifts` | `appointment.shift:add` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| DELETE | `/shifts/:id` | `appointment.shift:delete` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| PATCH | `/shifts/:id` | `appointment.shift:edit` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| GET | `/symptom-types` | `system_settings.symptoms_type:view` | ✓ | ✓ | · | ✓ | · | · | · | · | · |
| POST | `/symptom-types` | `system_settings.symptoms_type:add` | ✓ | ✓ | · | ✓ | · | · | · | · | · |
| GET | `/tax-categories` | `hospital_charges.tax_category:view` | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | · | · |
| POST | `/tax-categories` | `hospital_charges.tax_category:add` | ✓ | ✓ | ✓ | · | ✓ | · | ✓ | · | · |
| DELETE | `/tax-categories/:id` | `hospital_charges.tax_category:delete` | ✓ | ✓ | ✓ | · | ✓ | · | ✓ | · | · |
| PATCH | `/tax-categories/:id` | `hospital_charges.tax_category:edit` | ✓ | ✓ | ✓ | · | ✓ | · | ✓ | · | · |
| GET | `/tpas` | `tpa.organisation:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| POST | `/tpas` | `tpa.organisation:add` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| DELETE | `/tpas/:id` | `tpa.organisation:delete` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/tpas/:id` | `tpa.organisation:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| PATCH | `/tpas/:id` | `tpa.organisation:edit` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/tpas/:id/charges` | `tpa.tpa_charges:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| DELETE | `/tpas/:id/charges/:chargeId` | `tpa.tpa_charges:delete` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| PUT | `/tpas/:id/charges/:chargeId` | `tpa.tpa_charges:edit` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| POST | `/tpas/:id/charges/import` | `tpa.tpa_charges:edit` | ✓ | ✓ | ✓ | · | · | · | · | · | · |
| GET | `/tpas/report` | `tpa.organisation:view` | ✓ | ✓ | ✓ | ✓ | · | · | · | ✓ | · |
| GET | `/vital-types` | `system_settings.vital:view` | ✓ | ✓ | · | · | · | · | · | · | · |
| POST | `/vital-types` | `system_settings.vital:add` | ✓ | ✓ | · | · | · | · | · | · | · |
