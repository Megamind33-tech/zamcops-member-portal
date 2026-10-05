import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const parse = <T,>(s: string, fallback: T): T => {
  try {
    const v = JSON.parse(s);
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

type Ident = { code: string; label: string; value: string };

// One work on the register with everything held on it: titles, identifiers,
// dates, the shares by right type (with who holds them) and the money it has
// earned in each distribution run.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;

  const w = await prisma.registryWork.findUnique({
    where: { id },
    include: {
      shares: {
        orderBy: [{ rightType: "asc" }, { share: "desc" }],
        include: {
          rightHolder: { select: { id: true, displayName: true, ipiNumber: true } },
          name: { select: { id: true, name: true, ipiNameNumber: true } },
        },
      },
    },
  });
  if (!w) return bad("Work not found.", 404);

  const lines = await prisma.distributionLine.groupBy({
    by: ["distributionId"],
    where: { workId: id },
    _sum: { amount: true, total: true, adminFee: true, reserved: true },
    _count: { _all: true },
  });
  const dists = lines.length
    ? await prisma.distribution.findMany({
        where: { id: { in: lines.map((l) => l.distributionId) } },
        select: { id: true, periodLabel: true, code: true, startDate: true, endDate: true, status: true },
      })
    : [];
  const dById = new Map(dists.map((d) => [d.id, d]));

  const declaration = w.declarationId
    ? await prisma.workDeclaration.findUnique({ where: { id: w.declarationId }, select: { id: true, title: true, status: true } })
    : null;

  return json({
    work: {
      id: w.id,
      wipoId: w.wipoId,
      title: w.title,
      alternativeTitles: parse<string[]>(w.alternativeTitles, []),
      status: w.status,
      registeredAt: w.registeredAt,
      domestic: w.domestic,
      iswc: w.iswc,
      isrc: w.isrc,
      identifiers: parse<Ident[]>(w.identifiers, []),
      genre: w.genre,
      dates: parse<{ code: string; value: string; territory: string }[]>(w.dates, []),
      extra: parse<Record<string, string>>(w.extra, {}),
      notes: w.notes,
      createdAt: w.createdAt,
    },
    declaration,
    shares: w.shares.map((s) => ({
      id: s.id,
      rightHolderId: s.rightHolderId,
      nameId: s.nameId,
      holderName: s.rightHolder?.displayName || s.name?.name || "",
      ipiNumber: s.rightHolder?.ipiNumber || s.name?.ipiNameNumber || "",
      roleCode: s.roleCode,
      isPublisher: s.isPublisher,
      rightType: s.rightType,
      share: s.share,
      territoryFormula: s.territoryFormula,
      validFrom: s.validFrom,
      validTo: s.validTo,
    })),
    distributions: lines
      .map((l) => ({
        distribution: dById.get(l.distributionId) ?? null,
        lines: l._count._all,
        amount: l._sum.amount ?? 0,
        total: l._sum.total ?? 0,
        adminFee: l._sum.adminFee ?? 0,
        reserved: l._sum.reserved ?? 0,
      }))
      .sort((a, b) => (b.distribution?.endDate ?? "").localeCompare(a.distribution?.endDate ?? "")),
  });
}

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

type ShareIn = {
  id?: string;
  rightHolderId?: string | null;
  nameId?: string | null;
  roleCode?: string;
  isPublisher?: boolean;
  rightType?: string;
  share?: number | string;
  territoryFormula?: string;
  validFrom?: string;
  validTo?: string;
};

// Edit the work's particulars and/or replace its list of shares. Shares are
// sent as the complete list; anything not in it is removed.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Invalid request body.");

  const existing = await prisma.registryWork.findUnique({ where: { id } });
  if (!existing) return bad("Work not found.", 404);

  const data: Record<string, unknown> = {};
  if (b.title !== undefined) {
    const t = str(b.title, 300);
    if (!t) return bad("A work needs a title.");
    data.title = t;
  }
  if (b.alternativeTitles !== undefined) {
    if (!Array.isArray(b.alternativeTitles)) return bad("Alternative titles must be a list.");
    data.alternativeTitles = JSON.stringify(b.alternativeTitles.map((t: unknown) => str(t, 300)).filter(Boolean));
  }
  for (const [k, max] of [["status", 40], ["registeredAt", 20], ["iswc", 40], ["isrc", 40], ["genre", 80], ["notes", 4000]] as const) {
    if (b[k] !== undefined) data[k] = str(b[k], max);
  }
  if (b.domestic !== undefined) data.domestic = !!b.domestic;
  if (b.identifiers !== undefined) {
    if (!Array.isArray(b.identifiers)) return bad("Identifiers must be a list.");
    data.identifiers = JSON.stringify(
      b.identifiers
        .map((i: Ident) => ({ code: str(i?.code, 40), label: str(i?.label, 80), value: str(i?.value, 120) }))
        .filter((i: Ident) => i.value),
    );
  }

  let shares: (Required<Omit<ShareIn, "id" | "share">> & { share: number })[] | null = null;
  if (b.shares !== undefined) {
    if (!Array.isArray(b.shares)) return bad("Shares must be a list.");
    shares = [];
    for (const s of b.shares as ShareIn[]) {
      const n = Number(s.share);
      if (!Number.isFinite(n) || n < 0 || n > 100) return bad("Every share must be a number between 0 and 100.");
      shares.push({
        rightHolderId: s.rightHolderId || null,
        nameId: s.nameId || null,
        roleCode: str(s.roleCode, 20),
        isPublisher: !!s.isPublisher,
        rightType: str(s.rightType, 40),
        share: Math.round(n * 10000) / 10000,
        territoryFormula: str(s.territoryFormula, 200),
        validFrom: str(s.validFrom, 20),
        validTo: str(s.validTo, 20),
      });
    }
    // Each right type that has shares may not exceed 100%.
    const byType = new Map<string, number>();
    for (const s of shares) byType.set(s.rightType, (byType.get(s.rightType) ?? 0) + s.share);
    for (const [type, total] of byType) {
      if (total > 100.01) return bad(`${type || "Shares"} total ${Math.round(total * 100) / 100}% — it can't be more than 100%.`);
    }
    const ids = [...new Set(shares.map((s) => s.rightHolderId).filter((x): x is string => !!x))];
    if (ids.length) {
      const found = await prisma.rightHolder.count({ where: { id: { in: ids } } });
      if (found !== ids.length) return bad("One of the right-holders on these shares no longer exists.");
    }
  }

  if (Object.keys(data).length === 0 && shares === null) return bad("Nothing to update.");

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length) await tx.registryWork.update({ where: { id }, data });
    if (shares !== null) {
      // keep the name row only when it still belongs to the chosen holder
      const names = await tx.rightHolderName.findMany({
        where: { id: { in: shares.map((s) => s.nameId).filter((x): x is string => !!x) } },
        select: { id: true, rightHolderId: true },
      });
      const nameOwner = new Map(names.map((n) => [n.id, n.rightHolderId]));
      await tx.workShare.deleteMany({ where: { workId: id } });
      await tx.workShare.createMany({
        data: shares.map((s) => ({
          ...s,
          workId: id,
          nameId: s.nameId && nameOwner.get(s.nameId) === s.rightHolderId ? s.nameId : null,
        })),
      });
    }
  });

  await logAudit(session.sub, "registry-work.updated", {
    targetType: "Register work",
    targetId: id,
    summary: `Edited “${(data.title as string) ?? existing.title}”${shares !== null ? ` (${shares.length} shares)` : ""}`,
  });
  return json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const w = await prisma.registryWork.findUnique({ where: { id }, select: { title: true } });
  if (!w) return bad("Work not found.", 404);
  await prisma.registryWork.delete({ where: { id } });
  await logAudit(session.sub, "registry-work.deleted", {
    targetType: "Register work",
    targetId: id,
    summary: `Removed “${w.title}” from the register`,
  });
  return json({ ok: true });
}
