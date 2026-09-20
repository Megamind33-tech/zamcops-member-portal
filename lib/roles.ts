// ZAMCOPS mandate — the single source of truth for who the society registers
// and who may take a share on a work.
//
// Membership (who may join): composers, authors and publishers of musical
// works. ZAMCOPS administers authors' rights (performing and mechanical),
// not related rights (performers, producers, featured artists).
//
// Shares on a work: the seven roles on the society's WORK DECLARATION —
// composer, author, arranger, publisher and their sub- counterparts. Only
// composers, authors and publishers may join; the others receive a share
// where they contributed, without being a membership class.

export const MEMBER_ROLES = ["Composer", "Author", "Publisher"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

// The roles printed on the society's WORK DECLARATION, in the order and under
// the codes the form itself uses. Each one is a separate row on the
// distribution key, so a sub-author is not an author here: collapsing the two
// would put a share on the wrong line of the official document.
export const CONTRIBUTOR_ROLES = [
  "Composer",
  "Author",
  "Arranger",
  "Publisher",
  "Sub-author",
  "Sub-arranger",
  "Sub-publisher",
] as const;
export type ContributorRole = (typeof CONTRIBUTOR_ROLES)[number];

// The code beside each row on the paper form.
export const ROLE_CODE: Record<ContributorRole, string> = {
  Composer: "C",
  Author: "A",
  Arranger: "AR",
  Publisher: "E",
  "Sub-author": "SA",
  "Sub-arranger": "SR",
  "Sub-publisher": "SE",
};

const LEGACY_ROLE: Record<string, ContributorRole> = {
  "Author/Lyricist": "Author",
  Lyricist: "Author",
  "Sub-Author": "Sub-author",
  "Sub-Arranger": "Sub-arranger",
  "Sub-Publisher": "Sub-publisher",
  Producer: "Composer",
  Performer: "Composer",
};

export function isMemberRole(value: unknown): value is MemberRole {
  return typeof value === "string" && (MEMBER_ROLES as readonly string[]).includes(value);
}

export function isContributorRole(value: unknown): value is ContributorRole {
  return typeof value === "string" && (CONTRIBUTOR_ROLES as readonly string[]).includes(value);
}

export function normalizeContributorRole(role: string): ContributorRole {
  if (isContributorRole(role)) return role;
  return LEGACY_ROLE[role] ?? "Composer";
}

export const MANDATE_LINE =
  "ZAMCOPS registers composers, authors and publishers. Arrangers receive a share. Related rights are not administered here.";
