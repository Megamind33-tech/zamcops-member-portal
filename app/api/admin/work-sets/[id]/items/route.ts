import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { MAX_LIST_LINES, matchWorks, parseWorkList } from "@/lib/poolAllocation";

export const runtime = "nodejs";

// Bulk add works to a work set — same two steps as a pool link:
//   { action: "check", text }   say what each line matches; nothing is saved
//   { action: "add", items: [{ workId, weight }] }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const set = await prisma.workSet.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!set) return bad("Work set not found.", 404);
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Invalid request body.");

  if (b.action === "check") {
    const lines = parseWorkList(String(b.text ?? ""));
    if (lines.length === 0) return bad("The list is empty. Put one work per line.");
    if (lines.length > MAX_LIST_LINES) return bad(`That list has ${lines.length.toLocaleString()} lines. Add at most ${MAX_LIST_LINES.toLocaleString()} at a time.`);
    const existing = new Set((await prisma.workSetItem.findMany({ where: { setId: id }, select: { workId: true } })).map((w) => w.workId));
    const rows = await matchWorks(lines, existing);
    const count = (s: string) => rows.filter((r) => r.status === s).length;
    return json({ rows, summary: { lines: rows.length, matched: count("matched"), ambiguous: count("ambiguous"), notfound: count("notfound"), duplicate: count("duplicate"), already: count("already") } });
  }

  if (b.action === "add") {
    if (!Array.isArray(b.items) || b.items.length === 0) return bad("Nothing to add.");
    if (b.items.length > MAX_LIST_LINES) return bad(`Add at most ${MAX_LIST_LINES.toLocaleString()} works at a time.`);
    const want = new Map<string, number>();
    for (const it of b.items as { workId?: string; weight?: number | string }[]) {
      const w = Number(it.weight ?? 1);
      if (it.workId) want.set(String(it.workId), Number.isFinite(w) && w > 0 ? Math.round(w * 1000) / 1000 : 1);
    }
    const ids = [...want.keys()];
    const found = new Set<string>();
    for (let i = 0; i < ids.length; i += 1000) for (const w of await prisma.registryWork.findMany({ where: { id: { in: ids.slice(i, i + 1000) } }, select: { id: true } })) found.add(w.id);
    const existing = new Map((await prisma.workSetItem.findMany({ where: { setId: id }, select: { workId: true, weight: true } })).map((w) => [w.workId, w.weight]));
    const fresh = ids.filter((w) => found.has(w) && !existing.has(w));
    const reweigh = ids.filter((w) => existing.has(w) && existing.get(w) !== want.get(w));
    for (let i = 0; i < fresh.length; i += 2000) await prisma.workSetItem.createMany({ data: fresh.slice(i, i + 2000).map((workId) => ({ setId: id, workId, weight: want.get(workId)! })), skipDuplicates: true });
    for (const workId of reweigh) await prisma.workSetItem.update({ where: { setId_workId: { setId: id, workId } }, data: { weight: want.get(workId)! } });
    if (fresh.length) {
      await logAudit(session.sub, "work-set.works-added", {
        targetType: "Work set",
        targetId: id,
        summary: `Added ${fresh.length.toLocaleString()} work${fresh.length === 1 ? "" : "s"} to “${set.name}”`,
        changes: [{ field: "Works", from: `${existing.size.toLocaleString()}`, to: `${(existing.size + fresh.length).toLocaleString()}` }],
      });
    }
    return json({ added: fresh.length, updated: reweigh.length, missing: ids.filter((w) => !found.has(w) && !existing.has(w)).length });
  }
  return bad("Unknown action.");
}

// Change weights: { items: [{ workId, weight }] }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!Array.isArray(b?.items) || b.items.length === 0) return bad("Nothing to update.");
  for (const it of b.items as { workId?: string; weight?: number | string }[]) {
    const w = Number(it.weight);
    if (!it.workId || !Number.isFinite(w) || w <= 0) return bad("Every weight must be greater than zero.");
    await prisma.workSetItem.updateMany({ where: { setId: id, workId: String(it.workId) }, data: { weight: Math.round(w * 1000) / 1000 } });
  }
  return json({ ok: true });
}

// Remove works: { workIds } or { all: true }
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const set = await prisma.workSet.findUnique({ where: { id }, select: { name: true } });
  if (!set) return bad("Work set not found.", 404);
  const b = await req.json().catch(() => null);
  let removed = 0;
  if (b?.all === true) removed = (await prisma.workSetItem.deleteMany({ where: { setId: id } })).count;
  else if (Array.isArray(b?.workIds) && b.workIds.length) removed = (await prisma.workSetItem.deleteMany({ where: { setId: id, workId: { in: b.workIds.map(String) } } })).count;
  else return bad("Say which works to remove.");
  if (removed) await logAudit(session.sub, "work-set.works-removed", { targetType: "Work set", targetId: id, summary: `Removed ${removed.toLocaleString()} work${removed === 1 ? "" : "s"} from “${set.name}”` });
  return json({ removed });
}
