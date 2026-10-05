import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { hasPermission, ensureSecurityGroups } from "@/lib/permissions";
import { readAccount } from "@/lib/accountFields";

export const runtime = "nodejs";

// WIPO Connect Administration > User Accounts
export async function GET() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "USER_ACCOUNT_ACCESS"))) return bad("You do not have the User Account (Access) permission.", 403);
  await ensureSecurityGroups();
  const [accounts, groups] = await Promise.all([
    prisma.adminUser.findMany({ orderBy: { createdAt: "asc" }, include: { groups: { select: { id: true, name: true } } } }),
    prisma.adminGroup.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return json({
    me: session.sub,
    canManage: await hasPermission(session.sub, "USER_ACCOUNT_MGMT"),
    groups,
    accounts: accounts.map((a) => ({
      id: a.id,
      email: a.email,
      name: a.name,
      firstName: a.firstName,
      language: a.language,
      accountType: a.accountType,
      active: a.active,
      tags: a.tags,
      matchMin: a.matchMin,
      matchMax: a.matchMax,
      groups: a.groups,
    })),
  });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "USER_ACCOUNT_MGMT"))) return bad("You do not have the User Account (Management) permission.", 403);
  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request.");
  const f = readAccount(b);
  if ("error" in f) return bad(f.error);
  const password = String(b.password ?? "");
  if (password.length < 8) return bad("Password must be at least 8 characters.");
  if (password !== String(b.password2 ?? "")) return bad("The passwords do not match.");
  if (await prisma.adminUser.findUnique({ where: { email: f.email } })) return bad("An account with that email already exists.", 409);

  const a = await prisma.adminUser.create({
    data: {
      email: f.email,
      name: f.name,
      firstName: f.firstName,
      language: f.language,
      accountType: f.accountType,
      active: f.active,
      tags: f.tags,
      matchMin: f.matchMin,
      matchMax: f.matchMax,
      passwordHash: await hashPassword(password),
      groups: { connect: f.groupIds.map((id) => ({ id })) },
    },
  });
  await logAudit(session.sub, "staff.created", { targetType: "AdminUser", targetId: a.id, summary: `Created user account ${f.name} <${f.email}>` });
  return json({ id: a.id }, 201);
}
