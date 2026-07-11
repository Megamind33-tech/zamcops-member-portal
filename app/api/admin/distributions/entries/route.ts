import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

// Creates or updates a member's confirmed payout within a distribution period.
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b?.distributionId || !b?.ownerId) return bad("Missing distribution or member.");
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount < 0) return bad("Enter a valid amount.");

  const entry = await prisma.distributionEntry.upsert({
    where: { distributionId_ownerId: { distributionId: b.distributionId, ownerId: b.ownerId } },
    update: { amount, currency: b.currency || "ZMW" },
    create: { distributionId: b.distributionId, ownerId: b.ownerId, amount, currency: b.currency || "ZMW" },
  });

  await logAudit(session.sub, "distribution.entry-saved", {
    targetType: "DistributionEntry",
    targetId: entry.id,
    summary: `Set payout of ${entry.currency} ${amount.toFixed(2)} for member ${b.ownerId}`,
  });

  return json({ entry });
}

// Removes a member's entry from a distribution period.
export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b?.id) return bad("Missing entry id.");

  const removed = await prisma.distributionEntry.delete({ where: { id: b.id } });

  await logAudit(session.sub, "distribution.entry-removed", {
    targetType: "DistributionEntry",
    targetId: removed.id,
    summary: `Removed payout entry for member ${removed.ownerId}`,
  });

  return json({ ok: true });
}
