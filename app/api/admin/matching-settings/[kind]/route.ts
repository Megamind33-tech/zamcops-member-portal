import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { checkFormula } from "@/lib/formula";
import { ensureMatchingSettings, readFormat, readSource } from "@/lib/matchingSettings";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ kind: string }> };

// WIPO Connect Matching Settings: kind = formats | sources | allocation-methods
export async function GET(_req: Request, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "MATCHING_ACCESS"))) return bad("You do not have the Matching (Access) permission.", 403);
  const { kind } = await ctx.params;
  await ensureMatchingSettings();
  const canManage = await hasPermission(session.sub, "MATCHING_MGMT");
  if (kind === "formats") return json({ canManage, rows: await prisma.logFormat.findMany({ orderBy: { name: "asc" } }) });
  if (kind === "sources") return json({ canManage, rows: await prisma.logSource.findMany({ orderBy: { name: "asc" } }) });
  if (kind === "allocation-methods") return json({ canManage, rows: await prisma.logAllocationMethod.findMany({ orderBy: { name: "asc" } }) });
  return bad("Unknown list.", 404);
}

export async function POST(req: Request, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "MATCHING_MGMT"))) return bad("You do not have the Matching (Management) permission.", 403);
  const { kind } = await ctx.params;
  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request.");

  if (kind === "formats") {
    const f = readFormat(b);
    if (f.error !== undefined) return bad(f.error);
    if (await prisma.logFormat.findUnique({ where: { name: f.name } })) return bad(`A log format called “${f.name}” already exists.`, 409);
    const row = await prisma.logFormat.create({ data: { ...f, fields: f.fields } });
    await logAudit(session.sub, "log-format.created", { targetType: "Log format", targetId: row.id, summary: `Created log format ${f.name}` });
    return json({ id: row.id }, 201);
  }
  if (kind === "sources") {
    const s = readSource(b);
    if (s.error !== undefined) return bad(s.error);
    if (await prisma.logSource.findUnique({ where: { name: s.name } })) return bad(`A log source called “${s.name}” already exists.`, 409);
    const row = await prisma.logSource.create({ data: { ...s, weights: s.weights } });
    await logAudit(session.sub, "log-source.created", { targetType: "Log source", targetId: row.id, summary: `Created log source ${s.name}` });
    return json({ id: row.id }, 201);
  }
  if (kind === "allocation-methods") {
    if (typeof b.check === "string") return json(checkFormula(b.check.replace(/\$([A-Za-z_]+)\$/g, "$Weight$")));
    const name = String(b.name ?? "").trim().slice(0, 120);
    if (!name) return bad("Name is required.");
    if (!b.formatId) return bad("Choose a Log Format.");
    const formula = String(b.formula ?? "").trim();
    if (!formula) return bad("Formula is required.");
    if (await prisma.logAllocationMethod.findUnique({ where: { name } })) return bad(`A log allocation method called “${name}” already exists.`, 409);
    const row = await prisma.logAllocationMethod.create({ data: { name, formatId: String(b.formatId), formula } });
    await logAudit(session.sub, "log-allocation.created", { targetType: "Log allocation method", targetId: row.id, summary: `Created log allocation method ${name}` });
    return json({ id: row.id }, 201);
  }
  return bad("Unknown list.", 404);
}
