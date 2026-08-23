import { prisma } from "@/lib/db";
import { verifyPassword, jsonWithSession } from "@/lib/auth";
import { bad, normalizePhone } from "@/lib/server";
import { memberDTO } from "@/lib/serialize";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!rateLimit(`login:${clientIp(req)}`, 10, 5 * 60_000)) {
    return bad("Too many sign-in attempts — please wait a few minutes and try again.", 429);
  }

  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid request body.");

  const { identifier, password } = body;
  if (!identifier || !password) return bad("Enter your phone/email and password.");

  const id = String(identifier).trim();
  const phone = normalizePhone(id);
  const member = await prisma.member.findFirst({
    where: {
      OR: [
        { email: id.toLowerCase() },
        { phone },
        { phone: id },
        ...(phone !== id && phone.startsWith("+") ? [{ phone: phone.replace(/^\+/, "") }] : []),
      ],
    },
  });
  if (!member || !(await verifyPassword(password, member.passwordHash))) {
    return bad("Incorrect phone/email or password.", 401);
  }

  return jsonWithSession({ member: memberDTO(member) }, { sub: member.id, role: "member", email: member.email });
}
