import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";

// Every distribution run on the society's books — those imported from WIPO
// Connect and any created in the portal — with what was allocated in each.
export async function GET() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const [runs, sums] = await Promise.all([
    prisma.distribution.findMany({
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      include: { _count: { select: { entries: true } } },
    }),
    prisma.distributionLine.groupBy({ by: ["distributionId"], _sum: { amount: true, adminFee: true, reserved: true }, _count: { _all: true } }),
  ]);
  const byId = new Map(sums.map((s) => [s.distributionId, s]));

  return json({
    runs: runs.map((r) => {
      const s = byId.get(r.id);
      return {
        id: r.id,
        periodLabel: r.periodLabel,
        code: r.code,
        status: r.status,
        startDate: r.startDate,
        endDate: r.endDate,
        imported: !!r.wipoId,
        notes: r.notes,
        memberPayouts: r._count.entries,
        lines: s?._count._all ?? 0,
        allocated: s?._sum.amount ?? 0,
        adminFee: s?._sum.adminFee ?? 0,
        reserved: s?._sum.reserved ?? 0,
      };
    }),
  });
}
