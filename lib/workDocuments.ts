// Server-side generation of the work-registration documents:
//   1. the Declaration of a Musical Work — the society's own form, filled from
//      what the member declared and signed by them. Downloaded on demand from
//      the work's page rather than filed automatically.
//   2. the clearance certificate — one per submission, listing every work in it
//      that reached the register, counter-signed by the Board Secretary's
//      stored official signature. Issued when the society accepts the work.
//
// The certificate is drawn on the same stationery as the membership documents
// (lib/pdfKit.ts) because the society has no printed certificate to fill in.
// Runs only on the server, so official signature images never reach the client
// raw — members only ever receive the rendered PDFs.

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
  labelValueRow,
  letterhead,
  output,
  paragraph,
  repeatTable,
  sectionHeading,
  signatureBlock,
} from "@/lib/pdfKit";
import {
  CLEARANCE_CERTIFICATE_CLAUSES,
  CLEARANCE_CERTIFICATE_TITLE,
  WORK_DECLARATION_TITLE,
} from "@/lib/workDeedText";
import { districtProvince } from "@/lib/applicationPrefill";
import { normalizeContributorRole } from "@/lib/roles";
import { renderOfficialForm, formDate } from "@/lib/officialForms/render";
import {
  workDeclarationStamps,
  type WorkDeclarationParty,
} from "@/lib/officialForms/workDeclaration";
import { normalizeWorkType, shareOf } from "@/lib/works";
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

  // Carried by the society's official WORK DECLARATION form.
  instruments: string;
  yearComposed: string;
  soundCarrier: string;
  financedByPublisher: string; // Yes | No
  publishingAgreementDate: string;
  publishingValidity: string;
  publishingTerritory: string;
  enclosures: string[];
  // The work's place in the batch the member submitted — track 2 of 10.
  workNo: string;
  // Completed by staff once the work is on the register.
  fileNo: string;
  factor: string;
  registeredAt: Date | null;
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
    instruments: row.instruments ?? "",
    yearComposed: row.yearComposed ?? "",
    soundCarrier: row.soundCarrier ?? "",
    financedByPublisher: row.financedByPublisher ?? "",
    publishingAgreementDate: row.publishingAgreementDate ?? "",
    publishingValidity: row.publishingValidity ?? "",
    publishingTerritory: row.publishingTerritory ?? "",
    enclosures: parse<string[]>(row.enclosures, []),
    workNo: row.workNo ?? "",
    fileNo: row.fileNo ?? "",
    factor: row.factor ?? "",
    registeredAt: row.registeredAt ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function registeringMember(p: ReturnType<typeof letterhead>, member: MemberLike) {
  sectionHeading(p, "Registering member");
  labelValueRow(p, "Full name", member.fullName);
  labelValueRow(p, "ZAMCOPS member number", member.memberNumber);
  labelValueRow(p, "E-mail address", member.email);
  labelValueRow(p, "Telephone", member.phone);
  labelValueRow(
    p,
    "Address",
    [member.address, districtProvince(member.district, member.province)].filter(Boolean).join(" · "),
  );
}

const workRef = (work: WorkLike): string => work.id.slice(-6).toUpperCase();

// ── 1. The Declaration of a Musical Work ───────────────────────────────────

// The form's distribution key has one pair of boxes per role, not per person,
// so the parties are handed over as declared and lib/officialForms groups them.
function declarationParties(work: WorkLike): WorkDeclarationParty[] {
  return work.ownershipSplits
    .map((split) => ({
      role: normalizeContributorRole(split.role),
      party: (split.party ?? "").trim(),
      performancePct: shareOf(split, "performancePct"),
      recordingPct: shareOf(split, "recordingPct"),
    }))
    .filter((p) => p.party);
}

/**
 * The member's copy of the declaration.
 *
 * The office's boxes — the distribution key, the file number, the factor, the
 * date of registration — are left empty, because on paper this is the sheet the
 * member fills in and hands over. They are not blank by oversight.
 */
export async function generateWorkDeclarationPdf(opts: {
  member: MemberLike;
  work: WorkLike;
  reference: string;
}): Promise<GeneratedPdf> {
  const { member, work } = opts;
  return renderOfficialForm({
    template: "workdecl",
    stamps: workDeclarationStamps({
      copy: "member",
      title: work.title,
      workNo: work.workNo,
      yearComposed: work.yearComposed || work.dateCreated.slice(0, 4),
      genre: work.genre,
      instruments: work.instruments,
      duration: work.duration,
      soundCarrier: work.soundCarrier,
      financedByPublisher: work.financedByPublisher,
      publishingAgreementDate: work.publishingAgreementDate,
      publishingValidity: work.publishingValidity,
      publishingTerritory: work.publishingTerritory,
      enclosures: work.enclosures,
      otherDocuments: work.studioReceipt ? "Studio letter / receipt" : "",
      parties: declarationParties(work),
      declarantName: member.fullName,
      declaredOn: formDate(work.submittedAt ?? new Date()),
      memberSignature: member.signature || undefined,
    }),
    fileName: `Work-Declaration-${workRef(work)}-${member.memberNumber}.pdf`,
    reference: opts.reference,
  });
}

// ── 2. The clearance certificate ───────────────────────────────────────────

/**
 * One certificate per submission, listing every work in it that reached the
 * register.
 *
 * A submission is what the member sent in one go: a single is one work, an
 * album is all of its tracks. The office issues one certificate for that
 * submission rather than one per song, so a ten-track album produces a
 * certificate naming ten works and not ten certificates.
 */
export function generateClearanceCertificatePdf(opts: {
  member: MemberLike;
  works: WorkLike[];
  submissionRef: string;
  registeredAt: Date | null;
  boardSecretary: OfficialSigner;
  reference: string;
}): GeneratedPdf {
  const { member, works } = opts;
  const registered = opts.registeredAt ?? new Date();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const many = works.length !== 1;
  const p = letterhead(
    doc,
    CLEARANCE_CERTIFICATE_TITLE,
    many
      ? `${works.length} works entered in the ZAMCOPS register on the declaration of ${member.fullName}`
      : `Entered in the ZAMCOPS register of works on the declaration of ${member.fullName}`,
  );

  calloutRow(
    p,
    [
      { label: "Certificate reference", value: opts.reference },
      { label: "Submission", value: opts.submissionRef },
      { label: "Registered on", value: fmtDate(registered) },
      { label: "Registered to", value: member.memberNumber },
    ],
    "green",
  );

  sectionHeading(p, many ? `Works registered (${works.length})` : "Work registered");
  repeatTable(
    p,
    [
      { key: "no", label: "No." },
      { key: "title", label: "Title" },
      { key: "type", label: "Type" },
      { key: "duration", label: "Duration" },
      { key: "ref", label: "Work reference" },
    ],
    works.map((w, i) => ({
      no: String(i + 1),
      title: w.title,
      type: w.workType || "—",
      duration: w.duration || "—",
      ref: workRef(w),
    })),
  );

  registeringMember(p, member);

  sectionHeading(p, "Certification");
  CLEARANCE_CERTIFICATE_CLAUSES.forEach((clause, i) =>
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
    date: fmtDate(works[0]?.submittedAt ?? registered),
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

  return output(doc, `Certificate-of-Registration-${opts.submissionRef}-${member.memberNumber}.pdf`, opts.reference);
}
