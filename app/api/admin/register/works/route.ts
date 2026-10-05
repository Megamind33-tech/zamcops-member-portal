import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const PAGE_SIZE = 50;

// The works register, searchable and paged on the server (about 100,000 works).
//   ?q=       each word matches the title, another title, or a right-holder on the work;
//             ISWC / ISRC / WIPO id match the whole text
//   ?status=  exact status
//   ?page=    1-based
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const status = (url.searchParams.get("status") ?? "").slice(0, 40);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

  const and: Prisma.RegistryWorkWhereInput[] = [];
  if (q) {
    const words = q.split(/\s+/).filter(Boolean).slice(0, 5);
    and.push({
      OR: [
        {
          AND: words.map((w) => ({
            OR: [
              { title: { contains: w, mode: "insensitive" as const } },
              { alternativeTitles: { contains: w, mode: "insensitive" as const } },
              { shares: { some: { rightHolder: { displayName: { contains: w, mode: "insensitive" as const } } } } },
            ],
          })),
        },
        { iswc: { contains: q, mode: "insensitive" } },
        { isrc: { contains: q, mode: "insensitive" } },
        { wipoId: q },
      ],
    });
  }
  if (status) and.push({ status });
  const where: Prisma.RegistryWorkWhereInput = and.length ? { AND: and } : {};

  const [rows, total, all, byStatus] = await Promise.all([
    prisma.registryWork.findMany({
      where,
      orderBy: { title: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        shares: { take: 6, include: { rightHolder: { select: { displayName: true } } } },
        _count: { select: { shares: true } },
      },
    }),
    prisma.registryWork.count({ where }),
    prisma.registryWork.count(),
    prisma.registryWork.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { _count: { status: "desc" } } }),
  ]);

  return json({
    page,
    pageSize: PAGE_SIZE,
    total,
    stats: { all, byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })) },
    works: rows.map((w) => ({
      id: w.id,
      wipoId: w.wipoId,
      title: w.title,
      status: w.status,
      iswc: w.iswc,
      genre: w.genre,
      registeredAt: w.registeredAt,
      edited: !!w.editedAt,
      shareCount: w._count.shares,
      writers: [...new Set(w.shares.map((s) => s.rightHolder?.displayName).filter(Boolean))].slice(0, 3),
    })),
  });
}
