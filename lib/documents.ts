// Server-side generation of the official ZAMCOPS document set, issued when a
// membership application is approved:
//   1. the completed membership application form (Individual / Group / Publisher)
//   2. the Deed of Assignment — signed by the member, counter-signed by the
//      Board Secretary's stored official signature
//   3. the admission letter — signed by the General Manager
// Runs only on the server (approval route), so official signature images never
// reach the client raw — members only ever receive the rendered PDFs.

import { jsPDF } from "jspdf";
import {
  type ApplicationFormDef,
  type ApplicationFormType,
  FORM_DEFS,
  ADMIN_FIELDS,
  DECLARATION_TEXT,
  applicantName,
} from "@/lib/applicationForms";
import { DEED_TITLE, DEED_RECITAL, DEED_CLAUSES } from "@/lib/deedText";
import {
  INK,
  MUTED,
  M,
  W,
  type GeneratedPdf,
  type MemberLike,
  type OfficialSigner,
  fmtDate,
  labelValueRow,
  letterhead,
  output,
  paragraph,
  repeatTable,
  sectionHeading,
  signatureBlock,
} from "@/lib/pdfKit";

export type { GeneratedPdf, OfficialSigner } from "@/lib/pdfKit";

function valueOf(payload: Record<string, unknown>, key: string, type: string): string {
  const v = payload[key];
  if (type === "checkboxes") return Array.isArray(v) ? v.join(", ") : "";
  if (type === "date") return v ? fmtDate(String(v)) : "";
  return String(v ?? "").trim();
}

// ── 1. The completed membership application form ───────────────────────────

export function generateApplicationFormPdf(opts: {
  member: MemberLike;
  formType: ApplicationFormType;
  payload: Record<string, unknown>;
  adminFields: Record<string, unknown>;
  submittedAt: Date | null;
  reference: string;
}): GeneratedPdf {
  const def: ApplicationFormDef = FORM_DEFS[opts.formType];
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const p = letterhead(doc, def.title);

  labelValueRow(p, "Member number", opts.member.memberNumber);
  labelValueRow(p, "Internal number", valueOf(opts.adminFields, "internalNumber", "text"));

  for (const section of def.sections) {
    sectionHeading(p, section.title);
    for (const f of section.fields ?? []) {
      if (f.showIf && String(opts.payload[f.showIf.key] ?? "") !== f.showIf.value) continue;
      labelValueRow(p, f.label, valueOf(opts.payload, f.key, f.type));
    }
    if (section.repeat) {
      const rows = Array.isArray(opts.payload[section.repeat.key])
        ? (opts.payload[section.repeat.key] as Record<string, string>[])
        : [];
      repeatTable(p, section.repeat.columns, rows);
    }
  }

  // Internal use — staff-entered fields.
  const filledAdmin = ADMIN_FIELDS.filter((f) => valueOf(opts.adminFields, f.key, f.type));
  if (filledAdmin.length > 0) {
    sectionHeading(p, "For official use only");
    for (const f of filledAdmin) labelValueRow(p, f.label, valueOf(opts.adminFields, f.key, f.type));
  }

  // Declaration + applicant signature.
  p.ensure(60);
  sectionHeading(p, "Declaration");
  paragraph(p, DECLARATION_TEXT, { size: 9, gap: 6 });
  signatureBlock(p, {
    x: M,
    width: 80,
    label: "Signature of applicant",
    name: applicantName(opts.formType, opts.payload, opts.member.fullName),
    role: "Applicant",
    image: opts.member.signature || undefined,
    date: fmtDate(opts.submittedAt ?? new Date()),
  });

  return output(doc, `${opts.formType}-Membership-Application-${opts.member.memberNumber}.pdf`, opts.reference);
}

// ── 2. The Deed of Assignment (incl. Mechanical) ───────────────────────────

export function generateDeedPdf(opts: {
  member: MemberLike;
  formType: ApplicationFormType;
  payload: Record<string, unknown>;
  deedAgreedAt: Date | null;
  boardSecretary: OfficialSigner;
  reference: string;
}): GeneratedPdf {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const p = letterhead(doc, DEED_TITLE);
  const assignor = applicantName(opts.formType, opts.payload, opts.member.fullName);
  const deedDate = fmtDate(opts.deedAgreedAt ?? new Date());

  for (const line of DEED_RECITAL) {
    const text = line.replace("{{DATE}}", deedDate).replace("{{ASSIGNOR}}", `${assignor} (${opts.member.memberNumber})`);
    const emphasis = line.includes("{{ASSIGNOR}}") || line.startsWith("ZAMBIA");
    paragraph(p, text, { size: emphasis ? 10.5 : 9.5, bold: emphasis, gap: 1.5 });
  }
  p.y += 2;

  for (const clause of DEED_CLAUSES) {
    if (clause.heading) {
      paragraph(p, `${clause.heading}  ${clause.body}`, { size: 9, gap: 2 });
    } else {
      paragraph(p, clause.body, { size: 9, indent: clause.indent ? 6 : 0, gap: 2 });
    }
  }

  // Execution blocks — Assignor and the Society (Board Secretary).
  p.ensure(50);
  p.y += 6;
  const colW = (W - M * 2 - 10) / 2;
  const startY = p.y;
  signatureBlock(p, {
    x: M,
    width: colW,
    label: "Signed by or for and on behalf of THE ASSIGNOR",
    name: assignor,
    role: "Assignor",
    image: opts.member.signature || undefined,
    date: deedDate,
  });
  p.y = startY;
  signatureBlock(p, {
    x: M + colW + 10,
    width: colW,
    label: "Signed for and on behalf of THE SOCIETY",
    name: opts.boardSecretary.officerName,
    role: opts.boardSecretary.officerTitle || "BOARD SECRETARY",
    image: opts.boardSecretary.image,
    date: fmtDate(new Date()),
  });
  p.y = startY + 36;

  return output(doc, `Deed-of-Assignment-${opts.member.memberNumber}.pdf`, opts.reference);
}

// ── 3. The admission letter ────────────────────────────────────────────────

export function generateAdmissionLetterPdf(opts: {
  member: MemberLike;
  formType: ApplicationFormType;
  payload: Record<string, unknown>;
  applicationDate: Date | null;
  membershipClass: string; // e.g. "CANDIDATE"
  generalManager: OfficialSigner;
  reference: string;
}): GeneratedPdf {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const p = letterhead(doc, "");
  p.y = 54;

  const name = applicantName(opts.formType, opts.payload, opts.member.fullName);
  const addressLines = [
    name,
    ...String(opts.member.address || "").split(/\n|,/).map((s) => s.trim()).filter(Boolean),
    [opts.member.district, opts.member.province].filter(Boolean).join(", "),
  ].filter(Boolean);

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const line of addressLines) {
    doc.text(line, M, p.y);
    p.y += 5;
  }
  p.y += 2;
  doc.setTextColor(...MUTED);
  doc.setFontSize(9.5);
  doc.text(fmtDate(new Date()), W - M, p.y, { align: "right" });
  p.y += 10;

  paragraph(p, "Dear Sir / Madam,", { size: 10, gap: 4 });
  paragraph(p, "RE: MEMBERSHIP TO ZAMCOPS", { size: 10.5, bold: true, gap: 5 });
  paragraph(
    p,
    `Reference is made to your application for membership dated ${fmtDate(opts.applicationDate ?? new Date())}.`,
    { size: 10, gap: 4 }
  );
  paragraph(
    p,
    `I am pleased to inform you that you have been admitted as ${(opts.membershipClass || "CANDIDATE").toUpperCase()} member of ZAMCOPS (member number ${opts.member.memberNumber}).`,
    { size: 10, gap: 4 }
  );
  paragraph(p, "Find enclosed a copy of a duly signed “DEED OF ASSIGNMENT” for your record.", {
    size: 10,
    gap: 8,
  });
  paragraph(p, "Yours faithfully,", { size: 10, gap: 2 });

  p.ensure(40);
  p.y += 4;
  signatureBlock(p, {
    x: M,
    width: 80,
    label: "",
    name: opts.generalManager.officerName,
    role: opts.generalManager.officerTitle || "GENERAL MANAGER",
    image: opts.generalManager.image,
  });

  return output(doc, `Admission-Letter-${opts.member.memberNumber}.pdf`, opts.reference);
}
