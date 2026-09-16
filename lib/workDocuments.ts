// Server-side generation of the work-registration document set:
//   1. the Declaration of a Musical Work — every particular the member
//      declared, the full schedule of interested parties and their shares, the
//      evidence lodged, and the member's signature under the declaration
//   2. the Certificate of Registration — issued when staff approve the work,
//      counter-signed by the Board Secretary's stored official signature
//
// Both are rendered on the same stationery as the membership documents
// (lib/pdfKit.ts). Runs only on the server, so official signature images never
// reach the client raw — members only ever receive the rendered PDFs.

import { jsPDF } from "jspdf";
import {
  M,
  W,
  MUTED,
  type GeneratedPdf,
  type MemberLike,
  type OfficialSigner,
  calloutRow,
  fmtDate,
  gridTable,
  labelValueRow,
  letterhead,
  output,
  paragraph,
  sectionHeading,
  signatureBlock,
} from "@/lib/pdfKit";
import {
  WORK_CERTIFICATE_CLAUSES,
  WORK_CERTIFICATE_TITLE,
  WORK_DECLARATION_CLAUSES,
  WORK_DECLARATION_TITLE,
  WORK_EVIDENCE_NOTE,
} from "@/lib/workDeedText";
import { normalizeContributorRole } from "@/lib/roles";
import { normalizeWorkType, splitsTotal } from "@/lib/works";
import type { OwnershipSplit } from "@/types";

// The shape the renderers need — a WorkDeclaration row with its JSON columns
// already parsed, so neither generator has to know how the row is stored.
export interface WorkLike {
  id: string;
  title: string;
  alternativeTitle: string;
  workType: string;
  language: string;
  genre: string;
  duration: string;
  composers: string[];
  authors: string[];
  arrangers: string[];
  publisher: string;
  publisherIpi: string;
  ownershipSplits: OwnershipSplit[];
  isrc: string;
  iswc: string;
  audioFile: string;
  coverArt: string;
  studioReceipt: string;
  dateCreated: string;
  status: string;
  submittedAt: Date | null;
}

// Adapts a WorkDeclaration row (JSON columns as stored) into the shape the
// renderers read. `studioReceipt` falls back to the legacy `producers` tag,
// matching lib/serialize.ts, so works registered before that column existed
// still show their studio letter on the declaration.
/* eslint-disable @typescript-eslint/no-explicit-any */
export function toWorkLike(row: any): WorkLike {
  const parse = <T,>(v: string, fallback: T): T => {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  };
  const producers = parse<string[]>(row.producers, []);
  const tagged = producers.find((x) => x.startsWith("studioReceipt:"));
  return {
    id: row.id,
    title: row.title ?? "",
    alternativeTitle: row.alternativeTitle ?? "",
    workType: normalizeWorkType(row.workType),
    language: row.language ?? "",
    genre: row.genre ?? "",
    duration: row.duration ?? "",
    composers: parse<string[]>(row.composers, []),
    authors: parse<string[]>(row.authors, []),
    arrangers: parse<string[]>(row.subArrangers, []),
    publisher: row.publisher ?? "",
    publisherIpi: row.publisherIpi ?? "",
    ownershipSplits: parse<OwnershipSplit[]>(row.ownershipSplits, []),
    isrc: row.isrc ?? "",
    iswc: row.iswc ?? "",
    audioFile: row.audioFile ?? "",
    coverArt: row.coverArt ?? "",
    studioReceipt: row.studioReceipt || (tagged ? tagged.slice("studioReceipt:".length) : ""),
    dateCreated: row.dateCreated ?? "",
    status: row.status ?? "Pending",
    submittedAt: row.submittedAt ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const list = (names: string[]): string => names.filter(Boolean).join(", ");

const pct = (n: number): string => `${Number.isInteger(n) ? n : n.toFixed(2)}%`;

// How an interested party is identified to the Society: by their membership if
// they have one, otherwise by the national ID given on their affirmation letter.
function identityOf(s: OwnershipSplit): string {
  if (s.memberNumber?.trim()) return `Member ${s.memberNumber.trim()}`;
  if (s.knownMember) return "ZAMCOPS member";
  if (s.nrc?.trim()) return `NRC ${s.nrc.trim()}`;
  return "Not a member — identity not supplied";
}

// The full schedule of interested parties: who holds a share, in what capacity,
// over which royalty stream, under which cross-society identifier, and how much.
function splitsSection(p: ReturnType<typeof letterhead>, work: WorkLike) {
  sectionHeading(p, "Schedule of interested parties and shares");
  const splits = work.ownershipSplits ?? [];
  const rows = splits.map((s) => [
    s.party || "—",
    normalizeContributorRole(String(s.role || "Composer")),
    s.rightsType || "Both",
    s.ipiNumber?.trim() || "—",
    identityOf(s),
    pct(Number(s.percentage) || 0),
  ]);
  const total = splitsTotal(splits);

  gridTable(
    p,
    [
      { label: "Interested party", width: 26 },
      { label: "Capacity", width: 14 },
      { label: "Rights", width: 13 },
      { label: "IPI / CAE", width: 14 },
      { label: "Identified as", width: 23 },
      { label: "Share", width: 10, align: "right" },
    ],
    rows,
    {
      emptyText: "No shares declared.",
      totalRow: ["Total", "", "", "", "", pct(total)],
    },
  );

  paragraph(
    p,
    "Capacity is the contribution that earns the share. Rights states whether the share applies to performing " +
      "rights, mechanical rights or both — the two streams are collected and reconciled separately. The IPI / CAE " +
      "number identifies a rightsholder across CISAC-affiliated societies; it is required before the work can be " +
      "registered abroad.",
    { size: 7.5, gap: 2 },
  );

  // A schedule that does not total 100% cannot be distributed against, so the
  // document says so on its face rather than leaving the reader to add it up.
  if (Math.abs(total - 100) >= 0.51) {
    paragraph(
      p,
      `NOTE: the shares above total ${pct(total)}. A work is only distributable once its shares total 100%. ` +
        "Contact the ZAMCOPS office to correct this schedule.",
      { size: 8.5, bold: true, gap: 2 },
    );
  }
}

// What the member lodged in support of the registration. Named files only —
// the bytes stay in the Society's storage, behind an authenticated download.
function evidenceSection(p: ReturnType<typeof letterhead>, work: WorkLike) {
  sectionHeading(p, "Evidence lodged with the Society");
  const rows: string[][] = [];
  if (work.audioFile) rows.push(["Reference recording", work.audioFile]);
  if (work.coverArt) rows.push(["Artwork", work.coverArt.startsWith("data:") ? "Lodged with the registration" : work.coverArt]);
  if (work.studioReceipt) rows.push(["Studio letter / receipt", work.studioReceipt]);
  for (const s of work.ownershipSplits ?? []) {
    if (s.affirmationLetter) rows.push([`Affirmation — ${s.party}`, s.affirmationLetter]);
  }
  gridTable(
    p,
    [
      { label: "Item", width: 30 },
      { label: "Lodged as", width: 70 },
    ],
    rows,
    { emptyText: "No supporting files are recorded against this work." },
  );
  paragraph(p, WORK_EVIDENCE_NOTE, { size: 7.5, gap: 2 });
}

// Identity of the work — the particulars an affiliated society needs to match
// this registration against a usage log.
function workParticulars(p: ReturnType<typeof letterhead>, work: WorkLike) {
  sectionHeading(p, "The work");
  labelValueRow(p, "Title of the work", work.title);
  labelValueRow(p, "Alternative title / subtitle", work.alternativeTitle);
  labelValueRow(p, "Type of work", work.workType);
  labelValueRow(p, "Language of the lyrics", work.language);
  labelValueRow(p, "Genre", work.genre);
  labelValueRow(p, "Duration", work.duration);
  labelValueRow(p, "Date the work was created", work.dateCreated ? fmtDate(work.dateCreated) : "");
  labelValueRow(p, "ISWC (work code)", work.iswc);
  labelValueRow(p, "ISRC (recording code)", work.isrc);

  sectionHeading(p, "Creators and publisher");
  labelValueRow(p, "Composer(s) of the music", list(work.composers));
  labelValueRow(p, "Author(s) of the lyrics", list(work.authors));
  labelValueRow(p, "Arranger(s)", list(work.arrangers));
  labelValueRow(p, "Publisher", work.publisher);
  labelValueRow(p, "Publisher IPI / CAE number", work.publisherIpi);
}

function registeringMember(p: ReturnType<typeof letterhead>, member: MemberLike) {
  sectionHeading(p, "Registering member");
  labelValueRow(p, "Full name", member.fullName);
  labelValueRow(p, "ZAMCOPS member number", member.memberNumber);
  labelValueRow(p, "E-mail address", member.email);
  labelValueRow(p, "Telephone", member.phone);
  labelValueRow(
    p,
    "Address",
    [member.address, [member.district, member.province].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
  );
}

const workRef = (work: WorkLike): string => work.id.slice(-6).toUpperCase();

// ── 1. The Declaration of a Musical Work ───────────────────────────────────

export function generateWorkDeclarationPdf(opts: {
  member: MemberLike;
  work: WorkLike;
  reference: string;
}): GeneratedPdf {
  const { member, work } = opts;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const p = letterhead(doc, WORK_DECLARATION_TITLE, `“${work.title}” — declared by ${member.fullName} (${member.memberNumber})`);

  calloutRow(p, [
    { label: "Declaration reference", value: opts.reference },
    { label: "Work reference", value: workRef(work) },
    { label: "Declared on", value: fmtDate(work.submittedAt ?? new Date()) },
    { label: "Register status", value: work.status || "Pending" },
  ]);

  workParticulars(p, work);
  splitsSection(p, work);
  evidenceSection(p, work);
  registeringMember(p, member);

  sectionHeading(p, "Declaration by the member");
  WORK_DECLARATION_CLAUSES.forEach((clause, i) =>
    paragraph(p, `${i + 1}.  ${clause}`, { size: 8.5, gap: 2.5 }),
  );

  p.ensure(46);
  p.y += 4;
  signatureBlock(p, {
    x: M,
    width: 90,
    label: "Signed by THE DECLARANT",
    name: member.fullName,
    role: `Member ${member.memberNumber}`,
    image: member.signature || undefined,
    date: fmtDate(work.submittedAt ?? new Date()),
  });
  p.y += 36;

  return output(doc, `Work-Declaration-${workRef(work)}-${member.memberNumber}.pdf`, opts.reference);
}

// ── 2. The Certificate of Registration ─────────────────────────────────────

export function generateWorkCertificatePdf(opts: {
  member: MemberLike;
  work: WorkLike;
  registeredAt: Date | null;
  boardSecretary: OfficialSigner;
  reference: string;
}): GeneratedPdf {
  const { member, work } = opts;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const p = letterhead(doc, WORK_CERTIFICATE_TITLE, `Entered in the ZAMCOPS register of works on the declaration of ${member.fullName}`);
  const registered = opts.registeredAt ?? new Date();

  calloutRow(
    p,
    [
      { label: "Certificate reference", value: opts.reference },
      { label: "Work reference", value: workRef(work) },
      { label: "Registered on", value: fmtDate(registered) },
      { label: "Registered to", value: member.memberNumber },
    ],
    "green",
  );

  workParticulars(p, work);
  splitsSection(p, work);
  registeringMember(p, member);

  sectionHeading(p, "Certification");
  WORK_CERTIFICATE_CLAUSES.forEach((clause, i) =>
    paragraph(p, `${i + 1}.  ${clause}`, { size: 8.5, gap: 2.5 }),
  );

  p.ensure(50);
  p.y += 6;
  const colW = (W - M * 2 - 10) / 2;
  const startY = p.y;
  signatureBlock(p, {
    x: M,
    width: colW,
    label: "Declared by THE MEMBER",
    name: member.fullName,
    role: `Member ${member.memberNumber}`,
    image: member.signature || undefined,
    date: fmtDate(work.submittedAt ?? registered),
  });
  p.y = startY;
  signatureBlock(p, {
    x: M + colW + 10,
    width: colW,
    label: "Signed for and on behalf of THE SOCIETY",
    name: opts.boardSecretary.officerName,
    role: opts.boardSecretary.officerTitle || "BOARD SECRETARY",
    image: opts.boardSecretary.image,
    date: fmtDate(registered),
  });
  p.y = startY + 36;

  p.doc.setTextColor(...MUTED);
  p.doc.setFont("helvetica", "italic");
  p.doc.setFontSize(7.5);
  p.doc.text(
    `Verify this certificate with the ZAMCOPS office quoting reference ${opts.reference}.`,
    W / 2,
    p.y,
    { align: "center" },
  );

  return output(doc, `Certificate-of-Registration-${workRef(work)}-${member.memberNumber}.pdf`, opts.reference);
}
