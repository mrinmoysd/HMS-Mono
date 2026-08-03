/**
 * Branded print helper (Phase C7). Renders a hospital letterhead document —
 * header, patient/meta block, one or more sections (tables / key-values / text),
 * and a signature footer — then opens the browser print dialog (also "Save as PDF").
 */

import type { AmbulanceCallDto, BirthRecordDto, BloodIssueDto, DeathRecordDto, EncounterBillingDto, InvoiceDto, IpdAdmissionDetailDto, OpdVisitDetailDto, OpdVisitDto, PrescriptionDto } from '@smart-hospital/shared';
import { formatAge } from './utils';

const HOSPITAL = 'Smart Hospital & Research Center';
const HOSPITAL_SUB = 'Your Health, Our Responsibility';

export interface PrintSection {
  heading?: string;
  table?: { headers: string[]; rows: (string | number)[][] };
  rows?: [string, string][];
  text?: string;
  /** Raw HTML (e.g. from a rich-text editor) — not escaped, renders as-is. */
  html?: string;
}

export interface PrintDoc {
  documentTitle: string;
  heading: string;
  meta?: [string, string][];
  sections: PrintSection[];
  footer?: string;
}

function esc(s: string | number): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderSection(s: PrintSection): string {
  const heading = s.heading ? `<h3>${esc(s.heading)}</h3>` : '';
  if (s.table) {
    const thead = `<tr>${s.table.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
    const tbody = s.table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
    return `${heading}<table class="grid"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
  }
  if (s.rows) {
    const body = s.rows.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');
    return `${heading}<table class="kv"><tbody>${body}</tbody></table>`;
  }
  if (s.text) return `${heading}<p class="text">${esc(s.text)}</p>`;
  if (s.html) return `${heading}<div class="rich-text">${s.html}</div>`;
  return heading;
}

export function printDocument(doc: PrintDoc): void {
  const w = window.open('', '_blank');
  if (!w) return;
  const meta = doc.meta && doc.meta.length
    ? `<div class="meta">${doc.meta.map(([k, v]) => `<span><b>${esc(k)}:</b> ${esc(v)}</span>`).join('')}</div>`
    : '';
  const sections = doc.sections.map(renderSection).join('');
  w.document.write(`<html><head><meta charset="utf-8"><title>${esc(doc.documentTitle)}</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:Inter,system-ui,-apple-system,sans-serif;color:#0f172a;padding:32px;margin:0}
      .letterhead{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1E63E9;padding-bottom:12px}
      .letterhead h1{color:#1E63E9;margin:0;font-size:22px}
      .letterhead p{color:#64748b;margin:2px 0 0;font-size:12px}
      .doc-title{margin:16px 0 4px;font-size:16px;font-weight:600}
      .meta{display:flex;flex-wrap:wrap;gap:6px 24px;color:#334155;font-size:13px;margin:8px 0 16px}
      h3{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin:18px 0 6px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      table.grid th,table.grid td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
      table.grid th{background:#f1f5f9}
      table.kv td{padding:3px 8px;vertical-align:top}
      table.kv td.k{color:#64748b;width:200px}
      .text{font-size:13px;line-height:1.6}
      .rich-text{font-size:13px;line-height:1.6}
      .rich-text p{margin:0 0 6px}
      .rich-text ul{margin:0 0 6px;padding-left:20px;list-style:disc}
      .rich-text ol{margin:0 0 6px;padding-left:20px;list-style:decimal}
      .footer{margin-top:56px;text-align:right;color:#64748b;font-size:13px}
      @media print{body{padding:0}}
    </style></head>
    <body>
      <div class="letterhead">
        <div><h1>${esc(HOSPITAL)}</h1><p>${esc(HOSPITAL_SUB)}</p></div>
        <div style="text-align:right;color:#64748b;font-size:12px">${new Date().toLocaleString()}</div>
      </div>
      <div class="doc-title">${esc(doc.heading)}</div>
      ${meta}
      ${sections}
      <div class="footer">${esc(doc.footer ?? 'Authorised Signatory')}</div>
    </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

/** Print the rich Add Prescription builder's output (Patient Visit parity V2). */
export function printPrescriptionRx(rx: PrescriptionDto, patientName?: string): void {
  const meta: [string, string][] = [
    ['Patient', patientName ?? '—'],
    ['Date', new Date(rx.createdAt).toLocaleDateString()],
    ['Prescribed By', rx.prescribedByName ?? '—'],
  ];
  if (rx.symptoms) meta.push(['Symptoms', rx.symptoms]);

  const sections: PrintSection[] = [];
  if (rx.headerNote) sections.push({ html: rx.headerNote });
  if (rx.findingPrint && (rx.findingCategoryName || rx.findingList.length || rx.findingDescription)) {
    sections.push({
      heading: 'Findings',
      text: [rx.findingCategoryName, rx.findingList.join(', '), rx.findingDescription].filter(Boolean).join(' — '),
    });
  }
  sections.push({
    heading: 'Medicines',
    table: {
      headers: ['Medicine', 'Dose', 'Interval', 'Duration', 'Instruction'],
      rows: rx.items.map((it) => [it.medicineName, it.dosage ?? '', it.interval ?? '', it.duration ?? '', it.instruction ?? '']),
    },
  });
  if (rx.footerNote) sections.push({ html: rx.footerNote });
  if (rx.pathologyTestNames.length) sections.push({ heading: 'Pathology', text: rx.pathologyTestNames.join(', ') });
  if (rx.radiologyTestNames.length) sections.push({ heading: 'Radiology', text: rx.radiologyTestNames.join(', ') });

  printDocument({
    documentTitle: 'Prescription',
    heading: 'Prescription (Rx)',
    meta,
    sections,
    footer: "Doctor's Signature",
  });
}

/**
 * Shared field list for the "Manual Prescription" letterhead (Patient Visit parity V3) —
 * used by both the on-screen preview modal and the printout, so they stay identical.
 */
export function opdPrescriptionMeta(v: OpdVisitDetailDto): [string, string][] {
  return [
    ['OPD No', v.opdNo],
    ['OPD Checkup ID', v.opdNo],
    ['Date', new Date(v.appointmentDate).toLocaleDateString()],
    ['Patient Name', v.patientName],
    ['Age', formatAge(v.age)],
    ['Gender', v.gender ?? '—'],
    ['Blood Group', v.bloodGroup ?? '—'],
    ['Address', v.address ?? '—'],
    ['Consultant Doctor', v.consultantName],
    ['Known Allergies', v.knownAllergies ?? '—'],
  ];
}

/** Print the "Manual Prescription" letterhead (blank Rx pad) or the row's "Print" action. */
export function printOpdPrescription(v: OpdVisitDetailDto): void {
  printDocument({
    documentTitle: 'OPD Prescription',
    heading: 'OPD Prescription',
    meta: opdPrescriptionMeta(v),
    sections: [],
    footer: "Doctor's Signature",
  });
}

/** Print a branded OPD visit slip (Patient Visit parity V1's "Save & Print"). */
export function printOpdVisitSlip(v: OpdVisitDto): void {
  printDocument({
    documentTitle: 'OPD Visit',
    heading: `OPD Visit Slip — ${v.opdNo}`,
    meta: [
      ['Patient', v.patientName],
      ['Case ID', v.caseNo ?? '—'],
      ['Consultant', v.consultantName],
      ['Date', new Date(v.appointmentDate).toLocaleString()],
    ],
    sections: [
      { heading: 'Symptoms', text: v.symptoms || 'None recorded' },
      {
        heading: 'Billing',
        rows: [
          ['Net Amount', v.netAmount.toFixed(2)],
          ['Paid', v.paid.toFixed(2)],
          ['Balance', v.balance.toFixed(2)],
        ],
      },
    ],
    footer: 'Authorised Signatory',
  });
}

/** Print the branded "Pharmacy Bill" letterhead (Pharmacy Bill list "Bill Details" action). */
export function printPharmacyBill(inv: InvoiceDto): void {
  printDocument({
    documentTitle: 'Pharmacy Bill',
    heading: 'Pharmacy Bill',
    meta: [
      ['Bill No', inv.billNo],
      ['Date', new Date(inv.billDate).toLocaleString()],
      ['Name', inv.patientName],
      ['Phone', inv.patientPhone ?? '—'],
      ['Doctor', inv.consultantName ?? '—'],
      ['Case ID', inv.caseNo ?? '—'],
    ],
    sections: [
      {
        heading: 'Medicines',
        table: {
          headers: ['Medicine Name', 'Qty', 'Discount %', 'Tax %', 'Amount'],
          rows: (inv.items ?? []).map((it) => [it.name, it.qty, it.discountPct, it.taxPct, it.amount.toFixed(2)]),
        },
      },
      {
        heading: 'Summary',
        rows: [
          ['Total', inv.subtotal.toFixed(2)],
          ['Total Discount', inv.discount.toFixed(2)],
          ['Total Tax', inv.tax.toFixed(2)],
          ['Net Amount', inv.netAmount.toFixed(2)],
          ['Total Paid', inv.paid.toFixed(2)],
          ['Due', inv.balance.toFixed(2)],
          ['Collected By', inv.createdByName ?? '—'],
        ],
      },
    ],
    footer: 'This invoice is printed electronically, so no signature is required',
  });
}

/** Print the branded "Pathology/Radiology Bill" letterhead (Bill Details "Print" action). */
export function printDiagnosticBill(title: string, inv: InvoiceDto): void {
  printDocument({
    documentTitle: `${title} Bill`,
    heading: `${title} Bill`,
    meta: [
      ['Bill No', inv.billNo],
      ['Prescription No', inv.prescriptionNo ?? '—'],
      ['Date', new Date(inv.billDate).toLocaleString()],
      ['Name', inv.patientName],
      ['Age', formatAge(inv.patientAge)],
      ['Gender', inv.patientGender ?? '—'],
      ['Phone', inv.patientPhone ?? '—'],
      ['Doctor', inv.referenceDoctor || inv.consultantName || '—'],
      ['Case ID', inv.caseNo ?? '—'],
    ],
    sections: [
      {
        heading: 'Tests',
        table: {
          headers: ['Test Name', 'Discount %', 'Tax %', 'Amount'],
          rows: (inv.items ?? []).map((it) => [it.name, it.discountPct, it.taxPct, it.amount.toFixed(2)]),
        },
      },
      {
        heading: 'Summary',
        rows: [
          ['Total', inv.subtotal.toFixed(2)],
          ['Total Discount', inv.discount.toFixed(2)],
          ['Total Tax', inv.tax.toFixed(2)],
          ['Net Amount', inv.netAmount.toFixed(2)],
          ['Total Deposit', inv.paid.toFixed(2)],
          ['Balance Amount', inv.balance.toFixed(2)],
          ['Generated By', inv.createdByName ?? '—'],
        ],
      },
    ],
    footer: 'This invoice is printed electronically, so no signature is required',
  });
}

/** Print the branded "Blood/Component Issue Bill" letterhead (Bill Details "Print" action). */
export function printBloodIssueBill(title: string, iss: BloodIssueDto): void {
  printDocument({
    documentTitle: `${title} Bill`,
    heading: `${title} Bill`,
    meta: [
      ['Bill No', iss.billNo],
      ['Case ID', iss.caseNo ?? '—'],
      ['Date', new Date(iss.issueDate).toLocaleString()],
      ['Received To', iss.patientName],
      ['Blood Group', iss.bloodGroup ?? '—'],
      ['Donor Name', iss.donorName ?? '—'],
      ['Doctor', iss.consultantName || iss.referenceDoctor || '—'],
    ],
    sections: [
      {
        heading: 'Issue Details',
        rows: [
          ['Bags', iss.bagNo ?? '—'],
          ['Component', iss.component ?? '—'],
          ['Blood Qty', iss.bloodQty ?? '—'],
          ['Technician', iss.technician ?? '—'],
          ['Note', iss.note ?? '—'],
        ],
      },
      {
        heading: 'Summary',
        rows: [
          ['Total', iss.subtotal.toFixed(2)],
          ['Total Discount', iss.discount.toFixed(2)],
          ['Total Tax', iss.tax.toFixed(2)],
          ['Net Amount', iss.netAmount.toFixed(2)],
          ['Total Deposit', iss.paid.toFixed(2)],
          ['Balance Amount', iss.balance.toFixed(2)],
          ['Generated By', iss.createdByName ?? '—'],
        ],
      },
    ],
    footer: 'This invoice is printed electronically, so no signature is required',
  });
}

/** Print the branded "Ambulance" bill letterhead (Bill Details "Print" action). */
export function printAmbulanceBill(call: AmbulanceCallDto): void {
  printDocument({
    documentTitle: 'Ambulance Bill',
    heading: 'Ambulance',
    meta: [
      ['Bill No', call.billNo],
      ['Case ID', call.caseNo ?? '—'],
      ['Date', new Date(call.date).toLocaleString()],
      ['Patient Name', call.patientName],
      ['Driver Name', call.driverName ?? '—'],
      ['Vehicle Number', call.vehicleNo],
      ['Vehicle Model', call.vehicleModel ?? '—'],
      ['Charge Category', call.chargeCategoryName ?? '—'],
      ['Charge Name', call.chargeName ?? '—'],
      ['Collected By', call.createdByName ?? '—'],
    ],
    sections: [
      {
        heading: 'Summary',
        rows: [
          ['Amount', call.subtotal.toFixed(2)],
          ['Discount', call.discount.toFixed(2)],
          ['Tax', call.tax.toFixed(2)],
          ['Net Amount', call.netAmount.toFixed(2)],
          ['Paid Amount', call.paid.toFixed(2)],
          ['Due Amount', call.balance.toFixed(2)],
        ],
      },
    ],
    footer: 'This invoice is printed electronically, so no signature is required',
  });
}

/** Print a branded encounter bill (charges + payments + totals) for an OPD visit or IPD admission. */
export function printEncounterBill(data: EncounterBillingDto, kindLabel: string): void {
  const sections: PrintSection[] = [
    {
      heading: 'Charges',
      table: {
        headers: ['Charge', 'Applied', 'Qty', 'Disc %', 'Tax %', 'Amount'],
        rows: data.charges.length
          ? data.charges.map((c) => [c.name, c.appliedCharge.toFixed(2), c.qty, c.discountPct, c.taxPct, c.amount.toFixed(2)])
          : [['No charges', '', '', '', '', '']],
      },
    },
    {
      heading: 'Summary',
      rows: [
        ['Subtotal', data.subtotal.toFixed(2)],
        ['Discount', data.discount.toFixed(2)],
        ['Tax', data.tax.toFixed(2)],
        ['Net Amount', data.netAmount.toFixed(2)],
        ['Paid', data.paid.toFixed(2)],
        ['Balance', data.balance.toFixed(2)],
      ],
    },
  ];
  if (data.payments.length) {
    sections.push({
      heading: 'Payments',
      table: {
        headers: ['Date', 'Mode', 'Reference', 'Amount'],
        rows: data.payments.map((p) => [new Date(p.paidAt).toLocaleString(), p.mode.toUpperCase(), p.reference ?? '—', p.amount.toFixed(2)]),
      },
    });
  }
  printDocument({
    documentTitle: `${kindLabel} Bill`,
    heading: `${kindLabel} Bill — ${data.header.encounterNo}`,
    meta: [
      ['Patient', data.header.patientName],
      ['Case ID', data.header.caseNo ?? '—'],
      ['Consultant', data.header.consultantName],
      ['Date', new Date(data.header.date).toLocaleDateString()],
    ],
    sections,
    footer: 'Authorised Signatory',
  });
}

/** Print a branded Birth Certificate / record slip. */
export function printBirthRecord(b: BirthRecordDto): void {
  printDocument({
    documentTitle: 'Birth Record',
    heading: 'Birth Record Details',
    meta: [
      ['Reference No', b.referenceNo],
      ['Case ID', b.caseNo ?? '—'],
      ['Birth Date', new Date(b.birthDate).toLocaleString()],
      ['Weight', b.weight ?? '—'],
      ['Gender', b.gender ?? '—'],
      ['Phone', b.phone ?? '—'],
      ['Address', b.address ?? '—'],
      ['Blood Group', b.bloodGroup ?? '—'],
      ['Child Name', b.childName],
      ['Mother Name', b.motherName ?? '—'],
      ['Father Name', b.fatherName ?? '—'],
      ['Collected By', b.createdByName ?? '—'],
    ],
    sections: b.report ? [{ heading: 'Report', text: b.report }] : [],
    footer: 'Authorised Signatory',
  });
}

/** Print a branded Death Certificate / record slip. */
export function printDeathRecord(d: DeathRecordDto): void {
  printDocument({
    documentTitle: 'Death Record',
    heading: 'Death Record Details',
    meta: [
      ['Reference No', d.referenceNo],
      ['Case ID', d.caseNo ?? '—'],
      ['Death Date', new Date(d.deathDate).toLocaleString()],
      ['Gender', d.gender ?? '—'],
      ['Patient Name', d.patientName],
      ['Age', d.age ?? '—'],
      ['Guardian Name', d.guardianName ?? '—'],
      ['Address', d.address ?? '—'],
      ['Blood Group', d.bloodGroup ?? '—'],
      ['Collected By', d.createdByName ?? '—'],
    ],
    sections: d.cause ? [{ heading: 'Death Report', text: d.cause }] : [],
    footer: 'Authorised Signatory',
  });
}

const DISCHARGE_STATUS_LABEL: Record<string, string> = {
  normal: 'Normal',
  referral: 'Referral',
  death: 'Death',
};

/**
 * Discharge Card, printed from what was captured on discharge (blueprint §8.5).
 * An admission that is still `admitted` has none of those fields yet, so this
 * prints the identity/billing half only rather than a card full of dashes.
 */
export function printDischargeCard(a: IpdAdmissionDetailDto): void {
  const clinical: [string, string][] = [
    ['Operation', a.dischargeOperation ?? ''],
    ['Diagnosis', a.dischargeDiagnosis ?? ''],
    ['Investigation', a.dischargeInvestigation ?? ''],
    ['Treatment / Home Remedy', a.treatmentHome ?? ''],
  ].filter(([, v]) => v.trim() !== '') as [string, string][];

  printDocument({
    documentTitle: `Discharge Card — ${a.ipdNo}`,
    heading: 'Discharge Card',
    meta: [
      ['IPD No', a.ipdNo],
      ['Case ID', a.caseNo ?? '—'],
      ['Patient Name', a.patientName],
      ['Gender', a.gender ?? '—'],
      ['Age', formatAge(a.age)],
      ['Blood Group', a.bloodGroup ?? '—'],
      ['Phone', a.phone ?? '—'],
      ['Address', a.address ?? '—'],
      ['Consultant', a.consultantName],
      ['Bed', a.bedLabel],
      ['Admission Date', new Date(a.admissionDate).toLocaleString()],
      ['Discharge Date', a.dischargeDate ? new Date(a.dischargeDate).toLocaleString() : '—'],
      ['Discharge Status', a.dischargeStatus ? DISCHARGE_STATUS_LABEL[a.dischargeStatus] ?? a.dischargeStatus : '—'],
    ],
    sections: [
      ...(clinical.length ? [{ heading: 'Clinical Summary', rows: clinical }] : []),
      ...(a.dischargeNote ? [{ heading: 'Note', text: a.dischargeNote }] : []),
      {
        heading: 'Account',
        rows: [
          ['Net Amount', a.billedAmount.toFixed(2)],
          ['Tax', a.taxAmount.toFixed(2)],
          ['Paid', a.paidAmount.toFixed(2)],
          ['Balance', a.balance.toFixed(2)],
        ] as [string, string][],
      },
    ],
    footer: 'Authorised Signatory',
  });
}
