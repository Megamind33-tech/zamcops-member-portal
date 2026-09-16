// Shared rendering primitives for the official ZAMCOPS document set — the
// letterhead, pagination cursor, section headings, tables and signature
// blocks that every generated PDF is built from.
//
// Keeping them here means the membership documents (lib/documents.ts) and the
// work-registration documents (lib/workDocuments.ts) are literally the same
// stationery: one change to the letterhead changes every document the society
// issues. Server-side only — official signature images are drawn here and must
// never reach the client raw.

import { jsPDF } from "jspdf";
import {
  SOCIETY_NAME,
  SOCIETY_TAGLINE,
  SOCIETY_ADDRESS,
  SOCIETY_CONTACT,
} from "@/lib/applicationForms";
import { BRAND_LOGO_PNG, BRAND_LOGO_RATIO } from "@/lib/brandLogo";

export const INK: [number, number, number] = [26, 29, 33];
export const MUTED: [number, number, number] = [90, 100, 112];
export const ORANGE: [number, number, number] = [242, 108, 33];
export const GREEN: [number, number, number] = [43, 164, 90];
export const LINE: [number, number, number] = [231, 233, 237];
export const FLAG: [number, number, number][] = [
  [242, 108, 33],
  [226, 52, 43],
  [201, 206, 218],
  [43, 164, 90],
];

export const W = 210; // A4 portrait, mm
export const M = 18; // page margin
export const BOTTOM = 278; // content floor before we break the page

export interface OfficialSigner {
  officerName: string;
  officerTitle: string;
  image: string; // transparent PNG data URL
}

export interface MemberLike {
  fullName: string;
  memberNumber: string;
  email: string;
  phone: string;
  address?: string | null;
  district?: string | null;
  province?: string | null;
  signature?: string | null;
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

// Cursor that knows how to paginate.
export class Page {
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
// document title. An optional subtitle sits under the title for documents that
// need to name what they cover (e.g. the work being registered).
export function letterhead(doc: jsPDF, title: string, subtitle?: string): Page {
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

  if (!subtitle) return new Page(doc, 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const lines = doc.splitTextToSize(subtitle, W - M * 2 - 20) as string[];
  lines.forEach((line, i) => doc.text(line, W / 2, 57.5 + i * 4.2, { align: "center" }));
  return new Page(doc, 62 + (lines.length - 1) * 4.2);
}

export function footer(doc: jsPDF, reference: string) {
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
export function drawSignature(doc: jsPDF, image: string, x: number, bottomY: number, maxW = 55, maxH = 18) {
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
export function signatureBlock(
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

export function sectionHeading(p: Page, text: string) {
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

export function labelValueRow(p: Page, label: string, value: string) {
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

export function repeatTable(p: Page, columns: { key: string; label: string }[], rows: Record<string, string>[]) {
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

export interface GridColumn {
  label: string;
  width: number; // share of the content width; normalised across the columns
  align?: "left" | "right";
}

// A proportional-width table — used where a plain even split reads badly, e.g.
// an ownership schedule whose name column needs room and whose share column is
// four characters wide and right-aligned. Repeats its header after a page break
// so a long schedule stays readable.
export function gridTable(
  p: Page,
  columns: GridColumn[],
  rows: string[][],
  opts: { emptyText?: string; totalRow?: string[] } = {},
) {
  const { doc } = p;
  const content = W - M * 2;
  const totalWeight = columns.reduce((s, c) => s + c.width, 0) || 1;
  const widths = columns.map((c) => (c.width / totalWeight) * content);
  const x = (i: number) => M + widths.slice(0, i).reduce((s, w) => s + w, 0);
  const cellX = (i: number) => (columns[i].align === "right" ? x(i) + widths[i] - 2 : x(i));
  const align = (i: number) => (columns[i].align === "right" ? ("right" as const) : ("left" as const));

  const header = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    const lines = columns.map((c, i) => doc.splitTextToSize(c.label.toUpperCase(), widths[i] - 3) as string[]);
    const h = Math.max(...lines.map((l) => l.length)) * 3.2 + 1.5;
    lines.forEach((l, i) => doc.text(l, cellX(i), p.y, { align: align(i) }));
    p.y += h;
    doc.setDrawColor(...INK);
    doc.line(M, p.y - 2.5, W - M, p.y - 2.5);
  };

  p.ensure(16);
  header();

  if (rows.length === 0) {
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(opts.emptyText ?? "None declared.", M, p.y + 2);
    p.y += 8;
    return;
  }

  doc.setFont("helvetica", "normal");
  for (const row of rows) {
    const cells = row.map((v, i) => doc.splitTextToSize(String(v ?? "") || "—", widths[i] - 3) as string[]);
    const rowH = Math.max(...cells.map((l) => l.length)) * 4 + 2.5;
    if (p.y + rowH > BOTTOM) {
      doc.addPage();
      p.y = 20;
      header();
      doc.setFont("helvetica", "normal");
    }
    doc.setTextColor(...INK);
    doc.setFontSize(8.5);
    cells.forEach((l, i) => doc.text(l, cellX(i), p.y + 1.5, { align: align(i) }));
    p.y += rowH;
    doc.setDrawColor(...LINE);
    doc.line(M, p.y - 1.5, W - M, p.y - 1.5);
  }

  if (opts.totalRow) {
    p.ensure(8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    opts.totalRow.forEach((v, i) => {
      if (v) doc.text(String(v), cellX(i), p.y + 1.5, { align: align(i) });
    });
    p.y += 6;
    doc.setDrawColor(...INK);
    doc.line(M, p.y - 1.5, W - M, p.y - 1.5);
  }
  p.y += 2;
}

export function paragraph(
  p: Page,
  text: string,
  opts: { size?: number; indent?: number; bold?: boolean; gap?: number } = {},
) {
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

// A tinted callout — the registration reference and status strip that heads a
// work document, so the reader sees what they are holding before the detail.
export function calloutRow(p: Page, cells: { label: string; value: string }[], tone: "orange" | "green" = "orange") {
  const { doc } = p;
  p.ensure(20);
  const content = W - M * 2;
  const cellW = content / cells.length;
  const tint: [number, number, number] = tone === "green" ? [237, 248, 241] : [250, 240, 233];
  doc.setFillColor(...tint);
  doc.roundedRect(M, p.y - 4, content, 15, 2, 2, "F");
  cells.forEach((c, i) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(c.label.toUpperCase(), M + 4 + i * cellW, p.y + 1);

    // A callout value is one line by definition, and a reference that overflows
    // its cell is worse than a small one — a truncated reference is the wrong
    // reference. Shrink to fit instead, down to a readable floor.
    const value = c.value || "—";
    doc.setFont("helvetica", "bold");
    let size = 9.5;
    doc.setFontSize(size);
    while (size > 6 && doc.getTextWidth(value) > cellW - 6) {
      size -= 0.25;
      doc.setFontSize(size);
    }
    doc.setTextColor(...(tone === "green" ? GREEN : INK));
    doc.text(value, M + 4 + i * cellW, p.y + 7);
  });
  p.y += 18;
}

export interface GeneratedPdf {
  fileName: string;
  reference: string;
  base64: string; // PDF bytes, base64-encoded
}

export function output(doc: jsPDF, fileName: string, reference: string): GeneratedPdf {
  footer(doc, reference);
  const buf = Buffer.from(doc.output("arraybuffer"));
  return { fileName, reference, base64: buf.toString("base64") };
}
