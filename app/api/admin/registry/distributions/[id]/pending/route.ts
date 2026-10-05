import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";

const PAGE_SIZE = 50;

// Pending works — the works in a run's pool links that could not be paid in
// full (WIPO Connect "Pend. Works"). Each comes with the reason, so staff can
// open the work, fix its shares or status, and run the link again.
//   ?q=     title / ISWC
//   ?page=  1-based
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const d = await prisma.distribution.findUnique({ where: { id }, select: { id: true } });
  if (!d) return bad("Distribution not found.", 404);

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const where = {
    link: { distributionId: id },
    status: { in: ["Partially distributable", "Not distributable"] },
    ...(q ? { work: { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { iswc: { contains: q, mode: "insensitive" as const } }] } } : {}),
  };
  const [total, notRun, rows, byStatus] = await Promise.all([
    prisma.distributionPoolWork.count({ where }),
    prisma.distributionPoolWork.count({ where: { link: { distributionId: id }, status: "" } }),
    prisma.distributionPoolWork.findMany({
      where,
      orderBy: [{ status: "desc" }, { work: { title: "asc" } }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { work: { select: { id: true, title: true, iswc: true, status: true, wipoId: true } }, link: { select: { id: true, seq: true, subClass: true } } },
    }),
    prisma.distributionPoolWork.groupBy({ by: ["status"], where: { link: { distributionId: id } }, _count: { _all: true } }),
  ]);
  return json({
    page,
    pageSize: PAGE_SIZE,
    total,
    notRun,
    byStatus: byStatus.map((g) => ({ status: g.status || "Not run", count: g._count._all })),
    works: rows.map((r) => ({
      id: r.id,
      workId: r.workId,
      title: r.work.title,
      iswc: r.work.iswc,
      wipoId: r.work.wipoId,
      registryStatus: r.work.status,
      status: r.status,
      note: r.note,
      linkId: r.link.id,
      linkSeq: r.link.seq,
      subClass: r.link.subClass,
    })),
  });
}
