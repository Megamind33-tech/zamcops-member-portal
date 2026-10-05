import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { lockReason } from "@/lib/distLock";
import { readLinkFields } from "@/lib/linkFields";

export const runtime = "nodejs";

// The pool links of one distribution run — WIPO Connect's "Distribution Pool
// Link" table: main id, pool, class, station (sub class), period, how many works
// are on the list, status, amount.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const d = await prisma.distribution.findUnique({ where: { id }, select: { id: true, status: true, closedAt: true, runAt: true } });
  if (!d) return bad("Distribution not found.", 404);

  const links = await prisma.distributionPoolLink.findMany({
    where: { distributionId: id },
    orderBy: { seq: "asc" },
    include: { pool: { select: { id: true, code: true, kind: true, method: true, rightType: true, creationClass: true } }, _count: { select: { works: true } } },
  });
  const sums = links.length
    ? await prisma.distributionLine.groupBy({ by: ["linkId"], where: { linkId: { in: links.map((l) => l.id) } }, _sum: { amount: true, adminFee: true, reserved: true }, _count: { _all: true } })
    : [];
  const by = new Map(sums.map((s) => [s.linkId, s]));
  return json({
    locked: lockReason(d),
    closedAt: d.closedAt,
    runAt: d.runAt,
    links: links.map((l) => ({
      id: l.id,
      seq: l.seq,
      pool: l.pool,
      stationId: l.stationId,
      stationName: l.stationName,
      kind: l.kind || l.pool?.kind || "",
      periodStart: l.periodStart,
      periodEnd: l.periodEnd,
      amount: l.amount,
      currency: l.currency,
      status: l.status,
      lastError: l.lastError,
      allocatedAt: l.allocatedAt,
      notes: l.notes,
      works: l._count.works,
      lines: by.get(l.id)?._count._all ?? 0,
      allocated: by.get(l.id)?._sum.amount ?? 0,
      adminFee: by.get(l.id)?._sum.adminFee ?? 0,
      reserved: by.get(l.id)?._sum.reserved ?? 0,
    })),
    totalAmount: links.reduce((s, l) => s + l.amount, 0),
  });
}

// Add a pool link: pick a pool and a station (or type a new station), a period,
// the amount to share out and the admin fees. Fees, reserve type and methods
// start from the pool's settings and can be changed per link.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const d = await prisma.distribution.findUnique({ where: { id }, select: { id: true, periodLabel: true, status: true, closedAt: true } });
  if (!d) return bad("Distribution not found.", 404);
  const locked = lockReason(d);
  if (locked) return bad(locked);
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Invalid request body.");

  const read = await readLinkFields(b as Record<string, unknown>);
  if ("error" in read) return bad(read.error);
  const f = read.data;

  const pool = f.poolId ? await prisma.distributionPool.findUnique({ where: { id: f.poolId } }) : null;

  let station = b.stationId ? await prisma.broadcastStation.findUnique({ where: { id: String(b.stationId) } }) : null;
  if (b.stationId && !station) return bad("That station does not exist.");
  const newName = String(b.newStation?.name ?? "").trim();
  if (!station && newName) {
    const kind = ["Radio", "Television", "Live performance", "Online", "Other"].includes(b.newStation?.kind) ? (b.newStation.kind as string) : pool?.kind || "Radio";
    station =
      (await prisma.broadcastStation.findFirst({ where: { name: { equals: newName, mode: "insensitive" }, kind } })) ??
      (await prisma.broadcastStation.create({ data: { name: newName.slice(0, 200), kind } }));
  }
  if (!station && !pool) return bad("Choose a pool or a station for this link.");

  const link = await prisma.distributionPoolLink.create({
    data: {
      distributionId: id,
      poolId: pool?.id ?? null,
      stationId: station?.id ?? null,
      stationName: station?.name ?? "",
      kind: station?.kind ?? pool?.kind ?? "",
      periodStart: f.periodStart ?? "",
      periodEnd: f.periodEnd ?? "",
      amount: f.amount ?? 0,
      currency: f.currency ?? "ZMW",
      adminFeePct: f.adminFeePct ?? pool?.adminFeePct ?? 0,
      adminFeeIntl: f.adminFeeIntl ?? 0,
      adminFeeIntlRevenue: f.adminFeeIntlRevenue ?? 0,
      adminFeeReserved: f.adminFeeReserved ?? 0,
      reserveType: f.reserveType ?? pool?.reserveType ?? "",
      affiliation: f.affiliation ?? "ZAMCOPS",
      workMethodId: f.workMethodId ?? null,
      roMethodId: f.roMethodId ?? null,
      notes: f.notes ?? "",
    },
  });
  await logAudit(session.sub, "distribution.link-added", {
    targetType: "Distribution",
    targetId: id,
    summary: `Added pool link 133-${link.seq}-DPL ${pool?.code ?? ""} ${station?.name ?? ""} to “${d.periodLabel}”`.replace(/\s+/g, " "),
    changes: [{ field: "Pool link", from: "", to: `133-${link.seq}-DPL · ${[pool?.code, station?.name].filter(Boolean).join(" · ")} — ${link.currency} ${link.amount.toFixed(2)}` }],
  });
  return json({ id: link.id, seq: link.seq }, 201);
}
