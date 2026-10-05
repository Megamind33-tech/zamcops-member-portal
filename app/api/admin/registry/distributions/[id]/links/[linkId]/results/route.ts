import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";

const PAGE_SIZE = 50;

// The outcome of a pool link's allocation — WIPO Connect's "Results".
//   ?view=works     what each work earned, and whether it could be paid in full
//   ?view=holders   what each right-holder was allocated
//   ?view=reserves  what was held back and why
//   ?page=          1-based
export async function GET(req: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id, linkId } = await params;
  const link = await prisma.distributionPoolLink.findFirst({ where: { id: linkId, distributionId: id }, select: { id: true, status: true, allocatedAt: true, amount: true, currency: true } });
  if (!link) return bad("Pool link not found.", 404);

  const url = new URL(req.url);
  const view = ["works", "holders", "reserves"].includes(url.searchParams.get("view") ?? "") ? url.searchParams.get("view")! : "works";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [totals, reserveGroups, statusGroups] = await Promise.all([
    prisma.distributionLine.aggregate({ where: { linkId }, _sum: { amount: true, adminFee: true, reserved: true }, _count: { _all: true } }),
    prisma.distributionLine.groupBy({ by: ["reserveType"], where: { linkId, reserved: { gt: 0 } }, _sum: { reserved: true }, _count: { _all: true } }),
    prisma.distributionPoolWork.groupBy({ by: ["status"], where: { linkId }, _count: { _all: true } }),
  ]);
  const amount = totals._sum.amount ?? 0;
  const reserved = totals._sum.reserved ?? 0;
  const summary = {
    allocated: amount,
    reserved,
    paid: Math.round((amount - reserved) * 100) / 100,
    adminFee: totals._sum.adminFee ?? 0,
    net: Math.round((amount - reserved - (totals._sum.adminFee ?? 0)) * 100) / 100,
    lines: totals._count._all,
    reserves: reserveGroups.map((g) => ({ type: g.reserveType || "Reserved", amount: g._sum.reserved ?? 0, lines: g._count._all })),
    works: statusGroups.map((g) => ({ status: g.status || "Not run", count: g._count._all })),
  };

  let rows: Record<string, string | number | null>[] = [];
  let total = 0;

  if (view === "works") {
    total = await prisma.distributionPoolWork.count({ where: { linkId } });
    const works = await prisma.distributionPoolWork.findMany({
      where: { linkId },
      orderBy: { work: { title: "asc" } },
      skip,
      take: PAGE_SIZE,
      include: { work: { select: { id: true, title: true, wipoId: true } } },
    });
    const sums = works.length ? await prisma.distributionLine.groupBy({ by: ["workId"], where: { linkId, workId: { in: works.map((w) => w.workId) } }, _sum: { amount: true, reserved: true, adminFee: true }, _count: { _all: true } }) : [];
    const by = new Map(sums.map((s) => [s.workId, s]));
    rows = works.map((w) => ({
      id: w.workId,
      title: w.work.title,
      wipoId: w.work.wipoId,
      weight: w.weight,
      status: w.status || "Not run",
      note: w.note,
      lines: by.get(w.workId)?._count._all ?? 0,
      amount: by.get(w.workId)?._sum.amount ?? 0,
      reserved: by.get(w.workId)?._sum.reserved ?? 0,
      adminFee: by.get(w.workId)?._sum.adminFee ?? 0,
    }));
  } else if (view === "holders") {
    const groups = await prisma.distributionLine.groupBy({ by: ["rightHolderId"], where: { linkId }, _sum: { amount: true, reserved: true, adminFee: true }, _count: { _all: true }, orderBy: { _sum: { amount: "desc" } }, skip, take: PAGE_SIZE });
    total = (await prisma.distributionLine.groupBy({ by: ["rightHolderId"], where: { linkId } })).length;
    const hs = await prisma.rightHolder.findMany({ where: { id: { in: groups.map((g) => g.rightHolderId).filter((x): x is string => !!x) } }, select: { id: true, displayName: true, ipiNumber: true, isAffiliated: true } });
    const by = new Map(hs.map((h) => [h.id, h]));
    rows = groups.map((g) => ({
      id: g.rightHolderId,
      name: (g.rightHolderId && by.get(g.rightHolderId)?.displayName) || "Unidentified right-holder",
      ipiNumber: (g.rightHolderId && by.get(g.rightHolderId)?.ipiNumber) || "",
      affiliated: g.rightHolderId ? (by.get(g.rightHolderId)?.isAffiliated ? "Yes" : "No") : "",
      lines: g._count._all,
      amount: g._sum.amount ?? 0,
      reserved: g._sum.reserved ?? 0,
      adminFee: g._sum.adminFee ?? 0,
    }));
  } else {
    total = await prisma.reserve.count({ where: { linkId } });
    const rs = await prisma.reserve.findMany({ where: { linkId }, orderBy: { amount: "desc" }, skip, take: PAGE_SIZE });
    rows = rs.map((r) => ({
      id: r.id,
      reserveType: r.reserveType,
      status: r.status,
      reservedAt: r.reservedAt.toISOString(),
      amount: r.amount,
      distributable: r.distributableAmount,
      distributed: r.distributedAmount,
    }));
  }

  return json({ link: { status: link.status, allocatedAt: link.allocatedAt, amount: link.amount, currency: link.currency }, summary, view, page, pageSize: PAGE_SIZE, total, rows });
}
