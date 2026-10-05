import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit, diffFields } from "@/lib/audit";
import { checkFormula } from "@/lib/formula";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Invalid request body.");
  const existing = await prisma.allocationMethod.findUnique({ where: { id } });
  if (!existing) return bad("Method not found.", 404);

  const data: Record<string, string> = {};
  if (b.name !== undefined) {
    const n = String(b.name).trim().slice(0, 120);
    if (!n) return bad("A method needs a name.");
    if (n !== existing.name && (await prisma.allocationMethod.findUnique({ where: { target_name: { target: existing.target, name: n } } }))) return bad(`A method called “${n}” already exists.`, 409);
    data.name = n;
  }
  if (b.formula !== undefined) {
    const f = String(b.formula).trim();
    const c = checkFormula(f);
    if (!c.ok) return bad(`Formula: ${c.error}.`);
    data.formula = f;
  }
  if (b.description !== undefined) data.description = String(b.description).slice(0, 500);
  if (!Object.keys(data).length) return bad("Nothing to update.");

  await prisma.allocationMethod.update({ where: { id }, data });
  await logAudit(session.sub, "allocation-method.updated", {
    targetType: "Allocation method",
    targetId: id,
    summary: `Edited ${existing.target.toLowerCase()} allocation method “${data.name ?? existing.name}”`,
    changes: diffFields(existing as unknown as Record<string, unknown>, data, { name: "Name", formula: "Formula", description: "Description" }),
  });
  return json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const m = await prisma.allocationMethod.findUnique({ where: { id }, include: { _count: { select: { poolWork: true, poolRo: true, linkWork: true, linkRo: true } } } });
  if (!m) return bad("Method not found.", 404);
  const used = m._count.poolWork + m._count.poolRo + m._count.linkWork + m._count.linkRo;
  if (used > 0) return bad(`“${m.name}” is used by ${used} pool${used === 1 ? "" : "s"} or pool link${used === 1 ? "" : "s"}. Remove it from them first.`, 409);
  await prisma.allocationMethod.delete({ where: { id } });
  await logAudit(session.sub, "allocation-method.deleted", { targetType: "Allocation method", targetId: id, summary: `Deleted ${m.target.toLowerCase()} allocation method “${m.name}”` });
  return json({ ok: true });
}
