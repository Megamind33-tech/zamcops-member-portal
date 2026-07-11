import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { memberDTO } from "@/lib/serialize";
import { notifyMember } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const STATUSES = ["Pending", "Active", "Suspended", "Lapsed", "Rejected"];

// Member-facing notification copy per membership decision.
const NOTICE: Record<string, { title: string; body: string; type: string }> = {
  Active: {
    title: "Membership approved",
    body: "Welcome aboard — your ZAMCOPS membership has been approved and is now active.",
    type: "success",
  },
  Rejected: {
    title: "Membership application declined",
    body: "Your ZAMCOPS membership application was not approved. Please contact support for details.",
    type: "warning",
  },
  Suspended: {
    title: "Membership suspended",
    body: "Your ZAMCOPS membership has been suspended. Please contact support.",
    type: "warning",
  },
  Lapsed: {
    title: "Membership lapsed",
    body: "Your ZAMCOPS membership has lapsed. Renew to restore full access.",
    type: "warning",
  },
};

// Admin sets a member's membership status (approve / reject / suspend / etc.)
// and notifies the member of the decision.
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  const { id, status } = b;
  if (!id || !STATUSES.includes(status)) return bad("Invalid member status payload.");

  const member = await prisma.member.update({
    where: { id },
    data: { membershipStatus: status },
  });

  const notice = NOTICE[status];
  if (notice) {
    await notifyMember(id, {
      title: notice.title,
      body: notice.body,
      type: notice.type as "success" | "warning",
    });
  }

  await logAudit(session.sub, "member.status", {
    targetType: "Member",
    targetId: id,
    summary: `${member.fullName} (${member.memberNumber}) → ${status}`,
  });

  return json({ member: memberDTO(member) });
}
