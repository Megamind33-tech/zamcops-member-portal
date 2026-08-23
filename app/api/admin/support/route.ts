import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { supportTicketDTO } from "@/lib/serialize";
import { notifyMember } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { appendThread, serializeThread, threadOf } from "@/lib/support";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const tickets = await prisma.supportTicket.findMany({ orderBy: { createdAt: "desc" } });
  return json({ tickets: tickets.map(supportTicketDTO) });
}

// Staff reply, resolve, or reopen a ticket. Every written reply is appended to
// the thread and pushed to the member as an in-app notice (when the ticket is
// linked to an account). Closing without a reply still notifies the member.
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b?.id) return bad("A ticket id is required.");
  const status = b.status === "Resolved" ? "Resolved" : "Open";
  const replyText = typeof b.reply === "string" ? b.reply.trim().slice(0, 4000) : "";

  const existing = await prisma.supportTicket.findUnique({ where: { id: b.id } });
  if (!existing) return bad("Ticket not found.", 404);

  const data: Record<string, unknown> = {
    status,
    resolvedAt: status === "Resolved" ? new Date() : null,
  };
  if (replyText) {
    data.reply = replyText;
    data.thread = serializeThread(appendThread(threadOf(existing), "staff", replyText));
  }

  const ticket = await prisma.supportTicket.update({ where: { id: b.id }, data });

  if (ticket.ownerId && (replyText || status === "Resolved")) {
    const closed = status === "Resolved";
    await notifyMember(ticket.ownerId, {
      title: closed ? "Support ticket closed" : "New reply from ZAMCOPS",
      body: replyText
        ? closed
          ? `Your “${ticket.topic}” conversation was closed. ZAMCOPS: ${replyText}`
          : `Staff replied on your “${ticket.topic}” conversation: ${replyText}`
        : `Your “${ticket.topic}” support query has been resolved.`,
      type: "info",
      href: "/support",
    });
  }

  await logAudit(session.sub, `support.${status.toLowerCase()}`, {
    targetType: "SupportTicket",
    targetId: ticket.id,
    summary: `Ticket “${ticket.topic}” → ${status}${replyText ? " (replied)" : ""}`,
  });

  return json({ ticket: supportTicketDTO(ticket) });
}
