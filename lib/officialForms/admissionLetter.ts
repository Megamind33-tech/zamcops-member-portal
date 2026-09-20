// Field map for the society's admission letter (assets/forms/admission.pdf).
//
// Positions were read out of the template itself rather than estimated: each
// constant below is where the specimen letter's own text sits, so a value
// written there lands exactly where the office has always put it.
//
// This template is the one exception among the five — it arrived as a filled
// specimen rather than a blank, carrying a previous member's name, address and
// date. Those runs are painted over before the real values are written, which
// is why every field here has a `cover` as well as a position.

import type { Stamp } from "@/lib/formOverlay";

// Baseline y of each line in the specimen, bottom-left origin.
const LINE = {
  name: 546,
  address1: 519,
  address2: 491,
  city: 463,
  applicationDate: 312,
  admittedSentence: 256,
  signatureBaseline: 95, // the GM's name is printed at y=77; the mark sits above it
} as const;

const LEFT = 36; // every line on this letter is flush to this margin
const COVER_H = 16; // tall enough to hide a line of the specimen's 11pt text
const COVER_W = 320; // past the longest specimen value, short of the dotted rule

const cover = (y: number, width = COVER_W): Stamp => ({
  kind: "cover",
  page: 1,
  x: LEFT - 2,
  y: y - 4,
  width,
  height: COVER_H,
});

export interface AdmissionLetterValues {
  memberName: string;
  addressLines: string[]; // street, area, town — printed on the three ruled lines
  applicationDate: string; // already formatted for print
  membershipClass: string; // e.g. CANDIDATE
  generalManagerSignature?: string; // transparent PNG data URL
}

export function admissionLetterStamps(v: AdmissionLetterValues): Stamp[] {
  const [a1 = "", a2 = "", a3 = ""] = v.addressLines;
  const cls = (v.membershipClass || "CANDIDATE").toUpperCase();

  const stamps: Stamp[] = [
    // Addressee block.
    cover(LINE.name),
    { page: 1, x: LEFT, y: LINE.name, text: v.memberName, size: 11, maxWidth: COVER_W },
    cover(LINE.address1),
    { page: 1, x: LEFT, y: LINE.address1, text: a1, size: 11, maxWidth: COVER_W },
    cover(LINE.address2),
    { page: 1, x: LEFT, y: LINE.address2, text: a2, size: 11, maxWidth: COVER_W },
    cover(LINE.city),
    { page: 1, x: LEFT, y: LINE.city, text: a3, size: 11, maxWidth: COVER_W },

    // "Reference is made to your application for membership dated …".
    // The specimen renders "01" and "st" as separate runs, so the cover has to
    // reach above the baseline to take the superscript with it.
    { kind: "cover", page: 1, x: LEFT - 2, y: LINE.applicationDate - 4, width: 260, height: 20 },
    { page: 1, x: LEFT, y: LINE.applicationDate, text: v.applicationDate, size: 11, maxWidth: 250 },

    // The membership class sits mid-sentence, so the whole line is rewritten.
    { kind: "cover", page: 1, x: LEFT - 2, y: LINE.admittedSentence - 4, width: 520, height: 18 },
    {
      page: 1,
      x: LEFT,
      y: LINE.admittedSentence,
      text: `I'm pleased to inform you that you have been admitted as ${cls} member of ZAMCOPS.`,
      size: 11,
      maxWidth: 520,
    },
  ];

  // The General Manager's name and title are printed on the template; only the
  // mark itself is added, sitting above them.
  if (v.generalManagerSignature) {
    stamps.push({
      kind: "image",
      page: 1,
      x: LEFT,
      y: LINE.signatureBaseline,
      data: v.generalManagerSignature,
      maxWidth: 150,
      maxHeight: 55,
    });
  }

  return stamps;
}
