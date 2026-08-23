import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { notifyMember } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

// Staff-composed in-app notices to one member, every active member, or the
// whole register. Always writes the in-app notification (email/SMS follow the
// member's preferences via notifyMember).
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  const title = String(b.title ?? "").trim();
  const message = String(b.message ?? "").trim();
  const href = String(b.href ?? "").trim();
  if (title.length < 3) return bad("Add a title.");
  if (message.length < 8) return bad("Write a longer message.");

  const audience = b.audience === "active" || b.audience === "all" ? b.audience : "one";
  let memberIds: string[] = [];

  if (audience === "one") {
    if (!b.memberId) return bad("Choose a member.");
    const member = await prisma.member.findUnique({ where: { id: String(b.memberId) } });
    if (!member) return bad("Member not found.", 404);
    memberIds = [member.id];
  } else if (audience === "active") {
    const rows = await prisma.member.findMany({
      where: { membershipStatus: "Active" },
      select: { id: true },
    });
    memberIds = rows.map((r) => r.id);
  } else {
    const rows = await prisma.member.findMany({ select: { id: true } });
    memberIds = rows.map((r) => r.id);
  }

  await Promise.all(
    memberIds.map((id) =>
      notifyMember(id, {
        title,
        body: message,
        type: "action",
        href,
      }),
    ),
  );

  await logAudit(session.sub, "notice.send", {
    targetType: "Member",
    targetId: audience === "one" ? memberIds[0] ?? "" : "",
    summary: `Sent “${title}” to ${memberIds.length} member${memberIds.length === 1 ? "" : "s"} (${audience})`,
  });

  return json({ ok: true, sent: memberIds.length });
}
