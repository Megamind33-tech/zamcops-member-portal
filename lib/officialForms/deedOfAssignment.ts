// Field map for the Deed of Assignment, incl. Mechanical
// (assets/forms/deed.pdf — A4, three pages).
//
// The deed is almost entirely printed: its clauses are the agreement and
// nothing here touches them. Only four things are written — the date it was
// made, the assignor's name, and the two marks at the foot of page 3 — which is
// what a member and the Board Secretary add with a pen.
//
// The date sits inside one printed run, "made on the …… day of …… 20….", so its
// three parts are placed by interpolating along that run rather than guessed:
// the run spans x=63..476 and the dotted gaps begin at its 38th and 53rd
// characters.

import type { Stamp } from "@/lib/formOverlay";

const P1 = {
  // "By this DEED OF ASSIGNMENT made on the …… day of …… 20…."
  day: { x: 320, y: 599 },
  month: { x: 420, y: 599 },
  // The template prints "20", so only the last two digits are written.
  yearSuffix: { x: 497, y: 599 },
  // The long rule beneath "between", where the assignor is named.
  assignorLine: { centreX: 285, y: 548 },
} as const;

const P3 = {
  // Each execution block is a rule at x=210 running to about x=510.
  assignorSignature: { x: 222, y: 303 },
  societySignature: { x: 222, y: 192 },
  // Printed beneath the rules; a typed name sits under the mark.
  assignorName: { x: 212, y: 288 },
  societyName: { x: 212, y: 177 },
} as const;

export interface DeedValues {
  assignorName: string; // the member, as the deed should name them
  assignorMemberNumber?: string;
  madeOn: Date | string; // the date the deed was executed
  assignorSignature?: string; // the member's mark, a transparent PNG data URL
  boardSecretarySignature?: string; // the Society's mark
  boardSecretaryName?: string; // printed under the Society's rule
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "1st", "2nd", "3rd", "21st" — the deed is written the way a clerk writes it.
function ordinal(d: number): string {
  if (d % 100 >= 11 && d % 100 <= 13) return `${d}th`;
  return `${d}${["th", "st", "nd", "rd"][d % 10] ?? "th"}`;
}

export function deedStamps(v: DeedValues): Stamp[] {
  const when = v.madeOn instanceof Date ? v.madeOn : new Date(v.madeOn);
  const valid = !isNaN(when.getTime());

  const named = v.assignorMemberNumber
    ? `${v.assignorName} (${v.assignorMemberNumber})`
    : v.assignorName;

  const stamps: Stamp[] = [
    {
      page: 1,
      x: P1.assignorLine.centreX,
      y: P1.assignorLine.y,
      text: named,
      size: 11,
      bold: true,
      align: "center",
      maxWidth: 350,
    },
  ];

  if (valid) {
    stamps.push(
      { page: 1, x: P1.day.x, y: P1.day.y, text: ordinal(when.getDate()), size: 10, maxWidth: 40 },
      { page: 1, x: P1.month.x, y: P1.month.y, text: MONTHS[when.getMonth()], size: 10, maxWidth: 62 },
      {
        page: 1,
        x: P1.yearSuffix.x,
        y: P1.yearSuffix.y,
        text: String(when.getFullYear()).slice(-2),
        size: 10,
        maxWidth: 18,
      },
    );
  }

  // The marks at the foot of page 3, each above its rule.
  if (v.assignorSignature) {
    stamps.push({
      kind: "image",
      page: 3,
      x: P3.assignorSignature.x,
      y: P3.assignorSignature.y,
      data: v.assignorSignature,
      maxWidth: 240,
      maxHeight: 64,
    });
  }
  stamps.push({ page: 3, x: P3.assignorName.x, y: P3.assignorName.y, text: v.assignorName, size: 8, maxWidth: 290 });

  if (v.boardSecretarySignature) {
    stamps.push({
      kind: "image",
      page: 3,
      x: P3.societySignature.x,
      y: P3.societySignature.y,
      data: v.boardSecretarySignature,
      maxWidth: 240,
      maxHeight: 64,
    });
  }
  if (v.boardSecretaryName) {
    stamps.push({ page: 3, x: P3.societyName.x, y: P3.societyName.y, text: v.boardSecretaryName, size: 8, maxWidth: 80 });
  }

  return stamps;
}
