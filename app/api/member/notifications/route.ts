import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";

// Marks one notification (by id) or all of the member's notifications as read.
export async function PATCH(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => ({}));
  if (b.all) {
    await prisma.notification.updateMany({ where: { ownerId: session.sub }, data: { read: true } });
  } else if (b.id) {
    await prisma.notification.updateMany({
      where: { id: b.id, ownerId: session.sub },
      data: { read: true },
    });
  } else {
    return bad("Provide a notification id or all:true.");
  }
  return json({ ok: true });
}
