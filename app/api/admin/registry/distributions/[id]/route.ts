import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit, diffFields } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const PAGE_SIZE = 50;

// A distribution run opened up: its totals, and what it allocated — grouped by
// right-holder (view=holders, default), by work (view=works), or line by line
// (view=lines). Imported WIPO runs carry lines, not the per-member payouts the
// portal's own periods use, so this is where past runs are checked.
//   ?q=     holder or work name
//   ?page=  1-based
//   ?format=csv  the current view, all pages, as a download
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const url = new URL(req.url);
  const view = ["holders", "works", "lines"].includes(url.searchParams.get("view") ?? "") ? url.searchParams.get("view")! : "holders";
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const csv = url.searchParams.get("format") === "csv";

  const d = await prisma.distribution.findUnique({ where: { id }, include: { _count: { select: { entries: true, lines: true } } } });
  if (!d) return bad("Distribution not found.", 404);

  const and: Prisma.DistributionLineWhereInput[] = [{ distributionId: id }];
  for (const word of q.split(/\s+/).filter(Boolean)) {
    and.push({
      OR: [
        { rightHolder: { displayName: { contains: word, mode: "insensitive" } } },
        { rightHolder: { ipiNumber: { contains: word } } },
        { work: { title: { contains: word, mode: "insensitive" } } },
      ],
    });
  }
  const where: Prisma.DistributionLineWhereInput = { AND: and };
  const take = csv ? 100000 : PAGE_SIZE;
  const skip = csv ? 0 : (page - 1) * PAGE_SIZE;

  const totals = await prisma.distributionLine.aggregate({
    where: { distributionId: id },
    _sum: { amount: true, total: true, adminFee: true, reserved: true },
    _count: { _all: true },
  });
  const disputed = await prisma.distributionLine.count({ where: { distributionId: id, disputed: true } });
  const [holderCount, workCount] = await Promise.all([
    prisma.distributionLine.groupBy({ by: ["rightHolderId"], where: { distributionId: id } }).then((r) => r.length),
    prisma.distributionLine.groupBy({ by: ["workId"], where: { distributionId: id } }).then((r) => r.length),
  ]);

  // Summary / Analysis tabs: what the run paid, to whom and what is held back.
  const [byHolder, byWork, disputedSum] = await Promise.all([
    prisma.distributionLine.groupBy({ by: ["rightHolderId"], where: { distributionId: id }, _sum: { amount: true, adminFee: true, reserved: true }, _count: { _all: true } }),
    prisma.distributionLine.groupBy({ by: ["workId"], where: { distributionId: id }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.distributionLine.aggregate({ where: { distributionId: id, disputed: true }, _sum: { amount: true } }),
  ]);
  const holderRows = await prisma.rightHolder.findMany({
    where: { id: { in: byHolder.map((g) => g.rightHolderId).filter((x): x is string => !!x) } },
    select: { id: true, isAffiliated: true },
  });
  const affiliated = new Set(holderRows.filter((h) => h.isAffiliated).map((h) => h.id));
  const workRows = await prisma.registryWork.findMany({
    where: { id: { in: byWork.map((g) => g.workId).filter((x): x is string => !!x) } },
    select: { id: true, domestic: true },
  });
  const domesticWork = new Map(workRows.map((w) => [w.id, w.domestic]));
  const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;
  const breakdown = {
    affiliated: { holders: byHolder.filter((g) => g.rightHolderId && affiliated.has(g.rightHolderId)).length, amount: sum(byHolder.filter((g) => g.rightHolderId && affiliated.has(g.rightHolderId)).map((g) => g._sum.amount ?? 0)) },
    other: { holders: byHolder.filter((g) => g.rightHolderId && !affiliated.has(g.rightHolderId)).length, amount: sum(byHolder.filter((g) => g.rightHolderId && !affiliated.has(g.rightHolderId)).map((g) => g._sum.amount ?? 0)) },
    unidentified: { lines: byHolder.filter((g) => !g.rightHolderId).reduce((a, g) => a + g._count._all, 0), amount: sum(byHolder.filter((g) => !g.rightHolderId).map((g) => g._sum.amount ?? 0)) },
    domesticWorks: byWork.filter((g) => g.workId && domesticWork.get(g.workId)).length,
    internationalWorks: byWork.filter((g) => g.workId && domesticWork.get(g.workId) === false).length,
    unmatchedWorkLines: byWork.filter((g) => !g.workId).reduce((a, g) => a + g._count._all, 0),
    disputedAmount: disputedSum._sum.amount ?? 0,
  };

  type Row = Record<string, string | number | boolean | null>;
  let rows: Row[] = [];
  let total = 0;

  if (view === "lines") {
    total = await prisma.distributionLine.count({ where });
    const lines = await prisma.distributionLine.findMany({
      where,
      orderBy: { amount: "desc" },
      skip,
      take,
      include: { rightHolder: { select: { id: true, displayName: true } }, work: { select: { id: true, title: true } } },
    });
    rows = lines.map((l) => ({
      id: l.id,
      holderId: l.rightHolderId,
      holder: l.rightHolder?.displayName ?? "Unknown",
      workId: l.workId,
      work: l.work?.title ?? "Unknown",
      roleCode: l.roleCode,
      rightType: l.rightType,
      amount: l.amount,
      total: l.total,
      weight: l.weight,
      adminFee: l.adminFee,
      reserved: l.reserved,
      disputed: l.disputed,
    }));
  } else {
    const key = view === "holders" ? "rightHolderId" : "workId";
    const groups = await prisma.distributionLine.groupBy({
      by: [key],
      where,
      _sum: { amount: true, total: true, adminFee: true, reserved: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
      skip,
      take,
    });
    total = (await prisma.distributionLine.groupBy({ by: [key], where })).length;
    const ids = groups.map((g) => g[key]).filter((x): x is string => !!x);
    if (view === "holders") {
      const hs = await prisma.rightHolder.findMany({ where: { id: { in: ids } }, select: { id: true, displayName: true, ipiNumber: true } });
      const by = new Map(hs.map((h) => [h.id, h]));
      rows = groups.map((g) => ({
        id: g.rightHolderId,
        name: (g.rightHolderId && by.get(g.rightHolderId)?.displayName) || "Unknown / not on the register",
        ipiNumber: (g.rightHolderId && by.get(g.rightHolderId)?.ipiNumber) || "",
        lines: g._count._all,
        amount: g._sum.amount ?? 0,
        total: g._sum.total ?? 0,
        adminFee: g._sum.adminFee ?? 0,
        reserved: g._sum.reserved ?? 0,
      }));
    } else {
      const ws = await prisma.registryWork.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, iswc: true } });
      const by = new Map(ws.map((w) => [w.id, w]));
      rows = groups.map((g) => ({
        id: g.workId,
        name: (g.workId && by.get(g.workId)?.title) || "Unknown / not on the register",
        ipiNumber: (g.workId && by.get(g.workId)?.iswc) || "",
        lines: g._count._all,
        amount: g._sum.amount ?? 0,
        total: g._sum.total ?? 0,
        adminFee: g._sum.adminFee ?? 0,
        reserved: g._sum.reserved ?? 0,
      }));
    }
  }

  if (csv) {
    const cols = Object.keys(rows[0] ?? { name: "" }).filter((c) => c !== "id" && c !== "holderId" && c !== "workId");
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${(d.code || d.periodLabel).replace(/[^\w.-]+/g, "_")}-${view}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return json({
    distribution: {
      id: d.id,
      periodLabel: d.periodLabel,
      code: d.code,
      status: d.status,
      notes: d.notes,
      startDate: d.startDate,
      endDate: d.endDate,
      publishedAt: d.publishedAt,
      createdAt: d.createdAt,
      imported: !!d.wipoId,
      entryCount: d._count.entries,
    },
    summary: {
      lines: totals._count._all,
      holders: holderCount,
      works: workCount,
      amount: totals._sum.amount ?? 0,
      total: totals._sum.total ?? 0,
      adminFee: totals._sum.adminFee ?? 0,
      reserved: totals._sum.reserved ?? 0,
      disputed,
    },
    breakdown,
    view,
    page,
    pageSize: PAGE_SIZE,
    total,
    rows,
  });
}

const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

// Correct one allocation line: amounts and the dispute flag.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b?.lineId) return bad("Say which line to change.");

  const line = await prisma.distributionLine.findFirst({ where: { id: b.lineId, distributionId: id }, include: { work: { select: { title: true } } } });
  if (!line) return bad("That line is not in this distribution.", 404);

  const data: Prisma.DistributionLineUpdateInput = {};
  for (const k of ["amount", "total", "adminFee", "reserved"] as const) {
    if (b[k] === undefined) continue;
    const n = money(b[k]);
    if (n === null) return bad("Amounts must be zero or more.");
    data[k] = n;
  }
  if (b.disputed !== undefined) data.disputed = !!b.disputed;
  if (Object.keys(data).length === 0) return bad("Nothing to update.");

  await prisma.distributionLine.update({ where: { id: line.id }, data });
  const who = line.work ? `“${line.work.title}”` : "a line";
  const changes = diffFields(line as unknown as Record<string, unknown>, data as Record<string, unknown>, { amount: "Amount", total: "Gross", adminFee: "Admin fee", reserved: "Reserved", disputed: "Disputed" }).map((c) => ({ ...c, field: `${c.field} (${who})` }));
  await logAudit(session.sub, "distribution.line-updated", {
    targetType: "Distribution",
    targetId: id,
    summary: `Corrected an allocation line${line.work ? ` for “${line.work.title}”` : ""}`,
    changes,
  });
  return json({ ok: true });
}
