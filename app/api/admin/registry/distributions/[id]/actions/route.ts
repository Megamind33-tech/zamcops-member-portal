import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { lockReason } from "@/lib/distLock";
import { allocateLink } from "@/lib/poolAllocation";

export const runtime = "nodejs";
export const maxDuration = 300;

// Run-level actions on a distribution, like the buttons on a WIPO Connect run:
//   { action: "run-all" }  allocate every pool link that is not yet allocated
//   { action: "close" }    mark the run Done (every pool link must be allocated)
//   { action: "reopen" }   take it back out of Done
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const d = await prisma.distribution.findUnique({ where: { id }, select: { id: true, periodLabel: true, status: true, closedAt: true } });
  if (!d) return bad("Distribution not found.", 404);
  const b = await req.json().catch(() => null);

  if (b?.action === "run-all") {
    const locked = lockReason(d);
    if (locked) return bad(locked);
    const links = await prisma.distributionPoolLink.findMany({ where: { distributionId: id, status: { not: "Allocated" } }, orderBy: { seq: "asc" }, select: { id: true, seq: true, subClass: true, amount: true, _count: { select: { works: true } } } });
    if (links.length === 0) return bad("Every pool link is already allocated.");
    const done: { seq: number; subClass: string; ok: boolean; message: string }[] = [];
    for (const l of links) {
      if (!(l.amount > 0) || l._count.works === 0) {
        done.push({ seq: l.seq, subClass: l.subClass, ok: false, message: l._count.works === 0 ? "No works on the list" : "No amount" });
        continue;
      }
      try {
        const r = await allocateLink(l.id);
        done.push({ seq: l.seq, subClass: l.subClass, ok: true, message: `${r.lines.toLocaleString()} lines${r.reserved ? `, ${r.reserved.toFixed(2)} reserved` : ""}` });
      } catch (e) {
        done.push({ seq: l.seq, subClass: l.subClass, ok: false, message: e instanceof Error ? e.message : "Failed" });
      }
    }
    await logAudit(session.sub, "distribution.run-all", {
      targetType: "Distribution",
      targetId: id,
      summary: `Ran allocations for “${d.periodLabel}”: ${done.filter((x) => x.ok).length} done, ${done.filter((x) => !x.ok).length} skipped or failed`,
    });
    return json({ results: done });
  }

  if (b?.action === "close") {
    if (d.status === "Published") return bad("This distribution is published. Unpublish it first.");
    if (d.closedAt) return bad("This distribution is already closed.");
    const open = await prisma.distributionPoolLink.count({ where: { distributionId: id, status: { not: "Allocated" } } });
    if (open > 0) return bad(`${open} pool link${open === 1 ? " is" : "s are"} not allocated yet. Run them, or remove them, before closing.`);
    await prisma.distribution.update({ where: { id }, data: { closedAt: new Date() } });
    await logAudit(session.sub, "distribution.closed", { targetType: "Distribution", targetId: id, summary: `Closed “${d.periodLabel}”`, changes: [{ field: "Status", from: "To be Completed", to: "Done" }] });
    return json({ ok: true });
  }

  if (b?.action === "reopen") {
    if (!d.closedAt) return bad("This distribution is not closed.");
    await prisma.distribution.update({ where: { id }, data: { closedAt: null } });
    await logAudit(session.sub, "distribution.reopened", { targetType: "Distribution", targetId: id, summary: `Reopened “${d.periodLabel}”`, changes: [{ field: "Status", from: "Done", to: "To be Completed" }] });
    return json({ ok: true });
  }

  return bad("Unknown action.");
}
