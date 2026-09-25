import type { OwnershipSplit, UploadFile, WorkType } from "@/types";

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

/**
 * The upload holding one of a work's attachments, so a reviewer can open it.
 *
 * A work records each attachment's file NAME, not the upload's id — the member
 * picks a file and the row stores what they attached — so the way back is the
 * owner plus that name. Within one member's uploads a name is specific enough:
 * the same person does not lodge two different files under one filename.
 *
 * `linkedTo` is the fallback. It holds the title the work had when the file
 * went up, which still finds the attachment if the member renamed the file
 * after attaching it. It is second because a title can be edited too, and two
 * works can briefly share one.
 *
 * Uploads with no stored binary are skipped, and that is not a detail. A work
 * creates a second, empty row for its studio receipt alongside the real one
 * the upload widget already wrote, so matching on the name alone finds a row
 * with nothing behind it about half the time. A reviewer given a link that
 * downloads nothing is worse off than one told the file is missing.
 */
export function uploadFor(
  work: { ownerId: string; title: string },
  uploads: UploadFile[],
  fileType: UploadFile["fileType"],
  fileName?: string,
  linkedTo?: string,
): UploadFile | undefined {
  const mine = uploads.filter(
    (u) => u.ownerId === work.ownerId && u.fileType === fileType && u.hasFile,
  );
  const name = (fileName || "").trim();
  if (name) {
    const byName = mine.find((u) => u.fileName === name);
    if (byName) return byName;
  }
  const tag = (linkedTo || work.title).trim();
  return tag ? mine.find((u) => (u.linkedTo || "").trim() === tag) : undefined;
}

/** The recording, so a reviewer can hear a work before accepting it. */
export function audioUploadFor(
  work: { ownerId: string; title: string; audioFile?: string },
  uploads: UploadFile[],
): UploadFile | undefined {
  return uploadFor(work, uploads, "Audio", work.audioFile);
}

/** Every document lodged with a work: the studio letter, then each party's
 *  affirmation letter, named by the party who is vouched for. */
export function workDocumentsFor(
  work: {
    ownerId: string;
    title: string;
    studioReceipt?: string;
    ownershipSplits?: { party?: string; affirmationLetter?: string }[];
  },
  uploads: UploadFile[],
): { label: string; fileName: string; upload?: UploadFile }[] {
  const out: { label: string; fileName: string; upload?: UploadFile }[] = [];

  const receipt = (work.studioReceipt || "").trim();
  if (receipt) {
    out.push({
      label: "Studio letter",
      fileName: receipt,
      upload: uploadFor(work, uploads, "Document", receipt, `${work.title} — studio receipt`),
    });
  }

  for (const s of work.ownershipSplits ?? []) {
    const letter = (s.affirmationLetter || "").trim();
    if (!letter) continue;
    out.push({
      label: `Affirmation — ${(s.party || "party").trim()}`,
      fileName: letter,
      upload: uploadFor(work, uploads, "Document", letter),
    });
  }

  return out;
}
