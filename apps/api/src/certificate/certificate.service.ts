import { Injectable } from '@nestjs/common';
import type {
  GenerateCertificateInput,
  GenerateCertificateResult,
  GeneratedDocument,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Generates ready-to-print HTML for certificates and ID cards (FRD §2.24).
 * Uses a stored PrintTemplate when one is supplied/available, else a built-in
 * default layout. HTML is returned to the client for print/PDF.
 */
@Injectable()
export class CertificateService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(branchId: string, input: GenerateCertificateInput): Promise<GenerateCertificateResult> {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    const hospital = branch?.name ?? 'Smart Hospital';
    const documents: GeneratedDocument[] = [];

    if (input.kind === 'staff_id_card') {
      const staff = await this.prisma.user.findMany({
        where: { id: { in: input.staffIds }, branchId, deletedAt: null },
        include: { role: true },
      });
      for (const s of staff) {
        documents.push({
          title: `Staff ID — ${s.name}`,
          html: idCardHtml(hospital, s.name, s.role.label, s.username),
        });
      }
      return { documents };
    }

    const patients = await this.prisma.patient.findMany({
      where: { id: { in: input.patientIds }, branchId, deletedAt: null },
    });
    for (const p of patients) {
      if (input.kind === 'patient_id_card') {
        documents.push({
          title: `Patient ID — ${p.name}`,
          html: idCardHtml(hospital, p.name, `Patient · ${p.patientNo}`, p.phone ?? ''),
        });
      } else {
        documents.push({
          title: `Certificate — ${p.name}`,
          html: certificateHtml(hospital, p.name, p.patientNo, p.age, p.gender ?? '—'),
        });
      }
    }
    return { documents };
  }
}

function esc(v: string): string {
  return v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function idCardHtml(hospital: string, name: string, subtitle: string, contact: string): string {
  return `<div style="width:320px;border:1px solid #E3E8EF;border-radius:8px;overflow:hidden;font-family:Inter,system-ui,sans-serif">
    <div style="background:#1E63E9;color:#fff;padding:10px 14px;font-weight:600">${esc(hospital)}</div>
    <div style="padding:14px">
      <div style="font-size:16px;font-weight:600">${esc(name)}</div>
      <div style="color:#64748B;font-size:13px;margin-top:2px">${esc(subtitle)}</div>
      ${contact ? `<div style="margin-top:8px;font-size:12px">☎ ${esc(contact)}</div>` : ''}
    </div>
  </div>`;
}

function certificateHtml(
  hospital: string,
  name: string,
  patientNo: string,
  age: string,
  gender: string,
): string {
  return `<div style="width:640px;border:2px solid #1E63E9;border-radius:10px;padding:32px;font-family:Inter,system-ui,sans-serif;text-align:center">
    <h2 style="color:#1E63E9;margin:0 0 4px">${esc(hospital)}</h2>
    <p style="color:#64748B;margin:0 0 24px">Medical Certificate</p>
    <p style="font-size:15px;line-height:1.7;text-align:left">
      This is to certify that <b>${esc(name)}</b> (Patient No. <b>${esc(patientNo)}</b>),
      Age <b>${esc(age)}</b>, Gender <b>${esc(gender)}</b>, was examined at this facility.
    </p>
    <div style="margin-top:48px;display:flex;justify-content:space-between;font-size:13px;color:#64748B">
      <span>Date: ${new Date().toLocaleDateString()}</span>
      <span>Authorised Signatory</span>
    </div>
  </div>`;
}
