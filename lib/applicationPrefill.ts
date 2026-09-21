// What the membership application already knows from the member's account.
//
// A person used to give the society the same details three times: once to
// register, once on the membership application, and once more on their profile.
// Surname, NRC, phone and email were asked for on every one of them.
//
// Sign-up now creates the application, and this is the single place that says
// which account field answers which question on the form. It is used twice —
// when the application is created at sign-up, and again whenever the member
// opens it, so a detail they later corrected on their profile shows up on the
// form rather than the stale copy taken at sign-up.
//
// It only ever fills a blank. Anything the member typed on the form itself
// wins, because the form asks for the legal version of a name and an account
// holds the everyday one.

import type { ApplicationFormType } from "@/lib/applicationForms";

/** The account fields this reads. A Prisma Member satisfies it. */
export interface MemberLikeAccount {
  fullName: string;
  stageName?: string | null;
  nrcOrPassport?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  role?: string | null;
  email: string;
  phone: string;
  address?: string | null;
  district?: string | null;
  province?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  mobileMoneyNumber?: string | null;
  nextOfKinName?: string | null;
}

const text = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());

/**
 * Surname and first names, Zambian convention: the last word is the surname.
 * A single-word name is treated as the surname, since that is the one the
 * society files under.
 */
export function splitName(fullName: string): { surname: string; firstName: string } {
  const parts = text(fullName).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { surname: "", firstName: "" };
  if (parts.length === 1) return { surname: parts[0], firstName: "" };
  return { surname: parts[parts.length - 1], firstName: parts.slice(0, -1).join(" ") };
}

/**
 * The district and the province, as an address writes them.
 *
 * A Zambian district can carry its province's name — Lusaka district sits in
 * Lusaka province — and joining the two blindly addressed those members in
 * "Lusaka, Lusaka". Written out once, the way it would be on an envelope.
 */
export function districtProvince(district?: string | null, province?: string | null): string {
  const d = text(district);
  const p = text(province);
  if (d && p && d.toLowerCase() === p.toLowerCase()) return d;
  return [d, p].filter(Boolean).join(", ");
}

/** The member's address as the forms want it — street, area, town on one line. */
export function addressLine(m: MemberLikeAccount): string {
  return [text(m.address), districtProvince(m.district, m.province)].filter(Boolean).join(", ");
}

/**
 * The successor's address.
 *
 * The account names a next of kin but holds no address for them, and the form
 * gives the successor a name rule with four address rules under it. Filling the
 * name alone left a name standing over four empty lines on every form issued.
 * The member's own address is the best answer available — a next of kin is
 * usually of the same household — and like every other prefilled answer it is
 * there to be corrected, not asserted. Nothing is offered when no next of kin
 * was named, so the block stays wholly empty rather than half filled.
 */
function successorAddressFor(m: MemberLikeAccount): string {
  return text(m.nextOfKinName) ? addressLine(m) : "";
}

/** How the member described themselves at sign-up, as a form capacity. */
function capacitiesFrom(role: string): string[] {
  const r = text(role);
  return r ? [r] : [];
}

/**
 * The answers the account can give for this form type. Keys not present here
 * are simply asked for; the point is that the ones here are never asked twice.
 */
export function prefillFromAccount(
  member: MemberLikeAccount,
  formType: ApplicationFormType,
): Record<string, unknown> {
  const { surname, firstName } = splitName(member.fullName);

  if (formType === "Group") {
    // The account belongs to whoever registered the group, so their name is the
    // representative's and the account's name is the group's.
    return strip({
      country: "Zambia",
      groupName: text(member.fullName),
      repName: text(member.fullName),
      passportOrIdNumber: text(member.nrcOrPassport),
      cell: text(member.phone),
      homeEmail: text(member.email),
      homeAddress: addressLine(member),
      regionOrCity: text(member.district) || text(member.province),
      bankAccount: [text(member.bankName), text(member.bankAccount)].filter(Boolean).join(" — "),
      mobileMoneyNumber: text(member.mobileMoneyNumber),
    });
  }

  if (formType === "Publisher") {
    return strip({
      country: "Zambia",
      corporateName: text(member.fullName),
      cell: text(member.phone),
      hqEmail: text(member.email),
      headquartersAddress: addressLine(member),
      regionOrCity: text(member.district) || text(member.province),
      bankAccount: [text(member.bankName), text(member.bankAccount)].filter(Boolean).join(" — "),
      mobileMoneyNumber: text(member.mobileMoneyNumber),
      successorName: text(member.nextOfKinName),
      successorAddress: successorAddressFor(member),
    });
  }

  return strip({
    surname,
    firstName,
    // The society is Zambian and its members overwhelmingly are; both stay
    // editable, and a member born elsewhere simply changes them.
    nationality: "Zambian",
    placeOfBirth: "Zambia",
    pseudonyms: text(member.stageName),
    nrcNumber: text(member.nrcOrPassport),
    dateOfBirth: text(member.dateOfBirth),
    sex: text(member.gender),
    cell: text(member.phone),
    email: text(member.email),
    resAddress: addressLine(member),
    bankAddress: text(member.bankName),
    accountNumber: text(member.bankAccount),
    mobileMoneyNumber: text(member.mobileMoneyNumber),
    successorName: text(member.nextOfKinName),
    successorAddress: successorAddressFor(member),
    capacities: capacitiesFrom(text(member.role)),
  });
}

/** Which form a member who signed up as this gets. */
export function formTypeForRole(role: string): ApplicationFormType {
  return text(role).toLowerCase() === "publisher" ? "Publisher" : "Individual";
}

function strip(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (Array.isArray(v) ? v.length : text(v)) out[k] = v;
  }
  return out;
}

/**
 * The account's answers under whatever the member has already put on the form.
 * Their own answer always wins — this only ever fills a gap.
 */
export function withPrefill(
  payload: Record<string, unknown>,
  member: MemberLikeAccount,
  formType: ApplicationFormType,
): Record<string, unknown> {
  const prefill = prefillFromAccount(member, formType);
  const merged: Record<string, unknown> = { ...prefill };
  for (const [k, v] of Object.entries(payload)) {
    if (Array.isArray(v) ? v.length : text(v)) merged[k] = v;
    else if (!(k in merged)) merged[k] = v;
  }
  return merged;
}

/** The keys the account answered, so the form can say where they came from. */
export function prefilledKeys(member: MemberLikeAccount, formType: ApplicationFormType): string[] {
  return Object.keys(prefillFromAccount(member, formType));
}
