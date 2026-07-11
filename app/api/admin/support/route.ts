import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { supportTicketDTO } from "@/lib/serialize";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const tickets = await prisma.supportTicket.findMany({ orderBy: { createdAt: "desc" } });
  return json({ tickets: tickets.map(supportTicketDTO) });
}

// Staff reply to / resolve / reopen a ticket. A reply is pushed to the member
// as a notification (when the ticket is linked to an account).
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b?.id) return bad("A ticket id is required.");
  const status = b.status === "Resolved" ? "Resolved" : "Open";

  const data: Record<string, unknown> = { status, resolvedAt: status === "Resolved" ? new Date() : null };
  if (typeof b.reply === "string") data.reply = b.reply.trim().slice(0, 4000);

  const ticket = await prisma.supportTicket.update({ where: { id: b.id }, data });

  if (ticket.ownerId && status === "Resolved") {
    await prisma.notification.create({
      data: {
        ownerId: ticket.ownerId,
        title: "Support query answered",
        body: ticket.reply
          ? `ZAMCOPS support replied to your “${ticket.topic}” query: ${ticket.reply}`
          : `Your “${ticket.topic}” support query has been resolved.`,
        type: "info",
      },
    });
  }

  return json({ ticket: supportTicketDTO(ticket) });
}
