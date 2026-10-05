import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit, diffFields } from "@/lib/audit";

export const runtime = "nodejs";

const PAGE_SIZE = 50;

async function load(id: string, linkId: string) {
  return prisma.distributionPoolLink.findFirst({
    where: { id: linkId, distributionId: id },
    include: { distribution: { select: { id: true, periodLabel: true, status: true, code: true } }, pool: true, station: true },
  });
}

// One pool link with its list of works (?q= title / ISWC / id, ?page=).
export async function GET(req: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id, linkId } = await params;
  const link = await load(id, linkId);
  if (!link) return bad("Pool link not found.", 404);

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const where = {
    linkId,
    ...(q
      ? {
          work: {
            OR: [{ title: { contains: q, mode: "insensitive" as const } }, { iswc: { contains: q, mode: "insensitive" as const } }, { wipoId: { contains: q.replace(/^133-|-W$/gi, "") } }],
          },
        }
      : {}),
  };
  const [total, all, items, lines] = await Promise.all([
    prisma.distributionPoolWork.count({ where }),
    prisma.distributionPoolWork.aggregate({ where: { linkId }, _count: { _all: true }, _sum: { weight: true } }),
    prisma.distributionPoolWork.findMany({
      where,
      orderBy: { work: { title: "asc" } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { work: { select: { id: true, title: true, iswc: true, wipoId: true, shares: { take: 3, orderBy: { share: "desc" }, select: { rightHolder: { select: { displayName: true } }, name: { select: { name: true } } } } } } },
    }),
    prisma.distributionLine.aggregate({ where: { linkId }, _sum: { amount: true, adminFee: true }, _count: { _all: true } }),
  ]);

  return json({
    link: {
      id: link.id,
      distribution: link.distribution,
      pool: link.pool ? { id: link.pool.id, code: link.pool.code, name: link.pool.name, kind: link.pool.kind, method: link.pool.method, rightType: link.pool.rightType } : null,
      stationId: link.stationId,
      stationName: link.stationName,
      kind: link.kind,
      periodStart: link.periodStart,
      periodEnd: link.periodEnd,
      amount: link.amount,
      adminFeePct: link.adminFeePct,
      status: link.status,
      allocatedAt: link.allocatedAt,
      notes: link.notes,
      lines: lines._count._all,
      allocated: lines._sum.amount ?? 0,
      adminFee: lines._sum.adminFee ?? 0,
    },
    stats: { works: all._count._all, weight: all._sum.weight ?? 0 },
    page,
    pageSize: PAGE_SIZE,
    total,
    works: items.map((w) => ({
      id: w.id,
      workId: w.workId,
      weight: w.weight,
      title: w.work.title,
      iswc: w.work.iswc,
      wipoId: w.work.wipoId,
      holders: [...new Set(w.work.shares.map((s) => s.rightHolder?.displayName || s.name?.name || "").filter(Boolean))],
    })),
  });
}

const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

// Edit the link: station, period, amount, admin fee, notes. Changing anything
// that affects the money leaves it "To be Allocated" until it is allocated again.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id, linkId } = await params;
  const link = await load(id, linkId);
  if (!link) return bad("Pool link not found.", 404);
  if (link.distribution.status === "Published") return bad("This distribution is published. Unpublish it before changing pool links.");
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Invalid request body.");

  const data: Record<string, string | number | null> = {};
  if (b.amount !== undefined) {
    const a = money(b.amount);
    if (a === null) return bad("The amount must be zero or more.");
    data.amount = a;
  }
  if (b.adminFeePct !== undefined) {
    const f = Number(b.adminFeePct);
    if (!Number.isFinite(f) || f < 0 || f > 100) return bad("The admin fee must be between 0 and 100%.");
    data.adminFeePct = Math.round(f * 100) / 100;
  }
  if (b.periodStart !== undefined) data.periodStart = String(b.periodStart).slice(0, 10);
  if (b.periodEnd !== undefined) data.periodEnd = String(b.periodEnd).slice(0, 10);
  if (b.notes !== undefined) data.notes = String(b.notes).slice(0, 2000);
  if (b.poolId !== undefined) {
    if (b.poolId && !(await prisma.distributionPool.findUnique({ where: { id: String(b.poolId) } }))) return bad("That pool does not exist.");
    data.poolId = b.poolId ? String(b.poolId) : null;
  }
  if (b.stationId !== undefined) {
    if (b.stationId) {
      const s = await prisma.broadcastStation.findUnique({ where: { id: String(b.stationId) } });
      if (!s) return bad("That station does not exist.");
      data.stationId = s.id;
      data.stationName = s.name;
      data.kind = s.kind;
    } else {
      data.stationId = null;
      data.stationName = "";
    }
  }
  if (!Object.keys(data).length) return bad("Nothing to update.");
  const moneyChanged = ["amount", "adminFeePct", "poolId"].some((k) => k in data && data[k] !== (link as unknown as Record<string, unknown>)[k]);
  if (moneyChanged && link.status === "Allocated") data.status = "To be Allocated";

  await prisma.distributionPoolLink.update({ where: { id: linkId }, data });
  await logAudit(session.sub, "distribution.link-updated", {
    targetType: "Distribution",
    targetId: id,
    summary: `Edited pool link ${link.pool?.code ?? ""} ${link.stationName}`.trim(),
    changes: diffFields(link as unknown as Record<string, unknown>, data, { amount: "Amount", adminFeePct: "Admin fee %", periodStart: "Period start", periodEnd: "Period end", stationName: "Station", notes: "Notes" }).map((c) => ({
      ...c,
      field: `${c.field} (${link.stationName || link.pool?.code || "pool link"})`,
    })),
  });
  return json({ ok: true, needsAllocation: moneyChanged && link.status === "Allocated" });
}

// Remove the link, its works list and any lines it allocated.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id, linkId } = await params;
  const link = await load(id, linkId);
  if (!link) return bad("Pool link not found.", 404);
  if (link.distribution.status === "Published") return bad("This distribution is published. Unpublish it before removing pool links.");
  await prisma.distributionPoolLink.delete({ where: { id: linkId } });
  await logAudit(session.sub, "distribution.link-removed", {
    targetType: "Distribution",
    targetId: id,
    summary: `Removed pool link ${link.pool?.code ?? ""} ${link.stationName}`.trim(),
    changes: [{ field: "Pool link", from: `${[link.pool?.code, link.stationName].filter(Boolean).join(" · ")} — ZMW ${link.amount.toFixed(2)}`, to: "" }],
  });
  return json({ ok: true });
}
