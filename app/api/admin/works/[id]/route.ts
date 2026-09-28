import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { normalizeContributorRole } from "@/lib/roles";
import { namesFromSplits, splitColumnErrors } from "@/lib/works";
import type { OwnershipSplit } from "@/types";

export const runtime = "nodejs";

// Staff complete the WORK DECLARATION's distribution key — the shares the
// office finalises once a work is entered on the register — and assign the
// file number and factor the paper form gives those same boxes. This does not
// touch identity evidence (NRC, affirmation letters): that was settled when
// the member declared the work, and correcting a share here is not the same
// as accepting a new, unverified contributor.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");

  const work = await prisma.workDeclaration.findUnique({ where: { id } });
  if (!work) return bad("Work not found.", 404);

  const data: { ownershipSplits?: string; composers?: string; authors?: string; subArrangers?: string; publisher?: string; fileNo?: string; factor?: string } = {};

  if (b.ownershipSplits !== undefined) {
    if (!Array.isArray(b.ownershipSplits)) return bad("Ownership splits must be a list.");
    const splits: OwnershipSplit[] = b.ownershipSplits.map((s: OwnershipSplit) => ({
      ...s,
      role: normalizeContributorRole(String(s.role || "Composer")),
      performancePct: Number(s.performancePct) || 0,
      recordingPct: Number(s.recordingPct) || 0,
    }));
    const errors = splitColumnErrors(splits);
    if (errors.length) return bad(errors[0]);

    const names = namesFromSplits(splits);
    data.ownershipSplits = JSON.stringify(splits);
    data.composers = JSON.stringify(names.composers);
    data.authors = JSON.stringify(names.authors);
    data.subArrangers = JSON.stringify(names.arrangers);
    data.publisher = names.publisher;
  }

  if (b.fileNo !== undefined) data.fileNo = String(b.fileNo).trim().slice(0, 40);
  if (b.factor !== undefined) data.factor = String(b.factor).trim().slice(0, 40);

  if (Object.keys(data).length === 0) return bad("Nothing to update.");

  const updated = await prisma.workDeclaration.update({ where: { id }, data });

  await logAudit(session.sub, "work.splits-updated", {
    targetType: "Work declaration",
    targetId: id,
    summary: `Updated ownership shares${data.fileNo !== undefined || data.factor !== undefined ? " and register particulars" : ""} for “${updated.title}”`,
  });

  return json({ ok: true });
}
