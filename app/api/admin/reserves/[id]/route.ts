import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit, diffFields } from "@/lib/audit";

export const runtime = "nodejs";

const STATUSES = ["Open", "In Distribution", "Prescribed", "Closed"];

// Move a reserve along its life: Open -> In Distribution (it is being paid out
// in a later run) -> Closed (paid or written off), or Prescribed (the claim
// period has lapsed). Closing or prescribing stamps the date; reopening clears it.
//   { status?, distributableAmount?, distributedAmount?, notes? }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Invalid request body.");
  const r = await prisma.reserve.findUnique({ where: { id }, include: { distribution: { select: { periodLabel: true } } } });
  if (!r) return bad("Reserve not found.", 404);

  const data: Record<string, string | number | Date | null> = {};
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) return bad("Unknown status.");
    data.status = b.status;
    data.closedAt = b.status === "Closed" || b.status === "Prescribed" ? new Date() : null;
  }
  for (const [k, label] of [["distributableAmount", "distributable"], ["distributedAmount", "distributed"]] as const) {
    if (b[k] === undefined) continue;
    const n = Number(b[k]);
    if (!Number.isFinite(n) || n < 0) return bad(`The ${label} amount must be zero or more.`);
    if (n > r.amount + 0.005) return bad(`The ${label} amount can't be more than the reserved ${r.amount.toFixed(2)}.`);
    data[k] = Math.round(n * 100) / 100;
  }
  if (b.notes !== undefined) data.notes = String(b.notes).slice(0, 1000);
  if (!Object.keys(data).length) return bad("Nothing to update.");

  await prisma.reserve.update({ where: { id }, data });
  await logAudit(session.sub, "reserve.updated", {
    targetType: "Distribution",
    targetId: r.distributionId,
    summary: `Updated ${r.reserveType.toLowerCase()} reserve of ZMW ${r.amount.toFixed(2)} in “${r.distribution.periodLabel}”`,
    changes: diffFields(r as unknown as Record<string, unknown>, data, { status: "Reserve status", distributableAmount: "Distributable amount", distributedAmount: "Distributed amount", notes: "Reserve notes" }).map((c) => ({ ...c, field: `${c.field} (${r.reserveType})` })),
  });
  return json({ ok: true });
}
