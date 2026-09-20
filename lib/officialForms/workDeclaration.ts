// Field map for the society's WORK DECLARATION (assets/forms/workdecl.pdf).
//
// This is the form a work registration produces. Its distribution key is the
// reason the portal stores two shares per rightsholder rather than one: the
// sheet has a Performance/Broadcast column and a Recording/Rights column, side
// by side, on each of seven role rows. A single figure could not fill it.
//
// Positions are read out of the template, and re-read whenever it is replaced:
// a fresh export of the same sheet moved every row by about 40pt and widened
// the percentage columns by 25. Nothing here is estimated, and nothing is
// covered — the template is blank, verified by `npm run check:forms`.

import type { Stamp } from "@/lib/formOverlay";
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
  workNo: { x: 450, y: 727 },
  yearComposed: { x: 410, y: 714 },
  duration: { x: 378, y: 701 },
  dateOfRegistration: { x: 496, y: 702 },
  instruments: { x: 115, y: 688 },
  fileNo: { x: 378, y: 688 },
  genre: { x: 20, y: 676 },
  factor: { x: 440, y: 676 },
} as const;

const FOOT = {
  soundCarrier: { x: 115, y: 403 },
  financeYes: { x: 289, y: 391 }, // just right of "YES"
  financeNo: { x: 373, y: 391 }, // just right of "NO"
  agreementDate: { x: 135, y: 327 },
  validity: { x: 378, y: 327 },
  territory: { x: 135, y: 314 },
  otherDocuments: { x: 135, y: 225 },
  declarantName: { x: 62, y: 85 },
  signature: { x: 370, y: 91 },
  declaredOn: { x: 445, y: 85 },
} as const;

// A tick placed just before each enclosure's printed label.
const ENCLOSURE_TICK: Record<string, { x: number; y: number }> = {
  Lyrics: { x: 24, y: 276 },
  "Musical score": { x: 240, y: 276 },
  Online: { x: 342, y: 276 },
  CD: { x: 30, y: 264 },
  Contract: { x: 242, y: 264 },
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
