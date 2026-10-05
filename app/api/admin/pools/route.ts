import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { poolJson, readPoolFields } from "@/lib/poolFields";

export const runtime = "nodejs";

// Distribution pools — the reusable "TV-WL-01" style setups a pool link draws
// on. ?status=Open|Archived (default Open; "all" for both)
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const status = new URL(req.url).searchParams.get("status") ?? "Open";
  const pools = await prisma.distributionPool.findMany({
    where: status === "all" ? {} : { active: status !== "Archived" },
    orderBy: { code: "asc" },
    include: { _count: { select: { links: true } }, workMethod: { select: { name: true } }, roMethod: { select: { name: true } } },
  });
  return json({ pools: pools.map((p) => ({ ...poolJson(p), links: p._count.links, workMethodName: p.workMethod?.name ?? "", roMethodName: p.roMethod?.name ?? "" })) });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object" || !String(b.code ?? "").trim()) return bad("Give the pool a code, for example TV-WL-01.");
  const read = await readPoolFields(b);
  if ("error" in read) return bad(read.error, read.error.includes("already exists") ? 409 : 400);
  const d = read.data;
  const p = await prisma.distributionPool.create({
    data: {
      code: d.code!,
      name: d.name ?? "",
      kind: d.kind ?? "Television",
      subClass: d.subClass ?? "",
      method: d.method ?? "Work List",
      creationClass: d.creationClass || "MW",
      rightType: d.rightType ?? "Performing",
      adminFeePct: d.adminFeePct ?? 0,
      workRoles: d.workRoles ?? "[]",
      workMethodId: d.workMethodId ?? null,
      roMethodId: d.roMethodId ?? null,
      reallocateWithinWork: d.reallocateWithinWork ?? true,
      workShareTolerance: d.workShareTolerance ?? 0,
      internationalRevenueStream: d.internationalRevenueStream ?? false,
      reserveType: d.reserveType ?? "",
      notes: d.notes ?? "",
    },
  });
  await logAudit(session.sub, "pool.created", { targetType: "Pool", targetId: p.id, summary: `Created distribution pool ${p.code}` });
  return json({ id: p.id }, 201);
}
