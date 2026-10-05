import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

// The pool links of one distribution run — WIPO Connect's "Distribution Pool
// Link" table: which pool, which station, the period, how many works are on the
// list, whether it has been allocated, and the amount.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const d = await prisma.distribution.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!d) return bad("Distribution not found.", 404);

  const links = await prisma.distributionPoolLink.findMany({
    where: { distributionId: id },
    orderBy: { createdAt: "asc" },
    include: { pool: { select: { id: true, code: true, kind: true, method: true, rightType: true } }, _count: { select: { works: true } } },
  });
  const sums = links.length
    ? await prisma.distributionLine.groupBy({ by: ["linkId"], where: { linkId: { in: links.map((l) => l.id) } }, _sum: { amount: true, adminFee: true }, _count: { _all: true } })
    : [];
  const by = new Map(sums.map((s) => [s.linkId, s]));
  return json({
    published: d.status === "Published",
    links: links.map((l) => ({
      id: l.id,
      pool: l.pool,
      stationId: l.stationId,
      stationName: l.stationName,
      kind: l.kind || l.pool?.kind || "",
      periodStart: l.periodStart,
      periodEnd: l.periodEnd,
      amount: l.amount,
      adminFeePct: l.adminFeePct,
      status: l.status,
      allocatedAt: l.allocatedAt,
      notes: l.notes,
      works: l._count.works,
      lines: by.get(l.id)?._count._all ?? 0,
      allocated: by.get(l.id)?._sum.amount ?? 0,
      adminFee: by.get(l.id)?._sum.adminFee ?? 0,
    })),
    totalAmount: links.reduce((s, l) => s + l.amount, 0),
  });
}

const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

// Add a pool link: pick a pool and a station (or type a new station), a period
// and the amount to share out.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const d = await prisma.distribution.findUnique({ where: { id }, select: { id: true, periodLabel: true, status: true } });
  if (!d) return bad("Distribution not found.", 404);
  if (d.status === "Published") return bad("This distribution is published. Unpublish it before adding pool links.");
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Invalid request body.");

  const amount = money(b.amount ?? 0);
  if (amount === null) return bad("The amount must be zero or more.");

  const pool = b.poolId ? await prisma.distributionPool.findUnique({ where: { id: String(b.poolId) } }) : null;
  if (b.poolId && !pool) return bad("That pool does not exist.");

  let station = b.stationId ? await prisma.broadcastStation.findUnique({ where: { id: String(b.stationId) } }) : null;
  if (b.stationId && !station) return bad("That station does not exist.");
  const newName = String(b.newStation?.name ?? "").trim();
  if (!station && newName) {
    const kind = ["Radio", "Television", "Live performance", "Online", "Other"].includes(b.newStation?.kind) ? b.newStation.kind : pool?.kind || "Radio";
    station =
      (await prisma.broadcastStation.findFirst({ where: { name: { equals: newName, mode: "insensitive" }, kind } })) ??
      (await prisma.broadcastStation.create({ data: { name: newName.slice(0, 200), kind } }));
  }
  if (!station && !pool) return bad("Choose a pool or a station for this link.");

  const fee = b.adminFeePct === undefined || b.adminFeePct === "" ? (pool?.adminFeePct ?? 0) : Number(b.adminFeePct);
  if (!Number.isFinite(fee) || fee < 0 || fee > 100) return bad("The admin fee must be between 0 and 100%.");

  const link = await prisma.distributionPoolLink.create({
    data: {
      distributionId: id,
      poolId: pool?.id ?? null,
      stationId: station?.id ?? null,
      stationName: station?.name ?? "",
      kind: station?.kind ?? pool?.kind ?? "",
      periodStart: String(b.periodStart ?? "").slice(0, 10),
      periodEnd: String(b.periodEnd ?? "").slice(0, 10),
      amount,
      adminFeePct: Math.round(fee * 100) / 100,
      notes: String(b.notes ?? "").slice(0, 2000),
    },
  });
  await logAudit(session.sub, "distribution.link-added", {
    targetType: "Distribution",
    targetId: id,
    summary: `Added pool link ${pool?.code ?? ""} ${station?.name ?? ""} to “${d.periodLabel}”`.replace(/\s+/g, " "),
    changes: [{ field: "Pool link", from: "", to: `${[pool?.code, station?.name].filter(Boolean).join(" · ")} — ZMW ${amount.toFixed(2)}` }],
  });
  return json({ id: link.id }, 201);
}
