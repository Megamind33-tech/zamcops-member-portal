// Field map for the society's admission letter (assets/forms/admission.pdf).
//
// Positions are read out of the template itself, not estimated: each constant
// is where the form's own rule or sentence sits, so a value written there lands
// where the office has always put it.
//
// The template is blank. An earlier export carried a specimen member's name,
// address and date, which had to be painted over — correct on the page but not
// underneath, since the specimen's text stayed in the PDF's text layer and
// would have travelled inside every member's letter. Working from a blank
// removes that entirely, so nothing here covers anything except the one
// sentence that has a value printed mid-line.

import type { Stamp } from "@/lib/formOverlay";

// The four ruled lines of the addressee block, and what sits above each.
// A value is written 14pt above its rule, which is where the specimen sat.
const RULE = { name: 528, address1: 500, address2: 473, city: 445 } as const;
const ABOVE_RULE = 14;

const LINE = {
  // "Reference is made to your application for membership dated" sits at 335;
  // the date goes on the line beneath it, at the spacing the specimen used.
  applicationDate: 308,
  admittedSentence: 252,
  // The General Manager's name is printed at y=72; the mark belongs above it.
  signatureBaseline: 88,
} as const;

const LEFT = 36;
const FIELD_W = 300; // the ruled lines run to roughly x=240; allow a little over

export interface AdmissionLetterValues {
  memberName: string;
  addressLines: string[]; // street, area, town — one per ruled line
  applicationDate: string; // already formatted for print
  membershipClass: string; // e.g. CANDIDATE
  generalManagerSignature?: string; // transparent PNG data URL
}

export function admissionLetterStamps(v: AdmissionLetterValues): Stamp[] {
  const [a1 = "", a2 = "", a3 = ""] = v.addressLines;
  const cls = (v.membershipClass || "CANDIDATE").trim().toUpperCase();

  const stamps: Stamp[] = [
    { page: 1, x: LEFT, y: RULE.name + ABOVE_RULE, text: v.memberName, size: 11, maxWidth: FIELD_W },
    { page: 1, x: LEFT, y: RULE.address1 + ABOVE_RULE, text: a1, size: 11, maxWidth: FIELD_W },
    { page: 1, x: LEFT, y: RULE.address2 + ABOVE_RULE, text: a2, size: 11, maxWidth: FIELD_W },
    { page: 1, x: LEFT, y: RULE.city + ABOVE_RULE, text: a3, size: 11, maxWidth: FIELD_W },
    { page: 1, x: LEFT, y: LINE.applicationDate, text: v.applicationDate, size: 11, maxWidth: 250 },
  ];

  // The template prints "admitted as a CANDIDATE member". Any other class means
  // rewriting the line, so it is only touched when it would otherwise be wrong.
  if (cls !== "CANDIDATE") {
    stamps.push(
      { kind: "cover", page: 1, x: LEFT - 2, y: LINE.admittedSentence - 4, width: 530, height: 18 },
      {
        page: 1,
        x: LEFT,
        y: LINE.admittedSentence,
        text: `I'm pleased to inform you that you have been admitted as a ${cls} member of ZAMCOPS.`,
        size: 11,
        maxWidth: 525,
      },
    );
  }

  if (v.generalManagerSignature) {
    stamps.push({
      kind: "image",
      page: 1,
      x: LEFT,
      y: LINE.signatureBaseline,
      data: v.generalManagerSignature,
      maxWidth: 150,
      maxHeight: 52,
    });
  }

  return stamps;
}
