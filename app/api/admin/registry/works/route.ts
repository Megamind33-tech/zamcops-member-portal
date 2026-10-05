import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const PAGE_SIZE = 50;

// The society's register of works (the WIPO Connect works list), searched and
// paged on the server — far too many rows for the admin overview.
//   ?q=       title, alternative title, ISWC, ISRC or WIPO id
//   ?status=  exact register status
//   ?filter=  nosplits (no shares recorded) | domestic | noiswc
//   ?page=    1-based
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const status = (url.searchParams.get("status") ?? "").trim();
  const filter = url.searchParams.get("filter") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

  const and: Prisma.RegistryWorkWhereInput[] = [];
  if (q) {
    for (const word of q.split(/\s+/).filter(Boolean)) {
      and.push({
        OR: [
          { title: { contains: word, mode: "insensitive" } },
          { alternativeTitles: { contains: word, mode: "insensitive" } },
          { iswc: { contains: word, mode: "insensitive" } },
          { isrc: { contains: word, mode: "insensitive" } },
          { wipoId: { contains: word } },
        ],
      });
    }
  }
  if (status) and.push({ status });
  if (filter === "nosplits") and.push({ shares: { none: {} } });
  if (filter === "domestic") and.push({ domestic: true });
  if (filter === "noiswc") and.push({ iswc: "" });
  const where: Prisma.RegistryWorkWhereInput = and.length ? { AND: and } : {};

  const [total, works, statuses, all] = await Promise.all([
    prisma.registryWork.count({ where }),
    prisma.registryWork.findMany({
      where,
      orderBy: { title: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { shares: true } },
        shares: {
          take: 3,
          orderBy: { share: "desc" },
          include: { rightHolder: { select: { displayName: true } }, name: { select: { name: true } } },
        },
      },
    }),
    prisma.registryWork.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.registryWork.count(),
  ]);

  return json({
    page,
    pageSize: PAGE_SIZE,
    total,
    stats: { all, statuses: statuses.map((s) => ({ status: s.status, count: s._count._all })) },
    works: works.map((w) => ({
      id: w.id,
      wipoId: w.wipoId,
      title: w.title,
      status: w.status,
      genre: w.genre,
      iswc: w.iswc,
      isrc: w.isrc,
      domestic: w.domestic,
      registeredAt: w.registeredAt,
      shareCount: w._count.shares,
      holders: w.shares.map((s) => s.rightHolder?.displayName || s.name?.name || "Unknown"),
    })),
  });
}

// Registers a new work by hand (one that is not in the WIPO import).
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const b = await req.json().catch(() => null);
  const title = String(b?.title ?? "").trim();
  if (!title) return bad("Give the work a title.");

  const { logAudit } = await import("@/lib/audit");
  const work = await prisma.registryWork.create({
    data: {
      wipoId: `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      title: title.slice(0, 300),
      status: String(b?.status ?? "").trim().slice(0, 40),
      genre: String(b?.genre ?? "").trim().slice(0, 80),
      iswc: String(b?.iswc ?? "").trim().slice(0, 40),
      isrc: String(b?.isrc ?? "").trim().slice(0, 40),
      registeredAt: new Date().toISOString().slice(0, 10),
    },
  });
  await logAudit(session.sub, "registry-work.created", {
    targetType: "Register work",
    targetId: work.id,
    summary: `Added “${work.title}” to the register`,
  });
  return json({ id: work.id }, 201);
}
