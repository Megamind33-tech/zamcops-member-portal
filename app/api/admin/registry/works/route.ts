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
//   ?holder=  a right-holder name on any share
//   ?genre=   genre contains
//   ?from= ?to=  registration date range (YYYY-MM-DD)
//   ?page=    1-based
//   ?format=csv  the whole filtered result (up to 20,000 works) as a download
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const status = (url.searchParams.get("status") ?? "").trim();
  const filter = url.searchParams.get("filter") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const holder = (url.searchParams.get("holder") ?? "").trim().slice(0, 80);
  const genre = (url.searchParams.get("genre") ?? "").trim().slice(0, 80);
  const from = (url.searchParams.get("from") ?? "").slice(0, 10);
  const to = (url.searchParams.get("to") ?? "").slice(0, 10);
  const csv = url.searchParams.get("format") === "csv";
  const cc = (url.searchParams.get("cc") ?? "").toUpperCase().split(",").map((c) => c.trim()).filter(Boolean).slice(0, 12);
  const repertoire = url.searchParams.get("repertoire") ?? "";

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
  if (cc.length) and.push({ creationClass: { in: cc } });
  if (repertoire === "domestic") and.push({ domestic: true });
  if (repertoire === "foreign") and.push({ domestic: false });
  if (genre) and.push({ genre: { contains: genre, mode: "insensitive" } });
  if (from) and.push({ registeredAt: { gte: from } });
  if (to) and.push({ registeredAt: { lte: to } });
  for (const word of holder.split(/\s+/).filter(Boolean)) {
    and.push({ shares: { some: { OR: [{ rightHolder: { displayName: { contains: word, mode: "insensitive" } } }, { name: { name: { contains: word, mode: "insensitive" } } }] } } });
  }
  if (filter === "nosplits") and.push({ shares: { none: {} } });
  if (filter === "domestic") and.push({ domestic: true });
  if (filter === "noiswc") and.push({ iswc: "" });
  const where: Prisma.RegistryWorkWhereInput = and.length ? { AND: and } : {};

  if (csv) {
    const rows = await prisma.registryWork.findMany({
      where,
      orderBy: { title: "asc" },
      take: 20000,
      include: { shares: { include: { rightHolder: { select: { displayName: true } }, name: { select: { name: true } } } } },
    });
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Main Id", "Title", "Status", "Genre", "ISWC", "ISRC", "Registered", "Domestic", "Right-holders"];
    const body = rows.map((w) =>
      [
        w.wipoId.startsWith("local_") ? "" : w.wipoId,
        w.title,
        w.status,
        w.genre,
        w.iswc,
        w.isrc,
        w.registeredAt,
        w.domestic ? "Yes" : "No",
        [...new Set(w.shares.map((s) => s.rightHolder?.displayName || s.name?.name || "").filter(Boolean))].join("; "),
      ]
        .map(esc)
        .join(","),
    );
    return new Response([head.join(","), ...body].join("\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="registered-works.csv"', "Cache-Control": "no-store" },
    });
  }

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
          take: 8,
          orderBy: { share: "desc" },
          include: { rightHolder: { select: { displayName: true } }, name: { select: { name: true } } },
        },
      },
    }),
    prisma.registryWork.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.registryWork.count(),
  ]);

  // Distributable Status: how much of the performing right is held by identified right owners
  const identified = await prisma.workShare.groupBy({
    by: ["workId", "rightType"],
    where: { workId: { in: works.map((w) => w.id) }, rightHolderId: { not: null } },
    _sum: { share: true },
  });
  const idSum = new Map<string, number>();
  for (const g of identified) if (g.rightType.trim().toLowerCase() === "performing") idSum.set(g.workId, g._sum.share ?? 0);
  const distributable = (id: string) => {
    const v = idSum.get(id) ?? 0;
    return v >= 99.99 ? "Fully Distributable" : v > 0 ? "Partially Distributable" : "Not Distributable";
  };

  return json({
    page,
    pageSize: PAGE_SIZE,
    total,
    stats: { all, statuses: statuses.map((s) => ({ status: s.status, count: s._count._all })) },
    works: works.map((w) => {
      const names = [...new Set(w.shares.map((s) => s.rightHolder?.displayName || s.name?.name || "Unknown"))];
      return {
      id: w.id,
      wipoId: w.wipoId,
      title: w.title,
      status: w.status,
      genre: w.genre,
      iswc: w.iswc,
      isrc: w.isrc,
      domestic: w.domestic,
      registeredAt: w.registeredAt,
      creationClass: w.creationClass,
      distributable: distributable(w.id),
      shareCount: w._count.shares,
      holders: names.slice(0, 3),
      moreHolders: names.length > 3 || w._count.shares > 8,
      };
    }),
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
