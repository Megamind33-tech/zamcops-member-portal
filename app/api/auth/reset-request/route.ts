import { prisma } from "@/lib/db";
import { json, bad } from "@/lib/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Signed-out password-reset request. No email service is configured yet, so
// this files a "Password reset" ticket into the staff Support Inbox; staff
// verify the member and issue a temporary password from the member's detail
// page. Always responds ok so account existence can't be probed.
export async function POST(req: Request) {
  if (!rateLimit(`reset:${clientIp(req)}`, 5, 15 * 60_000)) {
    return bad("Too many reset requests — please wait a while and try again.", 429);
  }

  const b = await req.json().catch(() => null);
  const identifier = String(b?.identifier ?? "").trim();
  if (!identifier) return bad("Enter the phone or email on your membership.");

  const member = await prisma.member.findFirst({
    where: { OR: [{ email: identifier.toLowerCase() }, { phone: identifier }] },
  });

  await prisma.supportTicket.create({
    data: {
      ownerId: member?.id ?? null,
      contact: identifier.slice(0, 200),
      topic: "Password reset",
      message: `Password reset requested from the sign-in screen for “${identifier}”.`,
    },
  });

  return json({ ok: true });
}
