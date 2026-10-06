import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { readFormat, readSource } from "@/lib/matchingSettings";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ kind: string; id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "MATCHING_MGMT"))) return bad("You do not have the Matching (Management) permission.", 403);
  const { kind, id } = await ctx.params;
  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request.");

  if (kind === "formats") {
    const f = readFormat(b);
    if (f.error !== undefined) return bad(f.error);
    const clash = await prisma.logFormat.findUnique({ where: { name: f.name } });
    if (clash && clash.id !== id) return bad(`A log format called “${f.name}” already exists.`, 409);
    const r = await prisma.logFormat.update({ where: { id }, data: { ...f, fields: f.fields } }).catch(() => null);
    if (!r) return bad("Log format not found.", 404);
    await logAudit(session.sub, "log-format.updated", { targetType: "Log format", targetId: id, summary: `Updated log format ${f.name}` });
    return json({ ok: true });
  }
  if (kind === "sources") {
    const s = readSource(b);
    if (s.error !== undefined) return bad(s.error);
    const clash = await prisma.logSource.findUnique({ where: { name: s.name } });
    if (clash && clash.id !== id) return bad(`A log source called “${s.name}” already exists.`, 409);
    const r = await prisma.logSource.update({ where: { id }, data: { ...s, weights: s.weights } }).catch(() => null);
    if (!r) return bad("Log source not found.", 404);
    await logAudit(session.sub, "log-source.updated", { targetType: "Log source", targetId: id, summary: `Updated log source ${s.name}` });
    return json({ ok: true });
  }
  if (kind === "allocation-methods") {
    const name = String(b.name ?? "").trim().slice(0, 120);
    const formula = String(b.formula ?? "").trim();
    if (!name || !formula || !b.formatId) return bad("Name, Log Format and Formula are required.");
    const clash = await prisma.logAllocationMethod.findUnique({ where: { name } });
    if (clash && clash.id !== id) return bad(`A log allocation method called “${name}” already exists.`, 409);
    const r = await prisma.logAllocationMethod.update({ where: { id }, data: { name, formatId: String(b.formatId), formula } }).catch(() => null);
    if (!r) return bad("Log allocation method not found.", 404);
    await logAudit(session.sub, "log-allocation.updated", { targetType: "Log allocation method", targetId: id, summary: `Updated log allocation method ${name}` });
    return json({ ok: true });
  }
  return bad("Unknown list.", 404);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "MATCHING_MGMT"))) return bad("You do not have the Matching (Management) permission.", 403);
  const { kind, id } = await ctx.params;

  if (kind === "formats") {
    const [sources, methods] = await Promise.all([prisma.logSource.count({ where: { formatId: id } }), prisma.logAllocationMethod.count({ where: { formatId: id } })]);
    if (sources || methods) return bad("This log format is used by a log source or log allocation method. Delete those first.", 409);
    const r = await prisma.logFormat.delete({ where: { id } }).catch(() => null);
    if (!r) return bad("Log format not found.", 404);
    await logAudit(session.sub, "log-format.deleted", { targetType: "Log format", targetId: id, summary: `Deleted log format ${r.name}` });
    return json({ ok: true });
  }
  if (kind === "sources") {
    if (await prisma.usageLog.count({ where: { sourceId: id } })) return bad("A usage log was imported with this log source, so it cannot be deleted.", 409);
    const r = await prisma.logSource.delete({ where: { id } }).catch(() => null);
    if (!r) return bad("Log source not found.", 404);
    await logAudit(session.sub, "log-source.deleted", { targetType: "Log source", targetId: id, summary: `Deleted log source ${r.name}` });
    return json({ ok: true });
  }
  if (kind === "allocation-methods") {
    const r = await prisma.logAllocationMethod.delete({ where: { id } }).catch(() => null);
    if (!r) return bad("Log allocation method not found.", 404);
    await logAudit(session.sub, "log-allocation.deleted", { targetType: "Log allocation method", targetId: id, summary: `Deleted log allocation method ${r.name}` });
    return json({ ok: true });
  }
  return bad("Unknown list.", 404);
}
