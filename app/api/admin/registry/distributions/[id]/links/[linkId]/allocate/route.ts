import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { allocateLink } from "@/lib/poolAllocation";

export const runtime = "nodejs";
export const maxDuration = 120;

// Run the allocation for one pool link: its amount is shared across its works
// (by weight) and each work's part across the right-holders holding the pool's
// right type (by share). Re-running replaces the lines the link produced before.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id, linkId } = await params;
  const link = await prisma.distributionPoolLink.findFirst({ where: { id: linkId, distributionId: id }, include: { pool: { select: { code: true } } } });
  if (!link) return bad("Pool link not found.", 404);

  try {
    const r = await allocateLink(linkId);
    await logAudit(session.sub, "distribution.link-allocated", {
      targetType: "Distribution",
      targetId: id,
      summary: `Allocated ${[link.pool?.code, link.subClass].filter(Boolean).join(" · ") || "pool link"}: ZMW ${r.amount.toFixed(2)} across ${r.works.toLocaleString()} works`,
      changes: [{ field: "Allocation", from: link.status, to: `${r.lines.toLocaleString()} lines, ZMW ${r.amount.toFixed(2)}${r.reserved ? `, ZMW ${r.reserved.toFixed(2)} reserved` : ""}` }],
    });
    return json(r);
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not allocate.");
  }
}
