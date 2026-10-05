import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };
const codes = new Set(PERMISSIONS.map((p) => p.code));

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "SECURITY_MGMT"))) return bad("You do not have the Security (Management) permission.", 403);
  const { id } = await ctx.params;
  const cur = await prisma.adminGroup.findUnique({ where: { id }, include: { users: { select: { id: true } } } });
  if (!cur) return bad("Security group not found.", 404);
  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request.");
  const name = String(b.name ?? "").trim().slice(0, 120);
  if (!name) return bad("Name is required.");
  const clash = await prisma.adminGroup.findUnique({ where: { name } });
  if (clash && clash.id !== id) return bad("A security group with that name already exists.", 409);
  const permissions = Array.isArray(b.permissions) ? [...new Set((b.permissions as unknown[]).map(String).filter((c) => codes.has(c)))] : (cur.permissions as string[]);

  // Removing every permission from the group an administrator relies on would lock them out.
  const me = await prisma.adminUser.findUnique({ where: { id: session.sub }, include: { groups: true } });
  const userIds: string[] = Array.isArray(b.userIds) ? b.userIds.map(String) : cur.users.map((u) => u.id);
  if (me?.groups.some((g) => g.id === id) && me.groups.length === 1) {
    if (!userIds.includes(session.sub) || !permissions.includes("SECURITY_MGMT")) return bad("That change would remove your own Security (Management) permission.");
  }

  await prisma.adminGroup.update({
    where: { id },
    data: { name, description: String(b.description ?? "").slice(0, 300), note: String(b.note ?? "").slice(0, 1000), permissions, users: { set: userIds.map((u) => ({ id: u })) } },
  });
  const was = cur.permissions as string[];
  const changes = [
    ...(cur.name !== name ? [{ field: "Name", from: cur.name, to: name }] : []),
    ...(permissions.filter((p) => !was.includes(p)).length || was.filter((p) => !permissions.includes(p)).length
      ? [{ field: "Permissions", from: was.join(", "), to: permissions.join(", ") }]
      : []),
  ];
  await logAudit(session.sub, "security-group.updated", { targetType: "Security group", targetId: id, summary: `Updated security group ${name}`, changes });
  return json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "SECURITY_MGMT"))) return bad("You do not have the Security (Management) permission.", 403);
  const { id } = await ctx.params;
  const g = await prisma.adminGroup.findUnique({ where: { id }, include: { users: { select: { id: true } } } });
  if (!g) return bad("Security group not found.", 404);
  if (g.users.some((u) => u.id === session.sub)) return bad("You belong to this group — remove yourself from it first.");
  await prisma.adminGroup.delete({ where: { id } });
  await logAudit(session.sub, "security-group.deleted", { targetType: "Security group", targetId: id, summary: `Deleted security group ${g.name}` });
  return json({ ok: true });
}
