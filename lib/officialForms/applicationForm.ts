// Fills the society's membership application forms — Individual, Group and
// Publisher (assets/forms/{individual,group,publisher}.pdf).
//
// Each field names the label printed beside its rule, and the position comes
// from the template via lib/officialForms/anchors.ts. That is what lets three
// forms of roughly a hundred boxes share one implementation instead of three
// walls of coordinates, and it is why replacing a template only means
// re-running `npm run map:forms`.
//
// The labels come from lib/applicationForms.ts, which was transcribed from
// these same documents, so most match on their own; ANCHOR_OVERRIDE carries the
// few where the portal's wording and the print differ, or where a word appears
// more than once and the wrong one would be found first.

import type { Stamp } from "@/lib/formOverlay";
import type { TemplateName } from "@/lib/formOverlay";
import { findAnchor } from "@/lib/officialForms/anchors";
import { FORM_DEFS, type ApplicationFormType } from "@/lib/applicationForms";

export const TEMPLATE_FOR: Record<ApplicationFormType, TemplateName> = {
  Individual: "individual",
  Group: "group",
  Publisher: "publisher",
};

// field key -> what is actually printed on the form, when it differs from the
// portal's label or is ambiguous on its own.
const ANCHOR_OVERRIDE: Record<string, { label: string; occurrence?: number; page?: number }> = {
  passportNo: { label: "Passport no" },
  resAddress: { label: "Contact address" },
  postalAddress: { label: "(Postal)" },
  bankAddress: { label: "Bank address" },
  accountNumber: { label: "Account number" },
  fullTimeEmployment: { label: "full time" },
  employerDetails: { label: "If yes, name and address" },
  otherSociety: { label: "member of any other Copyright Society" },
  otherSocietyDetails: { label: "If yes, give details" },
  worksProduced: { label: "Indicate the works you have produced" },
  otherInfo: { label: "Any other relevant information" },
  // Confined to the inheritance page. "Name" is inside "Surname" and "Address"
  // inside "Contact address", so without the page these land on the applicant's
  // own details and print on top of them.
  successorName: { label: "Name", page: 3 },
  successorAddress: { label: "Address", page: 3 },
  capacities: { label: "Tick as appropriate" },
  // The print says "Different spelling"; the portal asks the fuller question.
  differentSpelling: { label: "Different spelling" },

  // Group form. "Name" appears in "IPI name number" and "Name or title" too,
  // so the group's own name is taken as the first in reading order.
  groupName: { label: "Name", occurrence: 0 },
  repName: { label: "Name or title" },
  homeAddress: { label: "Home" },
  homeEmail: { label: "Email", occurrence: 0 },
  homeWebsite: { label: "Website", occurrence: 0 },

  // Publisher form.
  corporateName: { label: "Corporate name" },
  foundationDate: { label: "Foundation date" },
  foundationPlace: { label: "Foundation place" },
  commercialRegistrationNumber: { label: "Commercial registration number" },
  commercialRegistrationDate: { label: "Commercial registration date" },
  legalForm: { label: "Legal form" },
  hqEmail: { label: "Email", occurrence: 0 },
  hqWebsite: { label: "Website", occurrence: 0 },

  // Both group and publisher repeat Email and Website under Headquarters/Home
  // and again under Correspondence. The second of each is the correspondence
  // one; the letterhead's own copies are excluded before counting.
  correspondenceAddress: { label: "Correspondence" },
  corrEmail: { label: "Email", occurrence: 1 },
  corrWebsite: { label: "Website", occurrence: 1 },
};

// Written this far right of where the label's words end, so a value sits on its
// dotted rule rather than touching the last letter of the label.
const GAP = 6;
// Lifted slightly off the baseline, the way a hand writes above a rule.
const RISE = 1.5;

export interface ApplicationFormValues {
  formType: ApplicationFormType;
  payload: Record<string, unknown>;
  adminFields?: Record<string, unknown>;
  applicantName: string;
  signedOn?: string; // formatted date
  applicantSignature?: string; // transparent PNG data URL
}

function asText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v).trim();
}

export interface ApplicationFormResult {
  stamps: Stamp[];
  /** Fields whose label could not be found on the template. */
  unplaced: string[];
}

export function applicationFormStamps(v: ApplicationFormValues): ApplicationFormResult {
  const template = TEMPLATE_FOR[v.formType];
  const def = FORM_DEFS[v.formType];
  const stamps: Stamp[] = [];
  const unplaced: string[] = [];

  for (const section of def.sections) {
    for (const f of section.fields ?? []) {
      // A field the applicant was never shown has nothing to write.
      if (f.showIf && asText(v.payload[f.showIf.key]) !== f.showIf.value) continue;
      const text = asText(v.payload[f.key]);
      if (!text) continue;

      const override = ANCHOR_OVERRIDE[f.key];
      const anchor =
        findAnchor(template, override?.label ?? f.label, {
          occurrence: override?.occurrence,
          page: override?.page,
        }) ??
        // Fall back to the portal's own wording, in case an override has gone stale.
        findAnchor(template, f.label);

      if (!anchor) {
        // Recorded rather than dropped: a member's answer silently missing from
        // an official form is worse than an obvious gap someone can chase.
        unplaced.push(`${f.key} (${f.label})`);
        continue;
      }

      stamps.push({
        page: anchor.page,
        x: anchor.afterLabel + GAP,
        y: anchor.y + RISE,
        text,
        size: 9,
        // Stop short of the rule's end so a long answer shrinks rather than
        // running into the next printed field.
        maxWidth: Math.max(40, anchor.right - anchor.afterLabel - GAP),
      });
    }
  }

  // The declaration at the foot of the last page: "Signature …… Date ……".
  const sig = findAnchor(template, "Signature");
  if (sig) {
    if (v.applicantSignature) {
      stamps.push({
        kind: "image",
        page: sig.page,
        x: sig.afterLabel + GAP,
        y: sig.y - 2,
        data: v.applicantSignature,
        maxWidth: 130,
        maxHeight: 26,
      });
    }
    const date = findAnchor(template, "Date", { page: sig.page });
    if (date && v.signedOn) {
      stamps.push({
        page: date.page,
        x: date.afterLabel + GAP,
        y: date.y + RISE,
        text: v.signedOn,
        size: 9,
        maxWidth: Math.max(50, date.right - date.afterLabel - GAP),
      });
    }
  }

  return { stamps, unplaced };
}
