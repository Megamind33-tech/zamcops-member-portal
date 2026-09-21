// Field map for the society's WORK DECLARATION (assets/forms/workdecl.pdf).
//
// This is the form a work registration produces. Its distribution key is the
// reason the portal stores two shares per rightsholder rather than one: the
// sheet has a Performance/Broadcast column and a Recording/Rights column, side
// by side, on each of seven role rows. A single figure could not fill it.
//
// Two of this sheet's boxes are taller than one line and carry their label at
// the bottom: the year is written ABOVE the words "YEAR COMPOSED", inside the
// same box, not to the right of them. Written to the right it drifts under the
// "Work No" label and reads as that box's entry.
//
// The sheet is filled in two hands. A member declares the work, its creators
// and what was lodged; the office completes the distribution key, the work and
// file numbers and the factor when the work is entered on the register. A
// member's copy therefore leaves those boxes empty, which is how the paper form
// reaches the office — not blank by oversight but blank because they are not
// the member's to fill.
//
// Positions are read out of the template, and re-read whenever it is replaced:
// a fresh export of the same sheet moved every row by about 40pt and widened
// the percentage columns by 25. Nothing here is estimated, and nothing is
// covered — the template is blank, verified by `npm run check:forms`.

import type { Stamp } from "@/lib/formOverlay";
import { formDate } from "@/lib/officialForms/render";
import { maybeSlot } from "@/lib/officialForms/slots";

// Re-exported: callers that build a declaration also format its dates.
export { formDate };
import { ROLE_CODE, type ContributorRole } from "@/lib/roles";

// Baseline y of each role row, in the order the form prints them.
const ROLE_ROW: Record<ContributorRole, number> = {
  Composer: 587,
  Author: 561,
  Arranger: 534,
  Publisher: 507,
  "Sub-author": 482,
  "Sub-arranger": 455,
  "Sub-publisher": 429,
};

const COL = {
  party: 115, // where a name is written on a role row
  // The "%" glyphs are printed at x=471 and x=537; a figure is centred just
  // left of each so the row reads "45 %" the way a pen would fill it.
  performanceRight: 464,
  recordingRight: 530,
} as const;

const HEAD = {
  title: { x: 115, y: 727 },
  workNo: { x: 452, y: 727 },
  // Above the "YEAR COMPOSED" label, sharing its box and its left edge.
  yearComposed: { x: 335, y: 727 },
  duration: { x: 378, y: 701 },
  dateOfRegistration: { x: 496, y: 702 },
  instruments: { x: 115, y: 688 },
  fileNo: { x: 378, y: 688 },
  genre: { x: 20, y: 676 },
  factor: { x: 440, y: 676 },
} as const;

const FOOT = {
  soundCarrier: { x: 115, y: 403 },
  agreementDate: { x: 135, y: 327 },
  validity: { x: 378, y: 327 },
  territory: { x: 135, y: 314 },
  otherDocuments: { x: 135, y: 225 },
  declarantName: { x: 62, y: 85 },
  // The sheet gives the signature 23 points of rule between "SIGN:" (which
  // ends at x=383.8) and "DATE:" (which starts at x=409.4). No signature fits
  // legibly in 23 points, so the mark sits above that line instead, the way a
  // short line is signed on paper. It starts where the rule starts and is
  // raised clear of the labels beneath it: "SIGN:" and "DATE:" reach y=90.7,
  // and the next printed line up is the declaration at y=133.9, so the band
  // from x=340 to the page border at x=549 is empty between them. A mark
  // merely ABOVE those words is not enough — at one point of clearance it
  // still reads as sitting on them, which is what `npm run verify:forms`
  // measures and why SIGNATURE_CLEARANCE exists.
  //
  // It is centred on that 23-point rule rather than started at it: a mark
  // anchored at the rule's left edge runs far enough right to sit over the
  // date instead, and reads as the date's signature rather than the sign-off.
  signature: { x: 368, y: 96 },
  declaredOn: { x: 445, y: 85 },
} as const;

// The boxes this sheet draws, by the slot ids scripts/map-form-slots.py gives
// them. Every one sits to the LEFT of the words it belongs to — "☐ YES",
// "☐ Lyrics" — which is why placing a mark relative to the printed label put
// it on the wrong side of the box entirely.
const FINANCE_BOX = { yes: "box.p1.392.251", no: "box.p1.390.342" } as const;

const ENCLOSURE_BOX: Record<string, string> = {
  Lyrics: "box.p1.277.21",
  "Musical score": "box.p1.278.241",
  Online: "box.p1.278.339",
  CD: "box.p1.265.24",
  Contract: "box.p1.265.241",
};

export interface WorkDeclarationParty {
  role: ContributorRole;
  party: string;
  // Printed only on an office copy — the distribution key is completed by the
  // society, not declared by the member.
  performancePct?: number;
  recordingPct?: number;
}

export interface WorkDeclarationValues {
  title: string;
  yearComposed: string;
  genre: string;
  instruments: string;
  duration: string;
  soundCarrier: string;
  financedByPublisher: string; // "Yes" | "No" | ""
  publishingAgreementDate: string;
  publishingValidity: string;
  publishingTerritory: string;
  enclosures: string[];
  otherDocuments: string;
  parties: WorkDeclarationParty[];
  declarantName: string;
  declaredOn: string; // dd/mm/yyyy — see formDate()
  memberSignature?: string; // transparent PNG data URL

  // "office" additionally prints the distribution key and the boxes the
  // society completes. A member's copy omits all of them.
  copy?: "member" | "office";
  // The work's position in the batch the member is submitting — 1 of 5, 2 of 5.
  // It comes from the member's own list, not from the society, so it is printed
  // on their copy alongside everything else they declared.
  workNo?: string;
  // Assigned by the society when the work goes on the register.
  fileNo?: string;
  factor?: string;
  dateOfRegistration?: string; // dd/mm/yyyy
}

const pct = (n: number | undefined): string => {
  if (!n) return "";
  return `${Number.isInteger(n) ? n : Math.round(n * 100) / 100}`;
};

/**
 * A tick centred in one of the sheet's printed boxes.
 *
 * These are small — around 8 by 5 points — so the mark is sized to the box
 * rather than set at a fixed size. A 10pt "X" in a 5pt box spills out of it
 * and reads as a mark beside the option rather than in it.
 */
function tickBox(stamps: Stamp[], boxId: string): void {
  const b = maybeSlot("workdecl", boxId);
  if (!b) return;
  const w = Math.max(1, b.x1 - b.x);
  const h = Math.max(1, (b.y1 ?? b.y) - b.y);
  const size = Math.min(h * 0.86, w * 0.78);
  stamps.push({
    kind: "tick",
    page: b.page,
    x: b.x + (w - size * 0.92) / 2,
    y: b.y + (h - size) / 2,
    size,
  });
}

export function workDeclarationStamps(v: WorkDeclarationValues): Stamp[] {
  const stamps: Stamp[] = [];

  const put = (at: { x: number; y: number }, text: string, maxWidth: number, size = 9) => {
    if (text && text.trim()) stamps.push({ page: 1, x: at.x, y: at.y, text: text.trim(), size, maxWidth });
  };

  const office = v.copy === "office";

  put(HEAD.title, v.title, 260, 10);
  put(HEAD.yearComposed, v.yearComposed, 80);
  put(HEAD.duration, v.duration, 26);
  put(HEAD.instruments, v.instruments, 195);
  put(HEAD.genre, v.genre, 85);

  // Numbered by the member's own submission, so it belongs on their copy.
  put(HEAD.workNo, v.workNo ?? "", 60);

  // The society's boxes, left empty until it fills them.
  if (office) {
    put(HEAD.fileNo, v.fileNo ?? "", 26);
    put(HEAD.factor, v.factor ?? "", 90);
    put(HEAD.dateOfRegistration, v.dateOfRegistration ?? "", 70);
  }

  // The sheet prints one row per role, and a work often has two composers. Both
  // names go on that single row, separated by a comma and shrunk to fit, which
  // is how the form is filled by hand. The row's figures are then the role's
  // combined share, since the key has one pair of boxes per role and not per
  // person.
  const byRole = new Map<ContributorRole, WorkDeclarationParty[]>();
  for (const p of v.parties) {
    if (ROLE_ROW[p.role] === undefined) continue;
    const list = byRole.get(p.role);
    if (list) list.push(p);
    else byRole.set(p.role, [p]);
  }

  for (const [role, parties] of byRole) {
    const y = ROLE_ROW[role];
    const names = parties.map((p) => p.party.trim()).filter(Boolean).join(", ");
    if (names) stamps.push({ page: 1, x: COL.party, y, text: names, size: 9, maxWidth: 190 });
    if (!office) continue; // the distribution key is the society's to complete

    const sum = (k: "performancePct" | "recordingPct") =>
      parties.reduce((t, p) => t + (Number(p[k]) || 0), 0);
    const perf = pct(sum("performancePct"));
    const rec = pct(sum("recordingPct"));
    // Centred just left of the printed "%" so the row reads "45 %".
    if (perf) stamps.push({ page: 1, x: COL.performanceRight, y, text: perf, size: 9, align: "center" });
    if (rec) stamps.push({ page: 1, x: COL.recordingRight, y, text: rec, size: 9, align: "center" });
  }

  put(FOOT.soundCarrier, v.soundCarrier, 240);

  const fin = (v.financedByPublisher || "").trim().toLowerCase();
  if (fin === "yes") tickBox(stamps, FINANCE_BOX.yes);
  if (fin === "no") tickBox(stamps, FINANCE_BOX.no);

  put(FOOT.agreementDate, v.publishingAgreementDate, 180);
  put(FOOT.validity, v.publishingValidity, 180);
  put(FOOT.territory, v.publishingTerritory, 420);

  // Works reach the society through the portal and nowhere else, so "Online" is
  // always the enclosure. The printed alternatives — a CD, a paper score, a
  // signed contract handed in — describe a counter that no longer takes
  // submissions, and ticking one would assert something was lodged that was
  // not. Anything genuinely uploaded alongside is ticked in addition.
  const enclosures = new Set<string>(["Online", ...(v.enclosures ?? [])]);
  for (const e of enclosures) {
    const box = ENCLOSURE_BOX[e];
    if (box) tickBox(stamps, box);
  }

  put(FOOT.otherDocuments, v.otherDocuments, 420, 8);

  put(FOOT.declarantName, v.declarantName, 270, 9);
  put(FOOT.declaredOn, v.declaredOn, 80, 8);

  if (v.memberSignature) {
    stamps.push({
      kind: "image",
      page: 1,
      x: FOOT.signature.x,
      y: FOOT.signature.y,
      data: v.memberSignature,
      maxWidth: 60,
      maxHeight: 18,
    });
  }

  return stamps;
}
