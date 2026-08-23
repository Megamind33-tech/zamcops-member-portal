import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { supportTicketDTO } from "@/lib/serialize";
import { notifyMember } from "@/lib/notify";
import { SUPPORT_TOPICS, appendThread, serializeThread, threadOf } from "@/lib/support";

export const runtime = "nodejs";

const TOPICS = new Set<string>(SUPPORT_TOPICS);

// The member's own help-desk conversations, newest first.
export async function GET() {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const tickets = await prisma.supportTicket.findMany({
    where: { ownerId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return json({ tickets: tickets.map(supportTicketDTO) });
}

// Opens a new conversation, or appends a follow-up (reopening a closed ticket).
export async function POST(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  if (!b?.message?.trim()) return bad("Describe your question or issue.");
  const text = String(b.message).trim().slice(0, 4000);

  if (b.ticketId) {
    const existing = await prisma.supportTicket.findFirst({
      where: { id: String(b.ticketId), ownerId: session.sub },
    });
    if (!existing) return bad("Ticket not found.", 404);

    const ticket = await prisma.supportTicket.update({
      where: { id: existing.id },
      data: {
        thread: serializeThread(appendThread(threadOf(existing), "member", text)),
        message: text,
        status: "Open",
        resolvedAt: null,
      },
    });
    return json({ ticket: supportTicketDTO(ticket) });
  }

  const topic = TOPICS.has(b.topic) ? String(b.topic) : "Membership";
  const ticket = await prisma.supportTicket.create({
    data: {
      ownerId: session.sub,
      topic,
      message: text,
      thread: serializeThread(appendThread([], "member", text)),
    },
  });

  await notifyMember(session.sub, {
    title: "Support request received",
    body: `We have your ${topic} enquiry. A staff member will reply in this conversation.`,
    type: "info",
    href: "/support",
  });

  return json({ ticket: supportTicketDTO(ticket) }, 201);
}
