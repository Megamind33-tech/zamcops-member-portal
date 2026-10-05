import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { notifyMember } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

// Opens a new (draft) distribution period that entries can be added to.
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b?.periodLabel?.trim()) return bad("Give the distribution period a label.");

  const distribution = await prisma.distribution.create({
    data: { periodLabel: b.periodLabel.trim(), notes: b.notes ?? "" },
  });

  await logAudit(session.sub, "distribution.created", {
    targetType: "Distribution",
    targetId: distribution.id,
    summary: `Opened distribution period “${distribution.periodLabel}”`,
  });

  return json({ distribution }, 201);
}

// Publishes (or reverts) a distribution — this is the visibility gate that
// reveals confirmed payouts to members. Publishing notifies every member with an entry.
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b?.id) return bad("Invalid distribution payload.");

  // Edit the run's particulars (label, notes, dates) without touching its status.
  if (b.status === undefined) {
    const data: { periodLabel?: string; notes?: string; code?: string; startDate?: string; endDate?: string; deadline?: string } = {};
    if (b.periodLabel !== undefined) {
      const label = String(b.periodLabel).trim();
      if (!label) return bad("The period needs a label.");
      data.periodLabel = label.slice(0, 120);
    }
    if (b.notes !== undefined) data.notes = String(b.notes).slice(0, 4000);
    if (b.code !== undefined) data.code = String(b.code).trim().slice(0, 40);
    if (b.startDate !== undefined) data.startDate = String(b.startDate).trim().slice(0, 20);
    if (b.endDate !== undefined) data.endDate = String(b.endDate).trim().slice(0, 20);
    if (b.deadline !== undefined) data.deadline = String(b.deadline).trim().slice(0, 20);
    if (Object.keys(data).length === 0) return bad("Nothing to update.");
    const updated = await prisma.distribution.update({ where: { id: b.id }, data });
    await logAudit(session.sub, "distribution.updated", {
      targetType: "Distribution",
      targetId: updated.id,
      summary: `Edited distribution “${updated.periodLabel}”`,
    });
    return json({ ok: true });
  }

  if (!["Draft", "Published"].includes(b.status)) return bad("Invalid distribution payload.");

  const distribution = await prisma.distribution.update({
    where: { id: b.id },
    data: { status: b.status, publishedAt: b.status === "Published" ? new Date() : null },
    include: { entries: true },
  });

  if (b.status === "Published") {
    await Promise.all(
      distribution.entries.map((e) =>
        notifyMember(e.ownerId, {
          title: "Royalties distributed",
          body: `Your confirmed payout for ${distribution.periodLabel} is now available to view in the member portal.`,
          type: "success",
          category: "royalty",
          href: "/royalties",
          sms: `Your confirmed royalty payout for ${distribution.periodLabel} is now available in the ZAMCOPS member portal.`,
        })
      )
    );
  }

  await logAudit(session.sub, `distribution.${b.status.toLowerCase()}`, {
    targetType: "Distribution",
    targetId: distribution.id,
    summary: `Distribution “${distribution.periodLabel}” → ${b.status} (${distribution.entries.length} entries)`,
  });

  return json({ ok: true });
}
