import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit, diffFields } from "@/lib/audit";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Invalid request body.");
  const existing = await prisma.distributionPool.findUnique({ where: { id } });
  if (!existing) return bad("Pool not found.", 404);

  const data: Record<string, string | number | boolean> = {};
  if (b.code !== undefined) {
    const c = String(b.code).trim().toUpperCase().slice(0, 40);
    if (!c) return bad("A pool needs a code.");
    if (c !== existing.code && (await prisma.distributionPool.findUnique({ where: { code: c } }))) return bad(`A pool with code ${c} already exists.`, 409);
    data.code = c;
  }
  for (const [k, max] of [["name", 200], ["kind", 40], ["creationClass", 10], ["notes", 2000]] as const) if (b[k] !== undefined) data[k] = String(b[k]).trim().slice(0, max);
  if (b.method !== undefined) {
    if (!["Work List", "Log Based"].includes(b.method)) return bad("Unknown method.");
    data.method = b.method;
  }
  if (b.rightType !== undefined) {
    if (!["Performing", "Mechanical", "Synchronisation", "Print", "Other"].includes(b.rightType)) return bad("Unknown right type.");
    data.rightType = b.rightType;
  }
  if (b.adminFeePct !== undefined) {
    const f = Number(b.adminFeePct);
    if (!Number.isFinite(f) || f < 0 || f > 100) return bad("The admin fee must be between 0 and 100%.");
    data.adminFeePct = Math.round(f * 100) / 100;
  }
  if (b.active !== undefined) data.active = !!b.active;
  if (!Object.keys(data).length) return bad("Nothing to update.");

  await prisma.distributionPool.update({ where: { id }, data });
  await logAudit(session.sub, "pool.updated", {
    targetType: "Pool",
    targetId: id,
    summary: `Edited distribution pool ${(data.code as string) ?? existing.code}`,
    changes: diffFields(existing as unknown as Record<string, unknown>, data, {
      code: "Code",
      name: "Name",
      kind: "Class",
      method: "Method",
      creationClass: "Creation class",
      rightType: "Right type",
      adminFeePct: "Admin fee %",
      notes: "Notes",
      active: "Active",
    }),
  });
  return json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const p = await prisma.distributionPool.findUnique({ where: { id }, include: { _count: { select: { links: true } } } });
  if (!p) return bad("Pool not found.", 404);
  if (p._count.links > 0) return bad(`Pool ${p.code} is used in ${p._count.links} pool link${p._count.links === 1 ? "" : "s"}. Mark it inactive instead of deleting it.`, 409);
  await prisma.distributionPool.delete({ where: { id } });
  await logAudit(session.sub, "pool.deleted", { targetType: "Pool", targetId: id, summary: `Deleted distribution pool ${p.code}` });
  return json({ ok: true });
}
