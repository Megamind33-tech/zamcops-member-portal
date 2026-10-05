import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit, diffFields } from "@/lib/audit";
import { lockReason } from "@/lib/distLock";
import { readLinkFields } from "@/lib/linkFields";

export const runtime = "nodejs";

const PAGE_SIZE = 50;

async function load(id: string, linkId: string) {
  return prisma.distributionPoolLink.findFirst({
    where: { id: linkId, distributionId: id },
    include: {
      distribution: { select: { id: true, periodLabel: true, status: true, code: true, closedAt: true } },
      pool: { include: { workMethod: { select: { id: true, name: true } }, roMethod: { select: { id: true, name: true } } } },
      station: true,
      workMethod: { select: { id: true, name: true } },
      roMethod: { select: { id: true, name: true } },
    },
  });
}

// One pool link with its list of works (?q= title / ISWC / id, ?page=) — the
// Main and Covered Works tabs of WIPO Connect's pool link window.
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
      include: { work: { select: { id: true, title: true, iswc: true, wipoId: true, status: true, shares: { take: 3, orderBy: { share: "desc" }, select: { rightHolder: { select: { displayName: true } }, name: { select: { name: true } } } } } } },
    }),
    prisma.distributionLine.aggregate({ where: { linkId }, _sum: { amount: true, adminFee: true, reserved: true }, _count: { _all: true } }),
  ]);
  const est = items.length
    ? await prisma.distributionLine.groupBy({ by: ["workId"], where: { linkId, workId: { in: items.map((w) => w.workId) } }, _sum: { amount: true } })
    : [];
  const estBy = new Map(est.map((e) => [e.workId, e._sum.amount ?? 0]));

  const pool = link.pool;
  return json({
    locked: lockReason(link.distribution),
    link: {
      id: link.id,
      seq: link.seq,
      distribution: { id: link.distribution.id, periodLabel: link.distribution.periodLabel, status: link.distribution.status, code: link.distribution.code },
      pool: pool
        ? {
            id: pool.id,
            code: pool.code,
            name: pool.name,
            kind: pool.kind,
            method: pool.method,
            rightType: pool.rightType,
            creationClass: pool.creationClass,
            workMethod: pool.workMethod?.name ?? "",
            roMethod: pool.roMethod?.name ?? "",
            adminFeePct: pool.adminFeePct,
          }
        : null,
      stationId: link.stationId,
      stationName: link.stationName,
      kind: link.kind,
      periodStart: link.periodStart,
      periodEnd: link.periodEnd,
      amount: link.amount,
      currency: link.currency,
      adminFeePct: link.adminFeePct,
      adminFeeIntl: link.adminFeeIntl,
      adminFeeIntlRevenue: link.adminFeeIntlRevenue,
      adminFeeReserved: link.adminFeeReserved,
      reserveType: link.reserveType,
      affiliation: link.affiliation,
      workMethodId: link.workMethodId,
      roMethodId: link.roMethodId,
      status: link.status,
      lastError: link.lastError,
      allocatedAt: link.allocatedAt,
      notes: link.notes,
      lines: lines._count._all,
      allocated: lines._sum.amount ?? 0,
      adminFee: lines._sum.adminFee ?? 0,
      reserved: lines._sum.reserved ?? 0,
    },
    stats: { works: all._count._all, weight: all._sum.weight ?? 0 },
    page,
    pageSize: PAGE_SIZE,
    total,
    works: items.map((w) => ({
      id: w.id,
      workId: w.workId,
      weight: w.weight,
      status: w.status,
      note: w.note,
      estimated: estBy.get(w.workId) ?? 0,
      title: w.work.title,
      iswc: w.work.iswc,
      wipoId: w.work.wipoId,
      registryStatus: w.work.status,
      holders: [...new Set(w.work.shares.map((s) => s.rightHolder?.displayName || s.name?.name || "").filter(Boolean))],
    })),
  });
}

const MONEY_FIELDS = ["amount", "adminFeePct", "adminFeeIntl", "adminFeeIntlRevenue", "adminFeeReserved", "reserveType", "affiliation", "poolId", "workMethodId", "roMethodId", "currency"] as const;

// Edit the link. Changing anything that affects the money leaves it "To be
// Allocated" until it is run again.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id, linkId } = await params;
  const link = await load(id, linkId);
  if (!link) return bad("Pool link not found.", 404);
  const locked = lockReason(link.distribution);
  if (locked) return bad(locked);
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Invalid request body.");

  const read = await readLinkFields(b as Record<string, unknown>);
  if ("error" in read) return bad(read.error);
  const data: Record<string, string | number | boolean | null> = { ...read.data };

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
  const moneyChanged = MONEY_FIELDS.some((k) => k in data && data[k] !== (link as unknown as Record<string, unknown>)[k]) || "periodStart" in data || "periodEnd" in data;
  if (moneyChanged && link.status !== "To be Allocated") data.status = "To be Allocated";

  await prisma.distributionPoolLink.update({ where: { id: linkId }, data });
  const label = `133-${link.seq}-DPL ${link.stationName || link.pool?.code || ""}`.trim();
  await logAudit(session.sub, "distribution.link-updated", {
    targetType: "Distribution",
    targetId: id,
    summary: `Edited pool link ${label}`,
    changes: diffFields(link as unknown as Record<string, unknown>, data, {
      amount: "Amount",
      currency: "Currency",
      adminFeePct: "Domestic admin fee %",
      adminFeeIntl: "International admin fee %",
      adminFeeIntlRevenue: "International revenue admin fee %",
      adminFeeReserved: "Reserved admin fee %",
      reserveType: "Reserve type",
      affiliation: "Paid to",
      periodStart: "Period start",
      periodEnd: "Period end",
      stationName: "Station",
      notes: "Narrative",
    }).map((c) => ({ ...c, field: `${c.field} (${label})` })),
  });
  return json({ ok: true, needsAllocation: moneyChanged && link.status === "Allocated" });
}

// Remove the link, its works list and any lines or reserves it produced.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id, linkId } = await params;
  const link = await load(id, linkId);
  if (!link) return bad("Pool link not found.", 404);
  const locked = lockReason(link.distribution);
  if (locked) return bad(locked);
  await prisma.distributionPoolLink.delete({ where: { id: linkId } });
  await logAudit(session.sub, "distribution.link-removed", {
    targetType: "Distribution",
    targetId: id,
    summary: `Removed pool link 133-${link.seq}-DPL ${link.stationName}`.trim(),
    changes: [{ field: "Pool link", from: `133-${link.seq}-DPL · ${[link.pool?.code, link.stationName].filter(Boolean).join(" · ")} — ${link.currency} ${link.amount.toFixed(2)}`, to: "" }],
  });
  return json({ ok: true });
}
