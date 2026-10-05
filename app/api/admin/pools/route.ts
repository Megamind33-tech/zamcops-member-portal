import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

// Distribution pools — the reusable "TV-WL-01" style setups a pool link draws on.
export async function GET() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const pools = await prisma.distributionPool.findMany({ orderBy: { code: "asc" }, include: { _count: { select: { links: true } } } });
  return json({
    pools: pools.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      kind: p.kind,
      method: p.method,
      creationClass: p.creationClass,
      rightType: p.rightType,
      adminFeePct: p.adminFeePct,
      notes: p.notes,
      active: p.active,
      links: p._count.links,
    })),
  });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const b = await req.json().catch(() => null);
  const code = String(b?.code ?? "").trim().toUpperCase().slice(0, 40);
  if (!code) return bad("Give the pool a code, for example TV-WL-01.");
  if (await prisma.distributionPool.findUnique({ where: { code } })) return bad(`A pool with code ${code} already exists.`, 409);
  const fee = Number(b?.adminFeePct ?? 0);
  if (!Number.isFinite(fee) || fee < 0 || fee > 100) return bad("The admin fee must be between 0 and 100%.");
  const p = await prisma.distributionPool.create({
    data: {
      code,
      name: String(b?.name ?? "").trim().slice(0, 200),
      kind: String(b?.kind ?? "Television").trim().slice(0, 40) || "Television",
      method: ["Work List", "Log Based"].includes(b?.method) ? b.method : "Work List",
      creationClass: String(b?.creationClass ?? "MW").trim().slice(0, 10) || "MW",
      rightType: ["Performing", "Mechanical", "Synchronisation", "Print", "Other"].includes(b?.rightType) ? b.rightType : "Performing",
      adminFeePct: Math.round(fee * 100) / 100,
      notes: String(b?.notes ?? "").slice(0, 2000),
    },
  });
  await logAudit(session.sub, "pool.created", { targetType: "Pool", targetId: p.id, summary: `Created distribution pool ${p.code}` });
  return json({ id: p.id }, 201);
}
