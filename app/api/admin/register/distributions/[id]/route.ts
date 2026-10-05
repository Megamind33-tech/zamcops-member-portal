import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const PAGE_SIZE = 50;

// One distribution run: what it covers, the totals, and the allocations grouped
// by right owner (default) or by work, biggest first.
//   ?view=holders|works   ?q=name or title   ?page=1-based
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id } = await params;
  const run = await prisma.distribution.findUnique({ where: { id }, include: { _count: { select: { entries: true } } } });
  if (!run) return bad("Distribution not found.", 404);

  const url = new URL(req.url);
  const view = url.searchParams.get("view") === "works" ? "works" : "holders";
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

  const where: Prisma.DistributionLineWhereInput = { distributionId: id };
  if (q) {
    const words = q.split(/\s+/).filter(Boolean).slice(0, 4);
    where.AND = words.map((w) =>
      view === "works"
        ? { work: { title: { contains: w, mode: "insensitive" as const } } }
        : { rightHolder: { displayName: { contains: w, mode: "insensitive" as const } } },
    );
  }

  const key = view === "works" ? "workId" : "rightHolderId";
  const [totals, holders, works, groups, allGroups] = await Promise.all([
    prisma.distributionLine.aggregate({ where: { distributionId: id }, _sum: { amount: true, adminFee: true, reserved: true }, _count: { _all: true } }),
    prisma.distributionLine.groupBy({ by: ["rightHolderId"], where: { distributionId: id } }),
    prisma.distributionLine.groupBy({ by: ["workId"], where: { distributionId: id } }),
    prisma.distributionLine.groupBy({
      by: [key],
      where,
      _sum: { amount: true, adminFee: true, reserved: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.distributionLine.groupBy({ by: [key], where }),
  ]);

  const ids = groups.map((g) => (g as Record<string, unknown>)[key] as string | null).filter(Boolean) as string[];
  const names = new Map<string, { label: string; sub: string; memberId?: string | null }>();
  if (view === "works") {
    for (const w of await prisma.registryWork.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, iswc: true } })) names.set(w.id, { label: w.title, sub: w.iswc });
  } else {
    for (const h of await prisma.rightHolder.findMany({ where: { id: { in: ids } }, select: { id: true, displayName: true, ipiNumber: true, memberId: true } }))
      names.set(h.id, { label: h.displayName, sub: h.ipiNumber ? `IPI ${h.ipiNumber}` : "", memberId: h.memberId });
  }

  return json({
    run: {
      id: run.id,
      periodLabel: run.periodLabel,
      code: run.code,
      status: run.status,
      startDate: run.startDate,
      endDate: run.endDate,
      notes: run.notes,
      imported: !!run.wipoId,
      memberPayouts: run._count.entries,
    },
    totals: {
      lines: totals._count._all,
      allocated: totals._sum.amount ?? 0,
      adminFee: totals._sum.adminFee ?? 0,
      reserved: totals._sum.reserved ?? 0,
      rightHolders: holders.filter((h) => h.rightHolderId).length,
      works: works.filter((w) => w.workId).length,
    },
    view,
    page,
    pageSize: PAGE_SIZE,
    total: allGroups.length,
    rows: groups.map((g) => {
      const rec = g as unknown as Record<string, unknown>;
      const gid = rec[key] as string | null;
      const n = gid ? names.get(gid) : undefined;
      return {
        id: gid,
        label: n?.label ?? (gid ? "(removed)" : "Not attributed to anyone on the register"),
        sub: n?.sub ?? "",
        memberId: n?.memberId ?? null,
        lines: (g._count as { _all: number })._all,
        amount: (g._sum as { amount: number | null }).amount ?? 0,
        adminFee: (g._sum as { adminFee: number | null }).adminFee ?? 0,
        reserved: (g._sum as { reserved: number | null }).reserved ?? 0,
      };
    }),
  });
}
