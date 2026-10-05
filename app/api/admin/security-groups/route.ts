import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { hasPermission, ensureSecurityGroups, PERMISSIONS } from "@/lib/permissions";

export const runtime = "nodejs";

const codes = new Set(PERMISSIONS.map((p) => p.code));
const clean = (v: unknown) => (Array.isArray(v) ? [...new Set(v.map(String).filter((c) => codes.has(c)))] : []);

// WIPO Connect Administration > Security Groups
export async function GET() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "USER_ACCOUNT_ACCESS"))) return bad("You do not have the User Account (Access) permission.", 403);
  await ensureSecurityGroups();
  const groups = await prisma.adminGroup.findMany({ orderBy: { name: "asc" }, include: { users: { select: { id: true, name: true, email: true } } } });
  return json({
    permissions: PERMISSIONS,
    canManage: await hasPermission(session.sub, "SECURITY_MGMT"),
    groups: groups.map((g) => ({ id: g.id, name: g.name, description: g.description, note: g.note, permissions: g.permissions as string[], users: g.users })),
  });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "SECURITY_MGMT"))) return bad("You do not have the Security (Management) permission.", 403);
  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim().slice(0, 120);
  if (!name) return bad("Name is required.");
  if (await prisma.adminGroup.findUnique({ where: { name } })) return bad("A security group with that name already exists.", 409);
  const g = await prisma.adminGroup.create({
    data: {
      name,
      description: String(b?.description ?? "").slice(0, 300),
      note: String(b?.note ?? "").slice(0, 1000),
      permissions: clean(b?.permissions),
      users: { connect: (Array.isArray(b?.userIds) ? b.userIds : []).map((id: unknown) => ({ id: String(id) })) },
    },
  });
  await logAudit(session.sub, "security-group.created", { targetType: "Security group", targetId: g.id, summary: `Created security group ${name}` });
  return json({ id: g.id }, 201);
}
