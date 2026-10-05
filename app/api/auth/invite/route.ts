import { json } from "@/lib/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { findInvite, inviteEmailFor } from "@/lib/invites";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// What the sign-up page needs to greet someone arriving from an invitation:
// whether the link still works, and the name and email to pre-fill. Nothing
// else about the record is exposed.
export async function GET(req: Request) {
  if (!rateLimit(`invite:${clientIp(req)}`, 30, 15 * 60_000)) {
    return json({ valid: false, error: "Too many attempts — please wait a while." }, 429);
  }
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const h = await findInvite(token);
  if (!h) return json({ valid: false });

  const contacts = await prisma.rightHolderContact.findMany({ where: { rightHolderId: h.id }, select: { email: true, value: true } });
  return json({
    valid: true,
    name: h.displayName,
    email: inviteEmailFor({ inviteEmail: h.inviteEmail, contacts }),
    nrc: h.nrc,
    ipiNumber: h.ipiNumber,
  });
}
