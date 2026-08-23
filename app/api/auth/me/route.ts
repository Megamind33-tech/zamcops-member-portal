import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { json } from "@/lib/server";
import { memberDTO } from "@/lib/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return json({ authenticated: false, role: null });

  if (session.role === "admin") {
    const admin = await prisma.adminUser.findUnique({ where: { id: session.sub } });
    if (!admin) return json({ authenticated: false, role: null });
    return json({ authenticated: true, role: "admin", admin: { id: admin.id, email: admin.email, name: admin.name } });
  }

  const member = await prisma.member.findUnique({ where: { id: session.sub } });
  if (!member) return json({ authenticated: false, role: null });
  return json({ authenticated: true, role: "member", member: memberDTO(member) });
}
