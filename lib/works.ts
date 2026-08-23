import type { OwnershipSplit, WorkType } from "@/types";

export const WORK_TYPES = ["Song", "Instrumental", "Arrangement"] as const;

export function normalizeWorkType(value: unknown): WorkType {
  if (value === "Instrumental" || value === "Arrangement" || value === "Song") return value;
  return "Song";
}

export function splitsTotal(splits: { percentage?: number }[]): number {
  return splits.reduce((sum, x) => sum + (Number(x.percentage) || 0), 0);
}

export function splitsTotalOk(splits: { percentage?: number }[]): boolean {
  return splits.length > 0 && Math.abs(splitsTotal(splits) - 100) < 0.51;
}

function namesMatch(a?: string, b?: string): boolean {
  const x = (a || "").trim().toLowerCase();
  const y = (b || "").trim().toLowerCase();
  return !!x && !!y && x === y;
}

export function isKnownOnFile(
  split: OwnershipSplit,
  owner?: { fullName?: string; memberNumber?: string },
): boolean {
  if (split.knownMember || split.memberId || (split.memberNumber || "").trim()) return true;
  if (owner?.fullName && namesMatch(split.party, owner.fullName)) return true;
  if (owner?.memberNumber && namesMatch(split.memberNumber, owner.memberNumber)) return true;
  return false;
}

export function contributorGaps(
  splits: OwnershipSplit[],
  owner?: { fullName?: string; memberNumber?: string },
): string[] {
  const errors: string[] = [];
  if (!splits.length) return ["Add at least one creator and their share."];
  for (const s of splits) {
    const name = (s.party || "").trim() || "A creator";
    if (!(s.party || "").trim()) errors.push("Every creator needs a name.");
    if (isKnownOnFile(s, owner)) continue;
    if (!(s.nrc || "").trim()) {
      errors.push(`${name}: enter their ZAMCOPS member number, or their NRC if they are not a member.`);
    }
    if (!(s.affirmationLetter || "").trim()) {
      errors.push(`${name}: upload a letter affirming they wrote, composed, arranged or otherwise created this work.`);
    }
  }
  return [...new Set(errors)];
}

export function namesFromSplits(splits: OwnershipSplit[]) {
  const of = (role: string) =>
    splits.filter((s) => String(s.role) === role && s.party.trim()).map((s) => s.party.trim());
  return {
    composers: of("Composer"),
    authors: of("Author"),
    arrangers: of("Arranger"),
    publisher: of("Publisher")[0] || "",
  };
}
