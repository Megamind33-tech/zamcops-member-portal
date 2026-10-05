import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { memberFieldsFromHolder } from "@/lib/invites";

export const runtime = "nodejs";

// Link a register entry to a portal member by hand ({ memberId }), or undo it
// ({ unlink: true }). Linking carries the society's details onto the member the
// same way the import does — IPI numbers, NRC, address and so on — where the
// register has a value. Unlinking does not take them back off.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");

  const holder = await prisma.rightHolder.findUnique({ where: { id }, include: { addresses: true } });
  if (!holder) return bad("Right-holder not found.", 404);

  if (b.unlink === true) {
    if (!holder.memberId) return json({ ok: true });
    await prisma.rightHolder.update({ where: { id }, data: { memberId: null, matchedBy: "" } });
    await logAudit(session.sub, "register.unlink", { targetType: "RightHolder", targetId: id, summary: `Unlinked from member ${holder.memberId}` });
    return json({ ok: true });
  }

  const memberId = typeof b.memberId === "string" ? b.memberId : "";
  if (!memberId) return bad("Choose a member to link.");
  if (holder.memberId && holder.memberId !== memberId) return bad("This register entry is already linked to a different member — unlink it first.", 409);

  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true, memberNumber: true } });
  if (!member) return bad("Member not found.", 404);
  const other = await prisma.rightHolder.findFirst({ where: { memberId, NOT: { id } }, select: { displayName: true } });
  if (other) return bad(`${member.memberNumber} is already linked to ${other.displayName} on the register — unlink that first.`, 409);

  await prisma.$transaction([
    prisma.rightHolder.update({
      where: { id },
      data: { memberId, matchedBy: "manual", inviteTokenHash: "", inviteExpiresAt: null },
    }),
    prisma.member.update({ where: { id: memberId }, data: memberFieldsFromHolder(holder) }),
  ]);
  await logAudit(session.sub, "register.link", { targetType: "RightHolder", targetId: id, summary: `Linked to member ${member.memberNumber}` });
  return json({ ok: true });
}
