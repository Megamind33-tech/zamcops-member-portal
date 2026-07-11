import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { supportTicketDTO } from "@/lib/serialize";

export const runtime = "nodejs";

const TOPICS = [
  "Membership",
  "Work declarations",
  "Submissions & uploads",
  "Royalties & payouts",
  "Account & login",
  "Password reset",
];

// The member's own help-desk queries, newest first.
export async function GET() {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const tickets = await prisma.supportTicket.findMany({
    where: { ownerId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return json({ tickets: tickets.map(supportTicketDTO) });
}

// Files a new help-desk query for the ZAMCOPS staff Support Inbox.
export async function POST(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  if (!b?.message?.trim()) return bad("Describe your question or issue.");
  const topic = TOPICS.includes(b.topic) ? b.topic : "Membership";

  const ticket = await prisma.supportTicket.create({
    data: {
      ownerId: session.sub,
      topic,
      message: String(b.message).trim().slice(0, 4000),
    },
  });

  return json({ ticket: supportTicketDTO(ticket) }, 201);
}
