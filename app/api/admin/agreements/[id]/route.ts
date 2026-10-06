import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit, diffFields } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { readAgreement, isActive } from "@/lib/agreementFields";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };
type Comment = { at: string; by: string; text: string };

const LABELS = {
  code: "Code", type: "Agreement Type", creationClass: "Creation Class", assignorName: "Assignor", assigneeName: "Assignee", signatureDate: "Signature Date",
  sourceType: "Source Type", sourceDetail: "Source Detail", startDate: "Start Date", endDate: "End Date", effectiveStart: "Effective Start Date",
  effectiveEnd: "Effective End Date", rightTypes: "Right Category", territory: "Territory", shareValue: "Shares", workAssociation: "Work Association", status: "Status",
};

export async function GET(_req: Request, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "AGREEMENT_ACCESS"))) return bad("You do not have the Agreement (Access) permission.", 403);
  const { id } = await ctx.params;
  const a = await prisma.agreement.findUnique({ where: { id }, include: { works: true } });
  if (!a) return bad("Agreement not found.", 404);
  const works = await prisma.registryWork.findMany({ where: { id: { in: a.works.map((w) => w.workId) } }, select: { id: true, wipoId: true, title: true, iswc: true } });
  const byId = new Map(works.map((w) => [w.id, w]));
  const row = (w: { workId: string; excluded: boolean }) => ({ ...(byId.get(w.workId) ?? { id: w.workId, wipoId: "", title: "(removed work)", iswc: "" }), excluded: w.excluded });
  return json({
    canManage: await hasPermission(session.sub, "AGREEMENT_MGMT"),
    agreement: { ...a, works: undefined, active: isActive(a) },
    covered: a.works.filter((w) => !w.excluded).map(row),
    excluded: a.works.filter((w) => w.excluded).map(row),
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "AGREEMENT_MGMT"))) return bad("You do not have the Agreement (Management) permission.", 403);
  const { id } = await ctx.params;
  const cur = await prisma.agreement.findUnique({ where: { id } });
  if (!cur) return bad("Agreement not found.", 404);
  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request.");

  // { comment: "text" } adds to the Comment(s) list
  if (typeof b.comment === "string" && Object.keys(b).length === 1) {
    const text = b.comment.trim().slice(0, 2000);
    if (!text) return bad("Write a comment first.");
    const admin = await prisma.adminUser.findUnique({ where: { id: session.sub }, select: { name: true } });
    const list = [...((cur.comments as Comment[]) ?? []), { at: new Date().toISOString(), by: admin?.name ?? "", text }];
    await prisma.agreement.update({ where: { id }, data: { comments: list } });
    return json({ ok: true });
  }

  const f = readAgreement(b);
  if ("error" in f) return bad(f.error);
  if (f.code !== cur.code && (await prisma.agreement.findFirst({ where: { code: f.code, status: { not: "Deleted" }, id: { not: id } } }))) return bad(`An agreement with code ${f.code} already exists.`, 409);
  await prisma.agreement.update({ where: { id }, data: f });
  await logAudit(session.sub, "agreement.updated", { targetType: "Agreement", targetId: id, summary: `Updated agreement ${f.code}`, changes: diffFields(cur as unknown as Record<string, unknown>, f, LABELS) });
  return json({ ok: true });
}

// WIPO's bulk "delete" keeps the agreement and marks it Deleted.
export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "AGREEMENT_MGMT"))) return bad("You do not have the Agreement (Management) permission.", 403);
  const { id } = await ctx.params;
  const cur = await prisma.agreement.findUnique({ where: { id } });
  if (!cur) return bad("Agreement not found.", 404);
  await prisma.agreement.update({ where: { id }, data: { status: "Deleted" } });
  await logAudit(session.sub, "agreement.deleted", { targetType: "Agreement", targetId: id, summary: `Deleted agreement ${cur.code}`, changes: [{ field: "Status", from: cur.status, to: "Deleted" }] });
  return json({ ok: true });
}
