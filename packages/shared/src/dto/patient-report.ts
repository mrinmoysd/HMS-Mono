/** Consolidated "Patient Details" report — every visit + all department bills (demo's ☰ show action). */

export interface PatientReportHeader {
  patientNo: string;
  name: string;
  gender: string | null;
  age: string;
  maritalStatus: string | null;
  bloodGroup: string | null;
  guardianName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tpaName: string | null;
  tpaIdNo: string | null;
  tpaValidity: string | null;
  allergies: string | null;
}

export interface PatientReportVisit {
  /** Encounter id — the report's rows link through to the visit/admission. */
  id: string;
  no: string;
  caseNo: string | null;
  date: string;
  doctorName: string;
  symptoms: string | null;
  findings: string | null;
  /**
   * OPD Checkup IDs on this visit, comma-joined (blueprint §5.3 §1). Null for
   * IPD rows, which have no checkup sub-entity.
   */
  checkupNos: string | null;
}

export interface PatientReportBill {
  billNo: string;
  caseNo: string | null;
  date: string;
  amount: number;
  discount: number;
  tax: number;
  paid: number;
  refund: number;
  balance: number;
}

export interface PatientReportBillTotals {
  amount: number;
  discount: number;
  tax: number;
  paid: number;
  refund: number;
  balance: number;
}

export interface PatientReportModuleGroup {
  module: string;
  rows: PatientReportBill[];
  totals: PatientReportBillTotals;
}

export interface PatientReportDto {
  header: PatientReportHeader;
  opd: PatientReportVisit[];
  ipd: PatientReportVisit[];
  bills: PatientReportModuleGroup[];
}
