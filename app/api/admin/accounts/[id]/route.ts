import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit, diffFields } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { readAccount } from "@/lib/accountFields";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const LABELS = { email: "Email", name: "Name", firstName: "First Name", language: "UI Language Code", accountType: "Account type", active: "Status", tags: "Tags", matchMin: "Matching Amount Min", matchMax: "Matching Amount Max" };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "USER_ACCOUNT_MGMT"))) return bad("You do not have the User Account (Management) permission.", 403);
  const { id } = await ctx.params;
  const cur = await prisma.adminUser.findUnique({ where: { id }, include: { groups: true } });
  if (!cur) return bad("Account not found.", 404);
  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request.");
  const f = readAccount(b);
  if ("error" in f) return bad(f.error);
  if (f.email !== cur.email && (await prisma.adminUser.findUnique({ where: { email: f.email } }))) return bad("An account with that email already exists.", 409);
  if (id === session.sub && !f.active) return bad("You can't deactivate the account you are signed in with.");

  const password = String(b.password ?? "");
  if (password) {
    if (password.length < 8) return bad("Password must be at least 8 characters.");
    if (password !== String(b.password2 ?? "")) return bad("The passwords do not match.");
  }
  const data = {
    email: f.email,
    name: f.name,
    firstName: f.firstName,
    language: f.language,
    accountType: f.accountType,
    active: f.active,
    tags: f.tags,
    matchMin: f.matchMin,
    matchMax: f.matchMax,
    ...(password ? { passwordHash: await hashPassword(password) } : {}),
    groups: { set: f.groupIds.map((g) => ({ id: g })) },
  };
  await prisma.adminUser.update({ where: { id }, data });

  const changes = diffFields(cur as unknown as Record<string, unknown>, { ...f, active: f.active ? "Active" : "Not active" }, LABELS);
  const was = cur.groups.map((g) => g.name).sort().join(", ");
  const now = (await prisma.adminGroup.findMany({ where: { id: { in: f.groupIds } }, select: { name: true } })).map((g) => g.name).sort().join(", ");
  if (was !== now) changes.push({ field: "Groups", from: was, to: now });
  if (password) changes.push({ field: "Password", from: "", to: "changed" });
  await logAudit(session.sub, "staff.updated", { targetType: "AdminUser", targetId: id, summary: `Updated user account ${f.name} <${f.email}>`, changes });
  return json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "USER_ACCOUNT_MGMT"))) return bad("You do not have the User Account (Management) permission.", 403);
  const { id } = await ctx.params;
  if (id === session.sub) return bad("You can't remove your own account while signed in with it.");
  if ((await prisma.adminUser.count()) <= 1) return bad("At least one account must remain.");
  const a = await prisma.adminUser.delete({ where: { id } }).catch(() => null);
  if (!a) return bad("Account not found.", 404);
  await logAudit(session.sub, "staff.removed", { targetType: "AdminUser", targetId: id, summary: `Removed user account ${a.name} <${a.email}>` });
  return json({ ok: true });
}
