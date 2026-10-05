import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit, diffFields } from "@/lib/audit";
import { poolJson, readPoolFields, POOL_LABELS } from "@/lib/poolFields";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const p = await prisma.distributionPool.findUnique({ where: { id }, include: { _count: { select: { links: true } } } });
  if (!p) return bad("Pool not found.", 404);
  // role codes seen on the register, offered as suggestions
  const roles = await prisma.workShare.groupBy({ by: ["roleCode"], where: { roleCode: { not: "" } }, _count: { _all: true }, orderBy: { _count: { roleCode: "desc" } }, take: 60 });
  return json({ pool: { ...poolJson(p), links: p._count.links }, knownRoles: roles.map((r) => r.roleCode) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Invalid request body.");
  const existing = await prisma.distributionPool.findUnique({ where: { id } });
  if (!existing) return bad("Pool not found.", 404);

  const read = await readPoolFields(b, existing.code);
  if ("error" in read) return bad(read.error, read.error.includes("already exists") ? 409 : 400);
  const data = read.data;
  if (!Object.keys(data).length) return bad("Nothing to update.");

  await prisma.distributionPool.update({ where: { id }, data });
  await logAudit(session.sub, "pool.updated", {
    targetType: "Pool",
    targetId: id,
    summary: `Edited distribution pool ${data.code ?? existing.code}`,
    changes: diffFields(existing as unknown as Record<string, unknown>, data as Record<string, unknown>, POOL_LABELS),
  });
  return json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const p = await prisma.distributionPool.findUnique({ where: { id }, include: { _count: { select: { links: true } } } });
  if (!p) return bad("Pool not found.", 404);
  if (p._count.links > 0) return bad(`Pool ${p.code} is used in ${p._count.links} pool link${p._count.links === 1 ? "" : "s"}. Archive it instead of deleting it.`, 409);
  await prisma.distributionPool.delete({ where: { id } });
  await logAudit(session.sub, "pool.deleted", { targetType: "Pool", targetId: id, summary: `Deleted distribution pool ${p.code}` });
  return json({ ok: true });
}
