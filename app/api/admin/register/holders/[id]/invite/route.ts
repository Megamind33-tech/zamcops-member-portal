import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { sendInvite, validEmail } from "@/lib/invites";

export const runtime = "nodejs";

// Save the invite email for a right-holder ({ email }), and/or send the invite
// ({ send: true }). An empty email clears it.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");

  if (typeof b.email === "string") {
    const email = b.email.trim().toLowerCase();
    if (email && !validEmail(email)) return bad("That does not look like an email address.");
    const upd = await prisma.rightHolder.updateMany({ where: { id }, data: { inviteEmail: email } });
    if (!upd.count) return bad("Right-holder not found.", 404);
    await logAudit(session.sub, "register.email", { targetType: "RightHolder", targetId: id, summary: email ? "Invite email saved" : "Invite email cleared" });
  }

  if (b.send) {
    const r = await sendInvite(id);
    if (!r.ok) return bad(r.error, 400);
    await logAudit(session.sub, "register.invite", { targetType: "RightHolder", targetId: id, summary: `Invite sent to ${r.sentTo}` });
    return json({ ok: true, sentTo: r.sentTo });
  }
  return json({ ok: true });
}
