import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { ensureReference, REF_KINDS, type RefKind } from "@/lib/reference";

export const runtime = "nodejs";

const PAGE = 50;

type Ctx = { params: Promise<{ kind: string }> };

const num = (v: unknown) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : String(v ?? "").split(/[,\n]/).map((x) => x.trim()).filter(Boolean));

export async function GET(req: Request, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { kind } = await ctx.params;
  if (!REF_KINDS.includes(kind as RefKind)) return bad("Unknown reference table.", 404);
  await ensureReference();
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").trim();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const skip = (page - 1) * PAGE;
  const like = q ? { contains: q, mode: "insensitive" as const } : undefined;

  if (kind === "cmo") {
    const where = like ? { OR: [{ code: like }, { acronym: like }, { name: like }, { country: like }] } : {};
    const [total, rows] = await Promise.all([prisma.refCmo.count({ where }), prisma.refCmo.findMany({ where, orderBy: { code: "asc" }, skip, take: PAGE })]);
    return json({ page, pageSize: PAGE, total, rows });
  }
  if (kind === "territories") {
    const where = like ? { OR: [{ tisn: like }, { tisa: like }, { name: like }, { type: like }] } : {};
    const [total, rows] = await Promise.all([prisma.refTerritory.count({ where }), prisma.refTerritory.findMany({ where, orderBy: { tisn: "asc" }, skip, take: PAGE })]);
    return json({ page, pageSize: PAGE, total, rows });
  }
  if (kind === "creation-classes") {
    const rows = await prisma.refCreationClass.findMany({ where: like ? { OR: [{ code: like }, { name: like }] } : {}, orderBy: { code: "asc" } });
    return json({ page: 1, pageSize: rows.length || 1, total: rows.length, rows });
  }
  const rows = await prisma.refIdentifier.findMany({ where: like ? { OR: [{ code: like }, { acronym: like }, { name: like }] } : {}, orderBy: { code: "asc" } });
  return json({ page: 1, pageSize: rows.length || 1, total: rows.length, rows });
}

// "Add Creation Class" / "Add Identifier"
export async function POST(req: Request, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { kind } = await ctx.params;
  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request.");
  const code = String(b.code ?? "").trim().toUpperCase().slice(0, 40);
  if (!code) return bad("Code is required.");
  await ensureReference();

  if (kind === "creation-classes") {
    if (await prisma.refCreationClass.findUnique({ where: { code } })) return bad(`Creation class ${code} already exists.`, 409);
    const row = await prisma.refCreationClass.create({
      data: {
        code,
        name: String(b.name ?? "").trim().slice(0, 200),
        description: String(b.description ?? "").slice(0, 1000),
        shareBase: num(b.shareBase) == null ? null : Math.round(num(b.shareBase)!),
        identifiers: list(b.identifiers),
        additionalFields: list(b.additionalFields),
        roles: list(b.roles),
        domesticRoles: list(b.domesticRoles),
        domesticFee: num(b.domesticFee),
        intlRevenueFee: num(b.intlRevenueFee),
        intlFee: num(b.intlFee),
        reservedFee: num(b.reservedFee),
      },
    });
    await logAudit(session.sub, "reference.created", { targetType: "Creation class", targetId: row.id, summary: `Added creation class ${code}` });
    return json({ id: row.id }, 201);
  }
  if (kind === "identifiers") {
    if (await prisma.refIdentifier.findUnique({ where: { code } })) return bad(`Identifier ${code} already exists.`, 409);
    const row = await prisma.refIdentifier.create({
      data: {
        code,
        acronym: String(b.acronym ?? "").trim().slice(0, 80),
        name: String(b.name ?? "").trim().slice(0, 200),
        entity: b.entity === "Right Owner" ? "Right Owner" : "Work",
        type: b.type === "Shared" ? "Shared" : "Local",
        classes: list(b.classes),
      },
    });
    await logAudit(session.sub, "reference.created", { targetType: "Identifier", targetId: row.id, summary: `Added identifier ${code}` });
    return json({ id: row.id }, 201);
  }
  return bad("This table is read-only.", 405);
}
