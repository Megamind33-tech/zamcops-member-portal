import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// POST { workIds: string[], excluded?: boolean, workSetId?: string } adds covered (or, for "Add Works to exclude", excluded) works.
export async function POST(req: Request, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "AGREEMENT_MGMT"))) return bad("You do not have the Agreement (Management) permission.", 403);
  const { id } = await ctx.params;
  const a = await prisma.agreement.findUnique({ where: { id } });
  if (!a) return bad("Agreement not found.", 404);
  const b = await req.json().catch(() => null);
  const excluded = b?.excluded === true;
  if (excluded && a.type === "Specific Include") return bad("A Specific Include agreement covers the works listed on it; it has no works to exclude.");
  if (!excluded && a.type === "Specific Exclude") return bad("A Specific Exclude agreement covers everything except the works listed under Excluded Works.");

  let ids: string[] = Array.isArray(b?.workIds) ? b.workIds.map(String) : [];
  if (b?.workSetId) ids = ids.concat((await prisma.workSetItem.findMany({ where: { setId: String(b.workSetId) }, select: { workId: true } })).map((i) => i.workId));
  ids = [...new Set(ids)];
  if (ids.length === 0) return bad("Pick at least one work.");
  const found = await prisma.registryWork.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const { count } = await prisma.agreementWork.createMany({ data: found.map((w) => ({ agreementId: id, workId: w.id, excluded })), skipDuplicates: true });
  await logAudit(session.sub, "agreement.works-added", { targetType: "Agreement", targetId: id, summary: `Added ${count} ${excluded ? "excluded" : "covered"} work(s) to ${a.code}` });
  return json({ added: count, skipped: ids.length - count });
}

// DELETE ?workId=&excluded=1
export async function DELETE(req: Request, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "AGREEMENT_MGMT"))) return bad("You do not have the Agreement (Management) permission.", 403);
  const { id } = await ctx.params;
  const sp = new URL(req.url).searchParams;
  const { count } = await prisma.agreementWork.deleteMany({ where: { agreementId: id, workId: sp.get("workId") ?? "", excluded: sp.get("excluded") === "1" } });
  if (!count) return bad("That work is not on the agreement.", 404);
  await logAudit(session.sub, "agreement.works-removed", { targetType: "Agreement", targetId: id, summary: "Removed a work from the agreement" });
  return json({ ok: true });
}
