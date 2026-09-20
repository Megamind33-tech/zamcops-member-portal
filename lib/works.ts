import type { OwnershipSplit, WorkType } from "@/types";

export const WORK_TYPES = ["Song", "Instrumental", "Arrangement"] as const;

export function normalizeWorkType(value: unknown): WorkType {
  if (value === "Instrumental" || value === "Arrangement" || value === "Song") return value;
  return "Song";
}

// The WORK DECLARATION's distribution key has two columns, and each is its own
// 100% to account for. A share in performance does not imply the same share in
// recording, so they are totalled and validated separately.
export type SplitColumn = "performancePct" | "recordingPct";

export interface SplitShares {
  performancePct?: number;
  recordingPct?: number;
  percentage?: number; // legacy single figure
}

// A row declared before the split into two columns carries only `percentage`.
// Reading it as the same share in both columns preserves what it meant.
export function shareOf(split: SplitShares, column: SplitColumn): number {
  const v = split[column];
  if (v !== undefined && v !== null) return Number(v) || 0;
  return Number(split.percentage) || 0;
}

export function splitsTotal(splits: SplitShares[], column: SplitColumn = "performancePct"): number {
  return splits.reduce((sum, x) => sum + shareOf(x, column), 0);
}

const totals100 = (n: number) => Math.abs(n - 100) < 0.51;

export function splitsTotalOk(splits: SplitShares[]): boolean {
  return (
    splits.length > 0 &&
    totals100(splitsTotal(splits, "performancePct")) &&
    totals100(splitsTotal(splits, "recordingPct"))
  );
}

// Which columns do not add up, named for a message the member can act on.
export function splitColumnErrors(splits: SplitShares[]): string[] {
  if (splits.length === 0) return ["Add at least one creator and their shares."];
  const errs: string[] = [];
  for (const [col, label] of [
    ["performancePct", "Performance"],
    ["recordingPct", "Recording"],
  ] as [SplitColumn, string][]) {
    const t = splitsTotal(splits, col);
    if (!totals100(t)) errs.push(`${label} shares total ${Math.round(t * 100) / 100}% — they must total 100%.`);
  }
  return errs;
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

export type RegisterHit = { id: string; fullName: string; memberNumber: string };

/** Trust the register, not the browser — a typed-in member number or name only counts if it matches a row. */
export function applyKnownMembers(
  splits: OwnershipSplit[],
  owner: { fullName?: string; memberNumber?: string } | undefined,
  register: RegisterHit[],
): OwnershipSplit[] {
  const byId = new Map(register.map((m) => [m.id, m]));
  const byNum = new Map(register.map((m) => [m.memberNumber.trim().toLowerCase(), m]));
  const byName = new Map(register.map((m) => [m.fullName.trim().toLowerCase(), m]));

  return splits.map((s) => {
    const ownerMatch = !!(owner?.fullName && namesMatch(s.party, owner.fullName));
    const hit =
      (s.memberId && byId.get(s.memberId)) ||
      (s.memberNumber && byNum.get(s.memberNumber.trim().toLowerCase())) ||
      (s.party && byName.get(s.party.trim().toLowerCase())) ||
      undefined;

    if (ownerMatch || hit) {
      return {
        ...s,
        knownMember: true,
        memberId: hit?.id,
        memberNumber: hit?.memberNumber || owner?.memberNumber,
      };
    }
    return { ...s, knownMember: false, memberId: undefined, memberNumber: "" };
  });
}
