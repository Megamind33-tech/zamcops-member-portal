import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { importUsageLog, matchUsageLog } from "@/lib/logMatching";
import { lockReason } from "@/lib/distLock";

export const runtime = "nodejs";
export const maxDuration = 300;

const PAGE_SIZE = 50;
const MAX_BYTES = 15 * 1024 * 1024;

// WIPO Connect Matching and Distribution > Usage Log
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "MATCHING_ACCESS"))) return bad("You do not have the Matching (Access) permission.", 403);
  const page = Math.max(1, Number(new URL(req.url).searchParams.get("page")) || 1);
  const [total, logs] = await Promise.all([
    prisma.usageLog.count(),
    prisma.usageLog.findMany({ orderBy: { uploadedAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const links = await prisma.distributionPoolLink.findMany({
    where: { id: { in: logs.map((l) => l.linkId).filter((x): x is string => !!x) } },
    select: { id: true, seq: true, distributionId: true, distribution: { select: { code: true, periodLabel: true } } },
  });
  const byLink = new Map(links.map((l) => [l.id, l]));
  return json({
    page,
    pageSize: PAGE_SIZE,
    total,
    canManage: await hasPermission(session.sub, "MATCHING_MGMT"),
    rows: logs.map((l) => {
      const link = l.linkId ? byLink.get(l.linkId) : undefined;
      return {
        id: l.id,
        fileCode: l.importCode,
        filename: l.filename,
        uploadedAt: l.uploadedAt,
        startedAt: l.startedAt,
        endedAt: l.endedAt,
        rows: l.insertedItems,
        groups: l.groupedItems,
        processed: l.processedItems,
        errors: l.errorNumbers,
        distribution: link?.distribution.code || link?.distribution.periodLabel || "",
        distributionId: link?.distributionId ?? null,
        dplMainId: link ? `133-${link.seq}-DPL` : "",
        linkId: l.linkId,
        status: l.status,
        priority: l.priority,
      };
    }),
  });
}

// POST multipart: file (.xlsx) + linkId — "Import" a usage log for a Log Based pool link.
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "MATCHING_MGMT"))) return bad("You do not have the Matching (Management) permission.", 403);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const linkId = String(form?.get("linkId") ?? "");
  if (!(file instanceof File) || !linkId) return bad("Choose a pool link and a file.");
  if (file.size > MAX_BYTES) return bad("The file is over 15 MB.");
  if (!/\.xlsx$/i.test(file.name)) return bad("The Log Format is XLSX — upload an .xlsx file.");

  const link = await prisma.distributionPoolLink.findUnique({ where: { id: linkId }, include: { pool: true, distribution: { select: { id: true, status: true, closedAt: true } } } });
  if (!link) return bad("Pool link not found.", 404);
  if (link.pool?.method !== "Log Based") return bad("Usage logs can only be imported on a pool link whose pool uses the Log Based method.");
  const locked = lockReason(link.distribution);
  if (locked) return bad(locked, 409);
  const sourceId = link.logSourceId ?? link.pool.logSourceId;
  if (!sourceId) return bad("Choose a Log Source on the pool (or on the pool link) first.");

  try {
    const id = await importUsageLog({ buf: Buffer.from(await file.arrayBuffer()), filename: file.name, linkId, sourceId });
    await logAudit(session.sub, "usage-log.imported", { targetType: "Usage log", targetId: id, summary: `Imported ${file.name} on 133-${link.seq}-DPL` });
    return json({ id }, 201);
  } catch (e) {
    return bad(e instanceof Error ? e.message : "The import failed.", 422);
  }
}

// PATCH { ids: string[], action: "rematch" | "priority" }
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "MATCHING_MGMT"))) return bad("You do not have the Matching (Management) permission.", 403);
  const b = await req.json().catch(() => null);
  const ids: string[] = Array.isArray(b?.ids) ? b.ids.map(String) : [];
  if (ids.length === 0) return bad("Select at least one usage log.");
  if (b.action === "priority") {
    const max = (await prisma.usageLog.aggregate({ _max: { priority: true } }))._max.priority ?? 0;
    await prisma.usageLog.updateMany({ where: { id: { in: ids } }, data: { priority: max + 1 } });
    return json({ ok: true });
  }
  if (b.action === "rematch") {
    let n = 0;
    for (const id of ids) {
      await matchUsageLog(id);
      const done = await prisma.usageLogGroup.count({ where: { usageLogId: id, status: { in: ["Matched", "Ignored"] } } });
      await prisma.usageLog.update({ where: { id }, data: { processedItems: done, status: "MATCH_COMPLETED", endedAt: new Date() } });
      n++;
    }
    await logAudit(session.sub, "usage-log.rematched", { targetType: "Usage log", summary: `Re-matched ${n} usage log(s)` });
    return json({ ok: true, rematched: n });
  }
  return bad("Unknown action.");
}

// DELETE ?id= — removes the log and its lines. Not allowed once the link has been allocated from it.
export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "MATCHING_MGMT"))) return bad("You do not have the Matching (Management) permission.", 403);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const log = await prisma.usageLog.findUnique({ where: { id } });
  if (!log) return bad("Usage log not found.", 404);
  if (log.linkId) {
    const link = await prisma.distributionPoolLink.findUnique({ where: { id: log.linkId }, select: { status: true, distribution: { select: { id: true, status: true, closedAt: true } } } });
    if (link?.distribution && lockReason(link.distribution)) return bad(lockReason(link.distribution)!, 409);
    if (link?.status === "Allocated") return bad("This pool link has been allocated from its usage logs. Delete the allocation first.", 409);
  }
  await prisma.$transaction([prisma.usageLogGroup.deleteMany({ where: { usageLogId: id } }), prisma.usageLog.delete({ where: { id } })]);
  await logAudit(session.sub, "usage-log.deleted", { targetType: "Usage log", targetId: id, summary: `Deleted usage log ${log.importCode} (${log.filename})` });
  return json({ ok: true });
}
