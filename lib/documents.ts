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
  SOCIETY_NAME,
  SOCIETY_TAGLINE,
  SOCIETY_ADDRESS,
  SOCIETY_CONTACT,
  applicantName,
} from "@/lib/applicationForms";
import { DEED_TITLE, DEED_RECITAL, DEED_CLAUSES } from "@/lib/deedText";
import { BRAND_LOGO_PNG, BRAND_LOGO_RATIO } from "@/lib/brandLogo";

const INK: [number, number, number] = [26, 29, 33];
const MUTED: [number, number, number] = [90, 100, 112];
const ORANGE: [number, number, number] = [242, 108, 33];
const LINE: [number, number, number] = [231, 233, 237];
const FLAG: [number, number, number][] = [
  [242, 108, 33],
  [226, 52, 43],
  [201, 206, 218],
  [43, 164, 90],
];

const W = 210; // A4 portrait, mm
const M = 18; // page margin
const BOTTOM = 278; // content floor before we break the page

export interface OfficialSigner {
  officerName: string;
  officerTitle: string;
  image: string; // transparent PNG data URL
}

interface MemberLike {
  fullName: string;
  memberNumber: string;
  email: string;
  phone: string;
  address?: string | null;
  district?: string | null;
  province?: string | null;
  signature?: string | null;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

// Cursor that knows how to paginate.
class Page {
  y: number;
  constructor(public doc: jsPDF, startY: number) {
    this.y = startY;
  }
  ensure(height: number) {
    if (this.y + height > BOTTOM) {
      this.doc.addPage();
      this.y = 20;
    }
  }
}

// The society letterhead: official logo, name, tagline, address, flag line,
// document title.
function letterhead(doc: jsPDF, title: string): Page {
  const logoH = 13;
  const logoW = logoH * BRAND_LOGO_RATIO;
  try {
    doc.addImage(BRAND_LOGO_PNG, "PNG", (W - logoW) / 2, 8, logoW, logoH);
  } catch {
    // The letterhead stays usable even if the artwork can't be embedded.
  }

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(SOCIETY_NAME, W / 2, 27.5, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(SOCIETY_TAGLINE, W / 2, 32, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(SOCIETY_ADDRESS, W / 2, 36, { align: "center" });
  doc.text(SOCIETY_CONTACT, W / 2, 40, { align: "center" });

  const flagW = (W - M * 2) / 4;
  FLAG.forEach((c, i) => {
    doc.setFillColor(...c);
    doc.rect(M + i * flagW, 43.5, flagW, 1.2, "F");
  });

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.text(title, W / 2, 52.5, { align: "center" });

  return new Page(doc, 60);
}

function footer(doc: jsPDF, reference: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`ZAMCOPS · ${reference}`, M, 290);
    doc.text(`Generated ${fmtDate(new Date())} · Page ${i} of ${pages}`, W - M, 290, { align: "right" });
  }
}

// Draws a signature image scaled into a box, anchored to its bottom-left.
function drawSignature(doc: jsPDF, image: string, x: number, bottomY: number, maxW = 55, maxH = 18) {
  try {
    const props = doc.getImageProperties(image);
    const scale = Math.min(maxW / props.width, maxH / props.height);
    const w = props.width * scale;
    const h = props.height * scale;
    const fmt = image.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
    doc.addImage(image, fmt, x, bottomY - h, w, h);
  } catch {
    // A corrupt image must not block document issuance — the line stays blank.
  }
}

// A labelled signature block: image above a rule, name + role beneath it.
function signatureBlock(
  p: Page,
  opts: { x: number; width: number; label: string; name: string; role: string; image?: string; date?: string }
) {
  const { doc } = p;
  const baseline = p.y + 22;
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(opts.label, opts.x, p.y + 2);
  if (opts.image) drawSignature(doc, opts.image, opts.x, baseline - 1, Math.min(55, opts.width - 5));
  doc.setDrawColor(...INK);
  doc.line(opts.x, baseline, opts.x + opts.width, baseline);
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(opts.name, opts.x, baseline + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(opts.role + (opts.date ? ` · ${opts.date}` : ""), opts.x, baseline + 9.5);
}

function sectionHeading(p: Page, text: string) {
  p.ensure(14);
  p.y += 4;
  p.doc.setFillColor(250, 240, 233);
  p.doc.roundedRect(M, p.y - 4.5, W - M * 2, 7, 1.5, 1.5, "F");
  p.doc.setTextColor(...ORANGE);
  p.doc.setFont("helvetica", "bold");
  p.doc.setFontSize(9);
  p.doc.text(text.toUpperCase(), M + 3, p.y);
  p.y += 7;
}

function labelValueRow(p: Page, label: string, value: string) {
  const { doc } = p;
  const labelW = 70;
  const valueW = W - M * 2 - labelW - 4;
  doc.setFontSize(8.5);
  const labelLines = doc.splitTextToSize(label, labelW) as string[];
  doc.setFontSize(9.5);
  const valueLines = doc.splitTextToSize(value || "—", valueW) as string[];
  const rowH = Math.max(labelLines.length * 3.6, valueLines.length * 4.2) + 3;
  p.ensure(rowH);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(labelLines, M, p.y);
  doc.setTextColor(...INK);
  doc.setFont("helvetica", value ? "bold" : "normal");
  doc.setFontSize(9.5);
  doc.text(valueLines, M + labelW + 4, p.y);
  p.y += rowH;
  doc.setDrawColor(...LINE);
  doc.line(M, p.y - 2.2, W - M, p.y - 2.2);
}

function repeatTable(p: Page, columns: { key: string; label: string }[], rows: Record<string, string>[]) {
  const { doc } = p;
  const colW = (W - M * 2) / columns.length;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const headerLines = columns.map((c) => doc.splitTextToSize(c.label.toUpperCase(), colW - 4) as string[]);
  const headerH = Math.max(...headerLines.map((l) => l.length)) * 3.4 + 1.5;
  p.ensure(headerH + 8);
  doc.setTextColor(...MUTED);
  headerLines.forEach((lines, i) => doc.text(lines, M + i * colW, p.y));
  p.y += headerH;
  doc.setDrawColor(...INK);
  doc.line(M, p.y - 2.5, W - M, p.y - 2.5);
  if (rows.length === 0) {
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("None declared.", M, p.y + 2);
    p.y += 8;
    return;
  }
  doc.setFont("helvetica", "normal");
  for (const row of rows) {
    const cellLines = columns.map((c) => doc.splitTextToSize(String(row[c.key] ?? "") || "—", colW - 4) as string[]);
    const rowH = Math.max(...cellLines.map((l) => l.length)) * 4.2 + 2.5;
    p.ensure(rowH);
    doc.setTextColor(...INK);
    doc.setFontSize(9);
    cellLines.forEach((lines, i) => doc.text(lines, M + i * colW, p.y + 1.5));
    p.y += rowH;
    doc.setDrawColor(...LINE);
    doc.line(M, p.y - 1.5, W - M, p.y - 1.5);
  }
  p.y += 2;
}

function paragraph(p: Page, text: string, opts: { size?: number; indent?: number; bold?: boolean; gap?: number } = {}) {
  const { doc } = p;
  const size = opts.size ?? 9.5;
  const indent = opts.indent ?? 0;
  doc.setFont("helvetica", opts.bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(...INK);
  const lines = doc.splitTextToSize(text, W - M * 2 - indent) as string[];
  const lineH = size * 0.48;
  for (const line of lines) {
    p.ensure(lineH);
    doc.text(line, M + indent, p.y);
    p.y += lineH;
  }
  p.y += opts.gap ?? 2.5;
}

function valueOf(payload: Record<string, unknown>, key: string, type: string): string {
  const v = payload[key];
  if (type === "checkboxes") return Array.isArray(v) ? v.join(", ") : "";
  if (type === "date") return v ? fmtDate(String(v)) : "";
  return String(v ?? "").trim();
}

export interface GeneratedPdf {
  fileName: string;
  reference: string;
  base64: string; // PDF bytes, base64-encoded
}

function output(doc: jsPDF, fileName: string, reference: string): GeneratedPdf {
  footer(doc, reference);
  const buf = Buffer.from(doc.output("arraybuffer"));
  return { fileName, reference, base64: buf.toString("base64") };
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
