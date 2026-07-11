import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

// Staff accounts, newest first (password hashes never leave the server).
export async function GET() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const admins = await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  return json({ admins, me: session.sub });
}

// Creates a named staff account.
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  if (!name || !email) return bad("Name and email are required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad("Enter a valid email address.");
  if (password.length < 8) return bad("Password must be at least 8 characters.");

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return bad("A staff account with that email already exists.", 409);

  const admin = await prisma.adminUser.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });

  await logAudit(session.sub, "staff.created", {
    targetType: "AdminUser",
    targetId: admin.id,
    summary: `Created staff account ${name} <${email}>`,
  });

  return json({ admin: { id: admin.id, name: admin.name, email: admin.email, createdAt: admin.createdAt } }, 201);
}

// Removes a staff account — never your own, and never the last one.
export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b?.id) return bad("A staff account id is required.");
  if (b.id === session.sub) return bad("You can't remove your own account while signed in with it.");

  const count = await prisma.adminUser.count();
  if (count <= 1) return bad("At least one staff account must remain.");

  const admin = await prisma.adminUser.delete({ where: { id: b.id } }).catch(() => null);
  if (!admin) return bad("Staff account not found.", 404);

  await logAudit(session.sub, "staff.removed", {
    targetType: "AdminUser",
    targetId: admin.id,
    summary: `Removed staff account ${admin.name} <${admin.email}>`,
  });

  return json({ ok: true });
}
