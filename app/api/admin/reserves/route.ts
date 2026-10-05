import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const PAGE_SIZE = 50;

// Reserve Management — money held back by allocations (unidentified,
// non-society, incomplete, undistributable, disputed), searchable like WIPO
// Connect: ?distributionId= ?className= ?creationClass= ?rightType= ?reserveType=
// ?status= ?from= ?to= (reserved date) ?page= ?format=csv
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const u = new URL(req.url).searchParams;
  const page = Math.max(1, Number(u.get("page")) || 1);
  const csv = u.get("format") === "csv";

  const and: Prisma.ReserveWhereInput[] = [];
  const eq = (k: "distributionId" | "className" | "creationClass" | "rightType" | "reserveType" | "status") => {
    const v = u.get(k);
    if (v) and.push({ [k]: v });
  };
  (["distributionId", "className", "creationClass", "rightType", "reserveType", "status"] as const).forEach(eq);
  const from = u.get("from");
  const to = u.get("to");
  if (from && !isNaN(Date.parse(from))) and.push({ reservedAt: { gte: new Date(from) } });
  if (to && !isNaN(Date.parse(to))) and.push({ reservedAt: { lte: new Date(`${to}T23:59:59`) } });
  const where: Prisma.ReserveWhereInput = and.length ? { AND: and } : {};

  const paging: { skip?: number; take: number } = csv ? { take: 20000 } : { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE };
  const include = { distribution: { select: { id: true, periodLabel: true, code: true } }, link: { select: { id: true, seq: true } } };
  const [total, sums, distributions, rows] = await Promise.all([
    prisma.reserve.count({ where }),
    prisma.reserve.aggregate({ where, _sum: { amount: true, distributableAmount: true, distributedAmount: true } }),
    prisma.distribution.findMany({ where: { reserves: { some: {} } }, select: { id: true, periodLabel: true, code: true }, orderBy: { createdAt: "desc" } }),
    prisma.reserve.findMany({ where, orderBy: { reservedAt: "desc" }, include, ...paging }),
  ]);

  const shape = rows.map((r) => ({
    id: r.id,
    distributionId: r.distributionId,
    distribution: r.distribution.code || r.distribution.periodLabel,
    linkId: r.linkId,
    dpl: r.link ? `133-${r.link.seq}-DPL` : "",
    className: r.className,
    subClass: r.subClass,
    creationClass: r.creationClass,
    rightType: r.rightType,
    reserveType: r.reserveType,
    reservedAt: r.reservedAt.toISOString(),
    closedAt: r.closedAt ? r.closedAt.toISOString() : null,
    amount: r.amount,
    distributable: r.distributableAmount,
    distributed: r.distributedAmount,
    status: r.status,
    notes: r.notes,
  }));

  if (csv) {
    const head = ["Distribution", "DPL", "Class", "Sub class", "Creation class", "Right type", "Reserve type", "Reserved date", "Closed/Prescribed date", "Amount", "Distributable", "Distributed", "Status"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = shape.map((r) => [r.distribution, r.dpl, r.className, r.subClass, r.creationClass, r.rightType, r.reserveType, r.reservedAt.slice(0, 10), r.closedAt?.slice(0, 10) ?? "", r.amount, r.distributable, r.distributed, r.status].map(esc).join(","));
    return new Response([head.join(","), ...body].join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="reserves.csv"', "Cache-Control": "no-store" } });
  }

  return json({
    page,
    pageSize: PAGE_SIZE,
    total,
    totals: { amount: sums._sum.amount ?? 0, distributable: sums._sum.distributableAmount ?? 0, distributed: sums._sum.distributedAmount ?? 0 },
    distributions,
    rows: shape,
  });
}
