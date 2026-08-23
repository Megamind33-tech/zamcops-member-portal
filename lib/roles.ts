// ZAMCOPS mandate language — the single source of truth for who the society
// registers and which roles appear on a work declaration.
//
// Membership (who may join): composers, authors and publishers.
// Declaration (who is credited on a work): composers, authors, sub-authors,
// arrangers, sub-arrangers and publishers. No other categories.

export const MEMBER_ROLES = ["Composer", "Author", "Publisher"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const CONTRIBUTOR_ROLES = [
  "Composer",
  "Author",
  "Sub-author",
  "Arranger",
  "Sub-arranger",
  "Publisher",
] as const;
export type ContributorRole = (typeof CONTRIBUTOR_ROLES)[number];

const LEGACY_ROLE: Record<string, ContributorRole> = {
  "Author/Lyricist": "Author",
  Lyricist: "Author",
  "Sub-Author": "Sub-author",
  "Sub-Arranger": "Sub-arranger",
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
