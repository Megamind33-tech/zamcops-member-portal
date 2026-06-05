import { prisma } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { memberDTO } from "@/lib/serialize";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid request body.");

  const { identifier, password } = body;
  if (!identifier || !password) return bad("Enter your phone/email and password.");

  const id = String(identifier).trim();
  const member = await prisma.member.findFirst({
    where: { OR: [{ email: id.toLowerCase() }, { phone: id }] },
  });
  if (!member || !(await verifyPassword(password, member.passwordHash))) {
    return bad("Incorrect phone/email or password.", 401);
  }

  await setSessionCookie({ sub: member.id, role: "member", email: member.email });
  return json({ member: memberDTO(member) });
}
