import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";

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
  return json({ distribution }, 201);
}

// Publishes (or reverts) a distribution — this is the visibility gate that
// reveals confirmed payouts to members. Publishing notifies every member with an entry.
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b?.id || !["Draft", "Published"].includes(b.status)) return bad("Invalid distribution payload.");

  const distribution = await prisma.distribution.update({
    where: { id: b.id },
    data: { status: b.status, publishedAt: b.status === "Published" ? new Date() : null },
    include: { entries: true },
  });

  if (b.status === "Published") {
    await Promise.all(
      distribution.entries.map((e) =>
        prisma.notification.create({
          data: {
            ownerId: e.ownerId,
            title: "Royalties distributed",
            body: `Your confirmed payout for ${distribution.periodLabel} is now available to view.`,
            type: "success",
          },
        })
      )
    );
  }

  return json({ ok: true });
}
