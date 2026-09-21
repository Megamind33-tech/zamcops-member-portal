// Fills the society's three membership application forms — Individual, Group
// and Publisher (assets/forms/{individual,group,publisher}.pdf).
//
// Every position below is a slot id from assets/forms/slots.json, which
// scripts/map-form-slots.py reads out of the templates themselves. The id spells
// out where the mark lands (p<page>.<y>.<x>) and the comment beside it names the
// printed label, so this file can be checked against the paper line by line.
//
// Three rules the office gave us, which the shape of this file follows:
//
//   * A value belongs ON the rule the form printed for it. Where a question is
//     given three dotted lines, the answer is wrapped across those three lines
//     rather than squeezed beside the question.
//   * Office boxes stay empty. Internal number, IPI name and base number, file,
//     subscription, circle of occupation and the entry/exit dates are filled by
//     staff, so they print only from `adminFields` and never from an
//     applicant's own answers.
//   * "Tick as appropriate" means a tick. A capacity the applicant did not
//     claim is left blank, not written "No".

import type { Stamp, TemplateName } from "@/lib/formOverlay";
import { maybeSlot, widthOf, type Slot } from "@/lib/officialForms/slots";
import { FORM_DEFS, type ApplicationFormType } from "@/lib/applicationForms";

export const TEMPLATE_FOR: Record<ApplicationFormType, TemplateName> = {
  Individual: "individual",
  Group: "group",
  Publisher: "publisher",
};

// Values are written a shade under the 12pt the forms are printed at, so a
// filled-in answer reads as an answer without towering over its question.
const VALUE_SIZE = 11;
const MIN_SIZE = 8;
// A handful of rules are far shorter than what now goes on them: the individual
// form's "E-mail" rule is 78pt of paper, printed when an address was a name and
// a dot, and the printed "Website" label starts immediately after it. A value
// there cannot both stay on its rule and stay at 8pt. Running past the rule
// would print over the next question, and truncating would lose the second half
// of someone's e-mail address, so a rule this short gets smaller writing — the
// same thing a clerk does with a pen.
const TIGHT_RULE = 120;
const TIGHT_MIN_SIZE = 6;
// Lifted off the rule so the dots stay visible under the writing.
const RISE = 2;
// Left of a value on its own rule, and after a printed word.
const INSET = 2;
const GAP = 8;

export interface ApplicationFormValues {
  formType: ApplicationFormType;
  payload: Record<string, unknown>;
  /** What the office filled in. The only source for the internal-use boxes. */
  adminFields?: Record<string, unknown>;
  applicantName: string;
  signedOn?: string; // already formatted
  applicantSignature?: string; // transparent PNG data URL
}

/** What was written where, for auditing a rendered form against its map. */
export interface Placement {
  /** The slot ids the value was written across, in order. */
  slots: string[];
  text: string;
}

export interface ApplicationFormResult {
  stamps: Stamp[];
  /**
   * Every value and the rule it went on. scripts/verify-form-fill.py reads the
   * finished PDF and asserts each one came out where this says it did — which
   * is the check that catches a value on the wrong rule, as opposed to one
   * merely on no rule at all.
   */
  placements: Placement[];
  /**
   * Fields the applicant answered that this map has nowhere to put. Empty is
   * the only acceptable value — anything here is an answer the office will
   * never see on the paper it files.
   */
  unplaced: string[];
}

const asText = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v).trim();
};

const asList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => asText(x)).filter(Boolean) : asText(v) ? [asText(v)] : [];

/**
 * Day, month and year of a date the portal holds as YYYY-MM-DD, or that
 * somebody typed as dd/mm/yyyy. Returns null for anything else, which is then
 * written through as it stands rather than mangled.
 */
function dmy(value: string): [string, string, string] | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return [iso[3], iso[2], iso[1]];
  const slashed = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(value);
  if (slashed) return [slashed[1].padStart(2, "0"), slashed[2].padStart(2, "0"), slashed[3]];
  return null;
}

const asRows = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((r): r is Record<string, unknown> => !!r && typeof r === "object") : [];

/** A writer bound to one template, which records what it used. */
class Sheet {
  readonly stamps: Stamp[] = [];
  readonly placements: Placement[] = [];
  readonly used = new Set<string>();
  private readonly missing: string[] = [];

  constructor(
    private readonly template: TemplateName,
    private readonly v: ApplicationFormValues,
  ) {}

  private at(id: string): Slot | null {
    const s = maybeSlot(this.template, id);
    // A template that has been re-exported loses its ids. Everything else on
    // the form is still worth issuing, and `npm run check:forms` is what turns
    // this into a build failure rather than a surprise on someone's paperwork.
    if (!s) this.missing.push(`${this.template}:${id}`);
    return s;
  }

  value(key: string): string {
    this.used.add(key);
    return asText(this.v.payload[key]);
  }

  admin(key: string): string {
    return asText(this.v.adminFields?.[key]);
  }

  /** One value on one rule. */
  text(id: string, value: string, opts: { size?: number; width?: number } = {}): void {
    if (!value) return;
    const s = this.at(id);
    if (!s) return;
    const room = (opts.width ?? widthOf(s)) - INSET * 2;
    this.placements.push({ slots: [id], text: value });
    this.stamps.push({
      page: s.page,
      x: s.x + INSET,
      y: s.y + RISE,
      text: value,
      size: opts.size ?? VALUE_SIZE,
      maxWidth: room,
      minSize: room < TIGHT_RULE ? TIGHT_MIN_SIZE : MIN_SIZE,
    });
  }

  /** One field of the applicant's, on one rule. */
  field(id: string, key: string, opts?: { size?: number; width?: number }): void {
    this.text(id, this.value(key), opts);
  }

  /** A date on one rule, written the way the office writes it. */
  dateField(id: string, key: string): void {
    const raw = this.value(key);
    const parts = dmy(raw);
    this.text(id, parts ? parts.join("/") : raw);
  }

  /**
   * A date across the three cells the form prints as "…… / …… / ……". Filling
   * the whole date into the first cell is what used to leave the other two
   * looking unanswered.
   */
  dateCells(ids: [string, string, string], key: string): void {
    const raw = this.value(key);
    const parts = dmy(raw);
    if (!parts) {
      this.text(ids[0], raw);
      return;
    }
    parts.forEach((part, i) => this.text(ids[i], part));
  }

  /** A value wrapped across all the rules the form gave the question. */
  para(ids: string[], value: string): void {
    if (!value) return;
    const lines = ids
      .map((id) => this.at(id))
      .filter((s): s is Slot => !!s)
      .map((s) => ({ page: s.page, x: s.x + INSET, y: s.y + RISE, width: widthOf(s) - INSET * 2 }));
    if (!lines.length) return;
    this.placements.push({ slots: ids.filter((id) => maybeSlot(this.template, id)), text: value });
    this.stamps.push({ kind: "paragraph", lines, text: value, size: VALUE_SIZE, minSize: MIN_SIZE });
  }

  paraField(ids: string[], key: string): void {
    this.para(ids, this.value(key));
  }

  /** Written to the right of printed words that have no rule of their own. */
  after(labelId: string, value: string, width: number): void {
    if (!value) return;
    const s = this.at(labelId);
    if (!s) return;
    this.placements.push({ slots: [`after:${labelId}`], text: value });
    this.stamps.push({
      page: s.page,
      x: s.x1 + GAP,
      y: s.y,
      text: value,
      size: VALUE_SIZE,
      maxWidth: width,
    });
  }

  /**
   * A tick centred in the box the form drew for it.
   *
   * The boxes are closed paths of line segments rather than rectangles, so
   * scripts/map-form-slots.py finds them by shape and records their bounds.
   * Placing a tick relative to the word beside the box instead put it in the
   * gap to the box's left — beside the answer rather than in it.
   */
  tick(boxId: string, on: boolean): void {
    if (!on) return;
    const b = this.at(boxId);
    if (!b) return;
    const w = Math.max(1, b.x1 - b.x);
    const h = Math.max(1, (b.y1 ?? b.y) - b.y);
    // Comfortably inside the box, with the mark's own proportions (a tick is
    // drawn about 0.92 wide for its height) kept square to it.
    const size = Math.min(h * 0.72, w * 0.66);
    this.stamps.push({
      kind: "tick",
      page: b.page,
      x: b.x + (w - size * 0.92) / 2,
      y: b.y + (h - size) / 2,
      size,
    });
  }

  /** A yes/no pair, where only the answer given is marked. */
  yesNo(key: string, yesBoxId: string, noBoxId: string): void {
    const answer = this.value(key).toLowerCase();
    this.tick(yesBoxId, answer === "yes");
    this.tick(noBoxId, answer === "no");
  }

  signature(sigId: string, dateId: string): void {
    const sig = this.at(sigId);
    if (sig && this.v.applicantSignature) {
      this.stamps.push({
        kind: "image",
        page: sig.page,
        x: sig.x + INSET,
        y: sig.y,
        data: this.v.applicantSignature,
        maxWidth: Math.max(96, widthOf(sig) - INSET * 2),
        maxHeight: 45,
      });
    }
    this.text(dateId, this.v.signedOn ?? "");
  }

  /** The office's internal-use boxes, filled only from what staff entered. */
  office(pairs: [string, string][]): void {
    for (const [id, key] of pairs) this.text(id, this.admin(key));
  }

  problems(): string[] {
    return this.missing;
  }
}

// Answers the applicant gives the portal that the paper form has no box for,
// or that belong to the office. Listed so the unplaced check stays meaningful.
const NOT_ON_PAPER: Record<ApplicationFormType, string[]> = {
  // IPI numbers print from adminFields; what an applicant types is a claim the
  // office verifies, not something the form carries.
  Individual: ["ipiNameNumber", "ipiBaseNumber"],
  Group: ["ipiNameNumber", "ipiBaseNumber"],
  Publisher: ["ipiNameNumber", "ipiBaseNumber"],
};

// How the applicant chose to be paid, as one line for the form's Method box.
function paymentLine(s: Sheet): string {
  const method = s.value("paymentMethod");
  const mobile = s.value("mobileMoneyNumber");
  if (method === "Mobile money" && mobile) return `Mobile money — ${mobile}`;
  return method;
}

// What goes on the bank-account rules, which serve whichever method was chosen.
// The method itself is already printed in its own box, so it is not repeated
// here: a form that says "Mobile money" twice reads as a mistake.
function paymentDetail(s: Sheet, accountKey: string): string {
  const method = s.value("paymentMethod");
  const account = s.value(accountKey);
  if (account) return account;
  if (method === "Mobile money") return s.value("mobileMoneyNumber");
  if (method === "Other") return s.value("otherPaymentDetails");
  return "";
}

function individual(s: Sheet, v: ApplicationFormValues): void {
  // Page 1 — personal details.
  s.field("p1.485.145", "surname"); // 1 Surname
  s.field("p1.464.167", "maidenName"); // 3. Maiden Name
  s.field("p1.443.153", "firstName"); // 5. First name
  s.field("p1.422.163", "pseudonyms"); // 6. Pseudonyms
  s.field("p1.402.187", "differentSpelling"); // 7. Different spelling
  s.field("p1.381.129", "sex"); // 8. Sex
  s.dateField("p1.360.163", "dateOfBirth"); // 9. Date of birth
  s.field("p1.340.214", "placeOfBirth"); // 10. Place of birth (country)
  s.field("p1.319.156", "nationality"); // 11. Nationality
  // 12 prints "Passport no: …… NRC NO: ……" on one line: two rules, two answers.
  s.field("p1.298.161", "passportNo"); // 12. Passport no:
  s.field("p1.298.368", "nrcNumber"); // 12. NRC NO:
  s.field("p1.278.158", "language"); // 13. Language
  s.field("p1.257.171", "maritalStatus"); // 14. Marital status
  s.field("p1.236.140", "spouse"); // 15. Spouse

  // 16 gives the residential address a rule beside the label and a full-width
  // one under it; the postal address gets the line below that.
  s.paraField(["p1.216.207", "p1.195.99"], "resAddress");
  s.paraField(["p1.174.139"], "postalAddress");
  s.field("p1.154.119", "cell"); // Cell
  s.field("p1.154.215", "fax"); // Fax
  s.field("p1.154.350", "email"); // E-mail
  s.field("p1.154.473", "website"); // Website

  // 17 Payment method is printed without a rule, so the method is written out
  // beside it in the space the form leaves before the right margin.
  s.after("p1.133.99", paymentLine(s), 300);
  s.paraField(["p1.112.166"], "bankAddress"); // 18. Bank address
  s.text("p1.91.182", paymentDetail(s, "accountNumber")); // 19. Account number

  // Page 2 — employment, other societies, capacity, works.
  s.yesNo("fullTimeEmployment", "box.p2.729.135", "box.p2.729.351"); // 20. Yes / No
  s.paraField(["p2.676.99", "p2.655.99"], "employerDetails"); // 21
  s.yesNo("otherSociety", "box.p2.575.135", "box.p2.575.351"); // 22. Yes / No
  s.paraField(["p2.538.99", "p2.517.99", "p2.496.99"], "otherSocietyDetails"); // 23

  // 24 "Tick as appropriate?" — the form prints Author, Arranger and Publisher.
  // A composer signs as an author here; there is no separate box for one, and
  // the capacities nobody claimed stay blank.
  const capacities = asList(v.payload.capacities).map((c) => c.toLowerCase());
  s.used.add("capacities");
  s.tick("box.p2.444.153", capacities.includes("author") || capacities.includes("composer")); // Author
  s.tick("box.p2.444.297", capacities.includes("arranger")); // Arranger
  s.tick("box.p2.442.486", capacities.includes("publisher")); // Publisher

  // 25 — six rules, one work to a line.
  const works = asRows(v.payload.worksProduced)
    .map((w) => {
      const by = asText(w.performedBy);
      const on = asText(w.date);
      return [asText(w.title), by && `performed by ${by}`, on].filter(Boolean).join(" — ");
    })
    .filter(Boolean);
  s.used.add("worksProduced");
  s.para(
    ["p2.368.99", "p2.347.99", "p2.326.99", "p2.306.99", "p2.285.99", "p2.264.99"],
    works.join("\n"),
  );

  s.paraField(["p2.216.99", "p2.195.99", "p2.174.99"], "otherInfo"); // 26

  // Page 3 — inheritance and the declaration.
  s.field("p3.607.170", "successorName"); // Name :
  s.paraField(["p3.579.181", "p3.552.171", "p3.524.171", "p3.496.171"], "successorAddress");
  // The date under "Inheritance information" dates that nomination, so it is
  // only meaningful once somebody has been named.
  if (asText(v.payload.successorName)) s.text("p3.662.128", v.signedOn ?? "");
  s.signature("p3.317.151", "p3.317.432");

  s.office([
    ["p1.526.326", "internalNumber"],
    ["p1.485.446", "ipiNameNumber"],
    ["p1.464.448", "ipiBaseNumber"],
    ["p2.140.200", "circleOfOccupation"],
    ["p2.112.121", "fileRef"],
  ]);
}

function group(s: Sheet, v: ApplicationFormValues): void {
  // Page 1 — the name table, then foundation details.
  // The name column has a second row under it, which is where a name too long
  // for the first one belongs — not squeezed into 6pt on the row above.
  s.paraField(["p1.499.99", "p1.472.99"], "groupName"); // Name
  s.field("p1.472.318", "differentSpellings"); // Different spellings
  s.field("p1.472.423", "groupType", { width: 34 }); // Type (a narrow column)
  s.dateCells(["p1.389.171", "p1.389.234", "p1.389.313"], "dateOfFoundation"); // Date of foundation
  s.field("p1.361.171", "placeOfFoundation"); // Place of foundation
  s.field("p1.334.135", "country"); // Country
  s.field("p1.306.135", "language"); // Language
  s.field("p1.279.229", "passportOrIdNumber"); // Passport or identity card number

  // Representative and addresses. "Home" runs down the foot of page 1 and on
  // to the head of page 2, which is why the paragraph carries its own pages.
  s.paraField(["p1.210.135", "p1.182.134"], "repName"); // Name or title:
  s.paraField(["p1.127.135", "p1.99.135", "p1.72.135", "p2.731.135"], "homeAddress");
  s.field("p1.127.413", "cell"); // Cell :
  s.field("p1.99.411", "fax"); // Fax :
  s.field("p1.72.422", "homeEmail"); // Email :
  s.field("p2.731.433", "homeWebsite"); // Website :

  // Correspondence. The form asks for it twice over because a group is often
  // reached somewhere other than home; when they are the same place, the
  // second block stays blank rather than printing the same line twice.
  s.paraField(["p2.703.150", "p2.676.150", "p2.648.148", "p2.621.144"], "correspondenceAddress");
  s.text("p2.648.422", distinct(s.value("corrEmail"), asText(v.payload.homeEmail)));
  s.text("p2.621.433", distinct(s.value("corrWebsite"), asText(v.payload.homeWebsite)));

  // Page 2 — payments, then the members of the group.
  s.field("p2.496.99", "payee"); // Payee
  s.field("p2.496.279", "rate"); // Rate
  s.text("p2.496.366", paymentLine(s)); // Method
  s.para(["p2.496.459", "p2.469.459"], paymentDetail(s, "bankAccount")); // Bank account

  const rows = asRows(v.payload.groupMembers);
  s.used.add("groupMembers");
  const memberRules: [string, string][] = [
    ["p2.386.63", "p2.386.213"],
    ["p2.358.63", "p2.358.213"],
    ["p2.331.63", "p2.331.207"],
  ];
  rows.slice(0, memberRules.length).forEach((m, i) => {
    s.text(memberRules[i][0], asText(m.surname));
    s.text(memberRules[i][1], asText(m.firstName));
    // The IPI column beside each member is the office's, like every other.
  });

  // Page 2/3 — managed rights.
  s.field("p2.110.237", "regionOrCity"); // Region or City (Residence) :
  s.field("p3.690.192", "categoryOfWorks"); // Category of works:
  s.field("p3.662.236", "rightHolderRole"); // Type of right holder (Role) :
  s.field("p3.634.245", "managedRights"); // Managed or transferred rights:
  s.field("p3.607.153", "territories"); // Territories:
  s.signature("p3.370.210", "p3.370.359");

  s.office([
    ["p1.527.290", "internalNumber"],
    ["p1.472.459", "ipiNameNumber"],
    ["p1.417.315", "ipiBaseNumber"],
    ["p2.248.216", "admissionDate"],
    ["p2.193.241", "membershipPosition"],
    ["p2.82.200", "circleOfOccupation"],
    ["p2.55.121", "fileRef"],
    ["p3.717.163", "subscription"],
  ]);
}

function publisher(s: Sheet, v: ApplicationFormValues): void {
  // Page 1 — the corporate name table, then registration details.
  // As on the group form, the name column runs on to the row beneath it.
  s.paraField(["p1.470.140", "p1.442.63"], "corporateName"); // Corporate name
  s.field("p1.442.264", "spellingsMarks"); // Spellings, Marks
  s.field("p1.442.387", "companyType", { width: 60 }); // Type
  s.dateCells(["p1.360.141", "p1.360.291", "p1.360.402"], "foundationDate"); // Foundation date
  s.field("p1.332.146", "foundationPlace"); // Foundation place
  s.field("p1.304.135", "country"); // Country
  s.field("p1.277.135", "language"); // Language
  s.dateCells(["p1.249.206", "p1.249.332", "p1.249.408"], "commercialRegistrationDate");
  s.field("p1.222.220", "commercialRegistrationNumber"); // Commercial registration number
  s.dateCells(["p1.194.125", "p1.194.218", "p1.194.297"], "dateOfCopy"); // Date of copy
  s.field("p1.166.117", "legalForm"); // Legal form

  // Headquarters runs down page 1 and finishes on page 2.
  s.paraField(["p1.111.171", "p1.84.135", "p1.56.135", "p2.717.135"], "headquartersAddress");
  s.field("p1.111.377", "cell"); // Cell :
  s.field("p1.84.375", "fax"); // Fax :
  s.field("p1.56.386", "hqEmail"); // Email :
  s.field("p2.717.397", "hqWebsite"); // Website :

  // Correspondence, blank where it would only repeat the headquarters.
  s.paraField(["p2.690.150", "p2.662.135", "p2.634.135", "p2.607.135"], "correspondenceAddress");
  s.text("p2.634.386", distinct(s.value("corrEmail"), asText(v.payload.hqEmail)));
  s.text("p2.607.397", distinct(s.value("corrWebsite"), asText(v.payload.hqWebsite)));

  // Page 2 — payments. "Method :" is printed hard against the right margin, so
  // the method goes in what is left of the line and the details below it.
  s.text("p2.538.63", v.applicantName); // the payee rule under "Publisher"
  s.after("p2.552.495", paymentLine(s), 66);
  s.para(["p2.510.171", "p2.483.171", "p2.455.171"], paymentDetail(s, "bankAccount"));

  // Managers and Biography: the managers on the rule beside their label, the
  // biography on the rules underneath, which is what the spacing is for.
  const managers = asRows(v.payload.managers)
    .map((m) => [asText(m.name), asText(m.position) && `(${asText(m.position)})`].filter(Boolean).join(" "))
    .filter(Boolean);
  s.used.add("managers");
  s.para(["p2.358.110", "p2.331.98"], managers.join("; "));
  s.paraField(["p2.303.98", "p2.276.98"], "biography");

  s.field("p2.55.237", "regionOrCity"); // Region or City (Residence) :

  // Page 3 — managed rights, inheritance, declaration.
  s.field("p3.648.192", "categoryOfWorks"); // Category of works:
  s.field("p3.621.236", "rightHolderRole"); // Type of right holder (Role) :
  s.field("p3.593.245", "managedRights"); // Managed or transferred rights:
  s.field("p3.565.153", "territories"); // Territories:
  s.field("p3.455.170", "successorName"); // Name :
  s.paraField(["p3.427.181", "p3.400.171", "p3.372.171"], "successorAddress");
  if (asText(v.payload.successorName)) s.text("p3.510.128", v.signedOn ?? "");
  s.signature("p3.200.147", "p3.200.428");

  s.office([
    ["p1.498.290", "internalNumber"],
    ["p1.415.146", "ipiNameNumber"],
    ["p1.387.142", "ipiBaseNumber"],
    ["p2.193.216", "admissionDate"],
    ["p2.138.241", "membershipPosition"],
    ["p3.717.200", "circleOfOccupation"],
    ["p3.690.121", "fileRef"],
    ["p3.676.163", "subscription"],
  ]);
}

// Printed only when it says something the other block did not already say.
const distinct = (value: string, sameAs: string): string =>
  value && value.trim().toLowerCase() === sameAs.trim().toLowerCase() ? "" : value;

const FILLERS: Record<ApplicationFormType, (s: Sheet, v: ApplicationFormValues) => void> = {
  Individual: individual,
  Group: group,
  Publisher: publisher,
};

export function applicationFormStamps(v: ApplicationFormValues): ApplicationFormResult {
  const sheet = new Sheet(TEMPLATE_FOR[v.formType], v);
  FILLERS[v.formType](sheet, v);

  // Anything the applicant answered that never reached the paper. The map is
  // explicit, so this is the check that it stayed in step with the form the
  // portal actually shows people.
  const exempt = new Set(NOT_ON_PAPER[v.formType]);
  const unplaced: string[] = [];
  for (const section of FORM_DEFS[v.formType].sections) {
    for (const f of section.fields ?? []) {
      if (sheet.used.has(f.key) || exempt.has(f.key)) continue;
      if (f.showIf && asText(v.payload[f.showIf.key]) !== f.showIf.value) continue;
      if (asText(v.payload[f.key])) unplaced.push(`${f.key} (${f.label})`);
    }
    const r = section.repeat;
    if (r && !sheet.used.has(r.key) && !exempt.has(r.key) && asRows(v.payload[r.key]).length) {
      unplaced.push(`${r.key} (${r.label})`);
    }
  }

  return {
    stamps: sheet.stamps,
    placements: sheet.placements,
    unplaced: [...unplaced, ...sheet.problems()],
  };
}
