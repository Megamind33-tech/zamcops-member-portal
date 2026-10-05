import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

// The next free WIPO-style main id, 133-<n>-D, after the highest already used.
async function nextCode(): Promise<string> {
  const codes = await prisma.distribution.findMany({ where: { code: { startsWith: "133-" } }, select: { code: true } });
  const max = codes.reduce((m, c) => Math.max(m, Number(/^133-(\d+)-D$/.exec(c.code)?.[1] ?? 0)), 0);
  return `133-${max + 1}-D`;
}

// WIPO Connect's Distribution list.
//   ?status=Open|Closed|all   Open = not Done (default)
//   ?q=                       main id or name
//   ?page= ?pageSize=
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const u = new URL(req.url).searchParams;
  const status = u.get("status") ?? "Open";
  const q = (u.get("q") ?? "").trim().slice(0, 80);
  const pageSize = [25, 50, 100, 200].includes(Number(u.get("pageSize"))) ? Number(u.get("pageSize")) : 50;
  const page = Math.max(1, Number(u.get("page")) || 1);

  const and: Prisma.DistributionWhereInput[] = [];
  if (status === "Open") and.push({ closedAt: null });
  if (status === "Closed") and.push({ closedAt: { not: null } });
  if (q) and.push({ OR: [{ code: { contains: q, mode: "insensitive" } }, { periodLabel: { contains: q, mode: "insensitive" } }] });
  const where: Prisma.DistributionWhereInput = and.length ? { AND: and } : {};

  const [totalAll, total, rows] = await Promise.all([
    prisma.distribution.count(),
    prisma.distribution.count({ where }),
    prisma.distribution.findMany({
      where,
      orderBy: [{ createdAt: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { links: true, entries: true } }, links: { select: { amount: true, pool: { select: { method: true } } } } },
    }),
  ]);
  const ids = rows.map((r) => r.id);
  const lineSums = ids.length ? await prisma.distributionLine.groupBy({ by: ["distributionId"], where: { distributionId: { in: ids } }, _sum: { amount: true }, _count: { _all: true } }) : [];
  const by = new Map(lineSums.map((s) => [s.distributionId, s]));

  return json({
    page,
    pageSize,
    total,
    totalAll,
    rows: rows.map((d) => {
      const linkSum = d.links.reduce((s, l) => s + l.amount, 0);
      const allocated = by.get(d.id)?._sum.amount ?? 0;
      const methods = [...new Set(d.links.map((l) => l.pool?.method).filter((m): m is string => !!m))];
      return {
        id: d.id,
        code: d.code,
        name: d.periodLabel,
        // imported runs have no pool links in the portal; their money is the allocated lines
        method: methods.length ? methods.join(",") : by.get(d.id) ? "Work List" : "",
        dpls: d._count.links,
        sum: linkSum || allocated,
        allocated,
        status: d.closedAt ? "Done" : "To be Completed",
        published: d.status === "Published",
        runAt: d.runAt,
        startDate: d.startDate,
        endDate: d.endDate,
        hasLogBased: methods.includes("Log Based"),
        payouts: d._count.entries,
      };
    }),
  });
}

// Add Distribution: Name, Start / End date, Deadline and Narrative. The main id
// (133-<n>-D) is given automatically.
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? b?.periodLabel ?? "").trim();
  if (!name) return bad("Give the distribution a name.");
  const startDate = String(b?.startDate ?? "").slice(0, 10);
  const endDate = String(b?.endDate ?? "").slice(0, 10);
  if (startDate && endDate && startDate > endDate) return bad("The end date is before the start date.");
  const d = await prisma.distribution.create({
    data: { periodLabel: name.slice(0, 120), code: await nextCode(), startDate, endDate, deadline: String(b?.deadline ?? "").slice(0, 10), notes: String(b?.notes ?? "").slice(0, 4000) },
  });
  await logAudit(session.sub, "distribution.created", { targetType: "Distribution", targetId: d.id, summary: `Added distribution ${d.code} “${d.periodLabel}”` });
  return json({ id: d.id, code: d.code }, 201);
}
