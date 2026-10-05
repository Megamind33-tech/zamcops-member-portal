import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit, diffFields } from "@/lib/audit";

export const runtime = "nodejs";

const PAGE_SIZE = 50;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const set = await prisma.workSet.findUnique({ where: { id } });
  if (!set) return bad("Work set not found.", 404);

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const where = {
    setId: id,
    ...(q ? { work: { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { iswc: { contains: q, mode: "insensitive" as const } }, { wipoId: { contains: q.replace(/^133-|-W$/gi, "") } }] } } : {}),
  };
  const [total, all, items] = await Promise.all([
    prisma.workSetItem.count({ where }),
    prisma.workSetItem.aggregate({ where: { setId: id }, _count: { _all: true }, _sum: { weight: true } }),
    prisma.workSetItem.findMany({
      where,
      orderBy: { work: { title: "asc" } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { work: { select: { id: true, title: true, iswc: true, wipoId: true, shares: { take: 3, orderBy: { share: "desc" }, select: { rightHolder: { select: { displayName: true } }, name: { select: { name: true } } } } } } },
    }),
  ]);
  return json({
    set: { id: set.id, name: set.name, description: set.description, works: all._count._all, weight: all._sum.weight ?? 0 },
    page,
    pageSize: PAGE_SIZE,
    total,
    works: items.map((w) => ({
      id: w.id,
      workId: w.workId,
      weight: w.weight,
      title: w.work.title,
      iswc: w.work.iswc,
      wipoId: w.work.wipoId,
      holders: [...new Set(w.work.shares.map((s) => s.rightHolder?.displayName || s.name?.name || "").filter(Boolean))],
    })),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const b = await req.json().catch(() => null);
  const existing = await prisma.workSet.findUnique({ where: { id } });
  if (!existing) return bad("Work set not found.", 404);
  const data: Record<string, string> = {};
  if (b?.name !== undefined) {
    const n = String(b.name).trim().slice(0, 120);
    if (!n) return bad("A work set needs a name.");
    if (n !== existing.name && (await prisma.workSet.findUnique({ where: { name: n } }))) return bad(`A work set called “${n}” already exists.`, 409);
    data.name = n;
  }
  if (b?.description !== undefined) data.description = String(b.description).slice(0, 500);
  if (!Object.keys(data).length) return bad("Nothing to update.");
  await prisma.workSet.update({ where: { id }, data });
  await logAudit(session.sub, "work-set.updated", { targetType: "Work set", targetId: id, summary: `Edited work set “${data.name ?? existing.name}”`, changes: diffFields(existing as unknown as Record<string, unknown>, data, { name: "Name", description: "Description" }) });
  return json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const s = await prisma.workSet.findUnique({ where: { id }, select: { name: true } });
  if (!s) return bad("Work set not found.", 404);
  await prisma.workSet.delete({ where: { id } });
  await logAudit(session.sub, "work-set.deleted", { targetType: "Work set", targetId: id, summary: `Deleted work set “${s.name}”` });
  return json({ ok: true });
}
