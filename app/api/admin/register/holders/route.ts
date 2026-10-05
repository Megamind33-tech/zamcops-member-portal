import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const PAGE_SIZE = 50;

type Ident = { code: string; label: string; value: string };
const parseIdents = (s: string): Ident[] => {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
};

// The WIPO Connect right-holder register, searchable and paged on the server —
// about twenty thousand rows, far too many to ship through the admin overview.
//   ?q=      name, IPI, NRC, WIPO id or WIPOCOS id
//   ?filter= member (linked to a portal account) | ipi (has an IPI number)
//   ?page=   1-based
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const filter = url.searchParams.get("filter") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

  const and: Prisma.RightHolderWhereInput[] = [];
  if (q) {
    and.push({
      OR: [
        { displayName: { contains: q, mode: "insensitive" } },
        { ipiNumber: { contains: q } },
        { ipiBaseNumber: { contains: q } },
        { nrc: { contains: q, mode: "insensitive" } },
        { wipoId: q },
        // the WIPOCOS id lives in the identifier list
        { identifiers: { contains: `"value":"${q.replace(/["\\]/g, "")}"`, mode: "insensitive" } },
      ],
    });
  }
  if (filter === "member") and.push({ memberId: { not: null } });
  if (filter === "ipi") and.push({ NOT: { ipiNumber: "" } });
  const where: Prisma.RightHolderWhereInput = and.length ? { AND: and } : {};

  const [rows, total, all, withIpi, linked] = await Promise.all([
    prisma.rightHolder.findMany({
      where,
      orderBy: { displayName: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { member: { select: { id: true, memberNumber: true } }, _count: { select: { shares: true } } },
    }),
    prisma.rightHolder.count({ where }),
    prisma.rightHolder.count(),
    prisma.rightHolder.count({ where: { NOT: { ipiNumber: "" } } }),
    prisma.rightHolder.count({ where: { memberId: { not: null } } }),
  ]);

  return json({
    page,
    pageSize: PAGE_SIZE,
    total,
    stats: { all, withIpi, linked },
    holders: rows.map((h) => ({
      id: h.id,
      wipoId: h.wipoId,
      displayName: h.displayName,
      kind: h.kind,
      ipiNumber: h.ipiNumber,
      ipiBaseNumber: h.ipiBaseNumber,
      wipocosId: parseIdents(h.identifiers).find((i) => i.code === "WIPOCOS")?.value ?? "",
      nrc: h.nrc,
      status: h.status,
      isAffiliated: h.isAffiliated,
      shareCount: h._count.shares,
      member: h.member,
    })),
  });
}
