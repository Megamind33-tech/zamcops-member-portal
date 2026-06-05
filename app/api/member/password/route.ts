import { prisma } from "@/lib/db";
import { requireMember, verifyPassword, hashPassword } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  const { current, next } = b;
  if (!current || !next) return bad("Provide your current and new password.");
  if (String(next).length < 6) return bad("New password must be at least 6 characters.");

  const member = await prisma.member.findUnique({ where: { id: session.sub } });
  if (!member || !(await verifyPassword(current, member.passwordHash))) {
    return bad("Current password is incorrect.", 401);
  }

  await prisma.member.update({
    where: { id: session.sub },
    data: { passwordHash: await hashPassword(next) },
  });
  return json({ ok: true });
}
