// Field map for the society's WORK DECLARATION (assets/forms/workdecl.pdf).
//
// This is the form a work registration produces. Its distribution key is the
// reason the portal stores two shares per rightsholder rather than one: the
// sheet has a Performance/Broadcast column and a Recording/Rights column, side
// by side, on each of seven role rows. A single figure could not fill it.
//
// Positions are read out of the template. The export still carries a specimen
// name on three of the role rows, so those are painted over before the real
// parties are written; everything else is blank.

import type { Stamp } from "@/lib/formOverlay";
import { ROLE_CODE, type ContributorRole } from "@/lib/roles";

// Baseline y of each role row, in the order the form prints them.
const ROLE_ROW: Record<ContributorRole, number> = {
  Composer: 547,
  Author: 523,
  Arranger: 497,
  Publisher: 471,
  "Sub-author": 447,
  "Sub-arranger": 421,
  "Sub-publisher": 397,
};

const COL = {
  party: 110, // where a name is written on a role row
  // The "%" glyphs are printed at x=449 and x=511; a figure is written to the
  // left of each so it reads "45 %" the way a pen would fill it.
  performanceRight: 446,
  recordingRight: 508,
} as const;

// Rows the specimen left a name on.
const SPECIMEN_ROWS = [547, 511, 485];

const HEAD = {
  title: { x: 110, y: 680 },
  workNo: { x: 430, y: 680 },
  yearComposed: { x: 390, y: 668 },
  duration: { x: 360, y: 655 },
  dateOfRegistration: { x: 470, y: 656 },
  instruments: { x: 110, y: 643 },
  fileNo: { x: 360, y: 643 },
  genre: { x: 20, y: 632 },
  factor: { x: 430, y: 632 },
} as const;

const FOOT = {
  soundCarrier: { x: 110, y: 373 },
  financeYes: { x: 276, y: 361 }, // just right of "YES"
  financeNo: { x: 354, y: 361 }, // just right of "NO"
  agreementDate: { x: 130, y: 300 },
  validity: { x: 360, y: 300 },
  territory: { x: 130, y: 288 },
  otherDocuments: { x: 130, y: 203 },
  declarantName: { x: 58, y: 70 },
  signature: { x: 350, y: 76 },
  declaredOn: { x: 424, y: 70 },
} as const;

// A tick placed just before each enclosure's printed label.
const ENCLOSURE_TICK: Record<string, { x: number; y: number }> = {
  Lyrics: { x: 24, y: 252 },
  "Musical score": { x: 228, y: 252 },
  Online: { x: 326, y: 252 },
  CD: { x: 30, y: 240 },
  Contract: { x: 230, y: 240 },
};

export interface WorkDeclarationParty {
  role: ContributorRole;
  party: string;
  performancePct: number;
  recordingPct: number;
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
  declaredOn: string; // formatted date
  memberSignature?: string; // transparent PNG data URL
  // Completed by staff once the work is on the register.
  workNo?: string;
  fileNo?: string;
  factor?: string;
  dateOfRegistration?: string;
}

const pct = (n: number): string => {
  if (!n) return "";
  return `${Number.isInteger(n) ? n : Math.round(n * 100) / 100}`;
};

export function workDeclarationStamps(v: WorkDeclarationValues): Stamp[] {
  const stamps: Stamp[] = [];

  // Clear the specimen's name off the role rows it was left on.
  for (const y of SPECIMEN_ROWS) {
    stamps.push({ kind: "cover", page: 1, x: COL.party - 4, y: y - 4, width: 180, height: 14 });
  }

  const put = (at: { x: number; y: number }, text: string, maxWidth: number, size = 9) => {
    if (text && text.trim()) stamps.push({ page: 1, x: at.x, y: at.y, text: text.trim(), size, maxWidth });
  };

  put(HEAD.title, v.title, 260, 10);
  put(HEAD.workNo, v.workNo ?? "", 90);
  put(HEAD.yearComposed, v.yearComposed, 80);
  put(HEAD.duration, v.duration, 26);
  put(HEAD.dateOfRegistration, v.dateOfRegistration ?? "", 120);
  put(HEAD.instruments, v.instruments, 195);
  put(HEAD.fileNo, v.fileNo ?? "", 26);
  put(HEAD.genre, v.genre, 85);
  put(HEAD.factor, v.factor ?? "", 90);

  // One line per declared party, on the row its role owns. Two parties in the
  // same role would land on the same line, so only the first of each is placed
  // and the rest are carried on the "other documents" line rather than
  // overprinting the form.
  const used = new Set<ContributorRole>();
  const overflow: string[] = [];
  for (const p of v.parties) {
    const y = ROLE_ROW[p.role];
    if (y === undefined) continue;
    if (used.has(p.role)) {
      overflow.push(`${ROLE_CODE[p.role]} ${p.party} ${pct(p.performancePct)}%/${pct(p.recordingPct)}%`);
      continue;
    }
    used.add(p.role);
    stamps.push({ page: 1, x: COL.party, y, text: p.party, size: 9, maxWidth: 190 });
    const perf = pct(p.performancePct);
    const rec = pct(p.recordingPct);
    // Right-aligned against the printed "%" so the figure reads into it.
    if (perf) stamps.push({ page: 1, x: COL.performanceRight, y, text: perf, size: 9, align: "center" });
    if (rec) stamps.push({ page: 1, x: COL.recordingRight, y, text: rec, size: 9, align: "center" });
  }

  put(FOOT.soundCarrier, v.soundCarrier, 240);

  const fin = (v.financedByPublisher || "").trim().toLowerCase();
  if (fin === "yes") stamps.push({ page: 1, x: FOOT.financeYes.x, y: FOOT.financeYes.y, text: "X", size: 10, bold: true });
  if (fin === "no") stamps.push({ page: 1, x: FOOT.financeNo.x, y: FOOT.financeNo.y, text: "X", size: 10, bold: true });

  put(FOOT.agreementDate, v.publishingAgreementDate, 180);
  put(FOOT.validity, v.publishingValidity, 180);
  put(FOOT.territory, v.publishingTerritory, 420);

  for (const e of v.enclosures ?? []) {
    const at = ENCLOSURE_TICK[e];
    if (at) stamps.push({ page: 1, x: at.x, y: at.y, text: "X", size: 9, bold: true });
  }

  const other = [v.otherDocuments, ...overflow].filter((x) => x && x.trim()).join("; ");
  put(FOOT.otherDocuments, other, 420, 8);

  put(FOOT.declarantName, v.declarantName, 270, 9);
  put(FOOT.declaredOn, v.declaredOn, 80, 8);

  if (v.memberSignature) {
    stamps.push({
      kind: "image",
      page: 1,
      x: FOOT.signature.x,
      y: FOOT.signature.y,
      data: v.memberSignature,
      maxWidth: 62,
      maxHeight: 24,
    });
  }

  return stamps;
}
