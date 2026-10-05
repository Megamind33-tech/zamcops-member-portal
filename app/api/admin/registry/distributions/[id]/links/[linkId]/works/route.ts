import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { MAX_LIST_LINES, matchWorks, parseWorkList } from "@/lib/poolAllocation";
import { lockReason } from "@/lib/distLock";

export const runtime = "nodejs";

async function guard(id: string, linkId: string) {
  const link = await prisma.distributionPoolLink.findFirst({ where: { id: linkId, distributionId: id }, include: { distribution: { select: { status: true, closedAt: true } }, pool: { select: { code: true } } } });
  return link;
}

const label = (l: { pool: { code: string } | null; stationName: string }) => [l.pool?.code, l.stationName].filter(Boolean).join(" · ") || "pool link";

// Bulk add works to the link.
//   { action: "check", text }   read a pasted / uploaded list and say what each
//                               line matches — nothing is saved
//   { action: "add", items: [{ workId, weight }] }   add the chosen works
// A list line is a WIPO id (133-507-W or 507), an ISWC or an exact title, with an
// optional weight (plays / airings) after a tab or comma.
export async function POST(req: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id, linkId } = await params;
  const link = await guard(id, linkId);
  if (!link) return bad("Pool link not found.", 404);
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Invalid request body.");

  if (b.action === "check") {
    const lines = parseWorkList(String(b.text ?? ""));
    if (lines.length === 0) return bad("The list is empty. Put one work per line.");
    if (lines.length > MAX_LIST_LINES) return bad(`That list has ${lines.length.toLocaleString()} lines. Add at most ${MAX_LIST_LINES.toLocaleString()} at a time.`);
    const existing = new Set((await prisma.distributionPoolWork.findMany({ where: { linkId }, select: { workId: true } })).map((w) => w.workId));
    const rows = await matchWorks(lines, existing);
    const count = (s: string) => rows.filter((r) => r.status === s).length;
    return json({
      rows,
      summary: { lines: rows.length, matched: count("matched"), ambiguous: count("ambiguous"), notfound: count("notfound"), duplicate: count("duplicate"), already: count("already") },
    });
  }

  if (b.action === "add") {
    const locked = lockReason(link.distribution);
    if (locked) return bad(locked);
    let items: { workId?: string; weight?: number | string }[] = Array.isArray(b.items) ? b.items : [];
    if (b.workSetId) {
      const set = await prisma.workSet.findUnique({ where: { id: String(b.workSetId) }, include: { items: { select: { workId: true, weight: true } } } });
      if (!set) return bad("That work set does not exist.");
      items = set.items;
    }
    if (items.length === 0) return bad("Nothing to add.");
    if (items.length > 50000) return bad("That is too many works to add at once.");
    const want = new Map<string, number>();
    for (const it of items) {
      const w = Number(it.weight ?? 1);
      if (it.workId) want.set(String(it.workId), Number.isFinite(w) && w > 0 ? Math.round(w * 1000) / 1000 : 1);
    }
    const ids = [...want.keys()];
    const found = new Set<string>();
    for (let i = 0; i < ids.length; i += 1000) for (const w of await prisma.registryWork.findMany({ where: { id: { in: ids.slice(i, i + 1000) } }, select: { id: true } })) found.add(w.id);
    const existing = new Map((await prisma.distributionPoolWork.findMany({ where: { linkId }, select: { workId: true, weight: true } })).map((w) => [w.workId, w.weight]));

    const fresh = ids.filter((w) => found.has(w) && !existing.has(w));
    const reweigh = ids.filter((w) => existing.has(w) && existing.get(w) !== want.get(w));
    for (let i = 0; i < fresh.length; i += 2000) {
      await prisma.distributionPoolWork.createMany({ data: fresh.slice(i, i + 2000).map((workId) => ({ linkId, workId, weight: want.get(workId)! })), skipDuplicates: true });
    }
    for (const workId of reweigh) await prisma.distributionPoolWork.update({ where: { linkId_workId: { linkId, workId } }, data: { weight: want.get(workId)! } });

    if (fresh.length || reweigh.length) {
      if (link.status !== "To be Allocated") await prisma.distributionPoolLink.update({ where: { id: linkId }, data: { status: "To be Allocated" } });
      await logAudit(session.sub, "distribution.link-works-added", {
        targetType: "Distribution",
        targetId: id,
        summary: `Added ${fresh.length.toLocaleString()} work${fresh.length === 1 ? "" : "s"} to ${label(link)}`,
        changes: [{ field: `Works (${label(link)})`, from: `${existing.size.toLocaleString()}`, to: `${(existing.size + fresh.length).toLocaleString()}` }],
      });
    }
    return json({ added: fresh.length, updated: reweigh.length, unchanged: ids.filter((w) => existing.has(w) && !reweigh.includes(w)).length, missing: ids.filter((w) => !found.has(w) && !existing.has(w)).length });
  }

  return bad("Unknown action.");
}

// Change weights: { items: [{ workId, weight }] }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id, linkId } = await params;
  const link = await guard(id, linkId);
  if (!link) return bad("Pool link not found.", 404);
  const locked = lockReason(link.distribution);
  if (locked) return bad(locked);
  const b = await req.json().catch(() => null);
  if (!Array.isArray(b?.items) || b.items.length === 0) return bad("Nothing to update.");
  for (const it of b.items as { workId?: string; weight?: number | string }[]) {
    const w = Number(it.weight);
    if (!it.workId || !Number.isFinite(w) || w <= 0) return bad("Every weight must be greater than zero.");
    await prisma.distributionPoolWork.updateMany({ where: { linkId, workId: String(it.workId) }, data: { weight: Math.round(w * 1000) / 1000 } });
  }
  if (link.status !== "To be Allocated") await prisma.distributionPoolLink.update({ where: { id: linkId }, data: { status: "To be Allocated" } });
  await logAudit(session.sub, "distribution.link-works-weighted", { targetType: "Distribution", targetId: id, summary: `Changed ${b.items.length} work weight${b.items.length === 1 ? "" : "s"} on ${label(link)}` });
  return json({ ok: true });
}

// Remove works: { workIds: [...] } or { all: true }
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id, linkId } = await params;
  const link = await guard(id, linkId);
  if (!link) return bad("Pool link not found.", 404);
  const locked = lockReason(link.distribution);
  if (locked) return bad(locked);
  const b = await req.json().catch(() => null);
  const before = await prisma.distributionPoolWork.count({ where: { linkId } });
  let removed = 0;
  if (b?.all === true) removed = (await prisma.distributionPoolWork.deleteMany({ where: { linkId } })).count;
  else if (Array.isArray(b?.workIds) && b.workIds.length) removed = (await prisma.distributionPoolWork.deleteMany({ where: { linkId, workId: { in: b.workIds.map(String) } } })).count;
  else return bad("Say which works to remove.");
  if (removed && link.status !== "To be Allocated") await prisma.distributionPoolLink.update({ where: { id: linkId }, data: { status: "To be Allocated" } });
  if (removed) {
    await logAudit(session.sub, "distribution.link-works-removed", {
      targetType: "Distribution",
      targetId: id,
      summary: `Removed ${removed.toLocaleString()} work${removed === 1 ? "" : "s"} from ${label(link)}`,
      changes: [{ field: `Works (${label(link)})`, from: `${before.toLocaleString()}`, to: `${(before - removed).toLocaleString()}` }],
    });
  }
  return json({ removed });
}
