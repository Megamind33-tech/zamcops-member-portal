// ZAMCOPS mandate — the single source of truth for who the society registers
// and who may take a share on a work.
//
// Membership (who may join): composers, authors and publishers of musical
// works. ZAMCOPS administers authors' rights (performing and mechanical),
// not related rights (performers, producers, featured artists).
//
// Shares on a work: composers, authors, publishers, and arrangers. An
// arranger is not a membership class; they receive a share where they
// contributed to the work.

export const MEMBER_ROLES = ["Composer", "Author", "Publisher"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const CONTRIBUTOR_ROLES = ["Composer", "Author", "Arranger", "Publisher"] as const;
export type ContributorRole = (typeof CONTRIBUTOR_ROLES)[number];

const LEGACY_ROLE: Record<string, ContributorRole> = {
  "Author/Lyricist": "Author",
  Lyricist: "Author",
  "Sub-author": "Author",
  "Sub-Author": "Author",
  "Sub-arranger": "Arranger",
  "Sub-Arranger": "Arranger",
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
