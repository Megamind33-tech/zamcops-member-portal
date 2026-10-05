import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ kind: string; id: string }> };

const num = (v: unknown) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : String(v ?? "").split(/[,\n]/).map((x) => x.trim()).filter(Boolean));

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { kind, id } = await ctx.params;
  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request.");

  if (kind === "creation-classes") {
    const cur = await prisma.refCreationClass.findUnique({ where: { id } });
    if (!cur) return bad("Not found.", 404);
    const data = {
      name: String(b.name ?? cur.name).trim().slice(0, 200),
      description: String(b.description ?? cur.description).slice(0, 1000),
      shareBase: "shareBase" in b ? (num(b.shareBase) == null ? null : Math.round(num(b.shareBase)!)) : cur.shareBase,
      identifiers: "identifiers" in b ? list(b.identifiers) : (cur.identifiers as string[]),
      additionalFields: "additionalFields" in b ? list(b.additionalFields) : (cur.additionalFields as string[]),
      roles: "roles" in b ? list(b.roles) : (cur.roles as string[]),
      domesticRoles: "domesticRoles" in b ? list(b.domesticRoles) : (cur.domesticRoles as string[]),
      domesticFee: "domesticFee" in b ? num(b.domesticFee) : cur.domesticFee,
      intlRevenueFee: "intlRevenueFee" in b ? num(b.intlRevenueFee) : cur.intlRevenueFee,
      intlFee: "intlFee" in b ? num(b.intlFee) : cur.intlFee,
      reservedFee: "reservedFee" in b ? num(b.reservedFee) : cur.reservedFee,
    };
    await prisma.refCreationClass.update({ where: { id }, data });
    await logAudit(session.sub, "reference.updated", { targetType: "Creation class", targetId: id, summary: `Updated creation class ${cur.code}` });
    return json({ ok: true });
  }
  if (kind === "identifiers") {
    const cur = await prisma.refIdentifier.findUnique({ where: { id } });
    if (!cur) return bad("Not found.", 404);
    await prisma.refIdentifier.update({
      where: { id },
      data: {
        acronym: String(b.acronym ?? cur.acronym).trim().slice(0, 80),
        name: String(b.name ?? cur.name).trim().slice(0, 200),
        entity: b.entity === "Right Owner" ? "Right Owner" : b.entity === "Work" ? "Work" : cur.entity,
        type: b.type === "Shared" ? "Shared" : b.type === "Local" ? "Local" : cur.type,
        classes: "classes" in b ? list(b.classes) : (cur.classes as string[]),
      },
    });
    await logAudit(session.sub, "reference.updated", { targetType: "Identifier", targetId: id, summary: `Updated identifier ${cur.code}` });
    return json({ ok: true });
  }
  return bad("This table is read-only.", 405);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { kind, id } = await ctx.params;
  if (kind === "creation-classes") {
    const cur = await prisma.refCreationClass.findUnique({ where: { id } });
    if (!cur) return bad("Not found.", 404);
    await prisma.refCreationClass.delete({ where: { id } });
    await logAudit(session.sub, "reference.deleted", { targetType: "Creation class", targetId: id, summary: `Deleted creation class ${cur.code}` });
    return json({ ok: true });
  }
  if (kind === "identifiers") {
    const cur = await prisma.refIdentifier.findUnique({ where: { id } });
    if (!cur) return bad("Not found.", 404);
    await prisma.refIdentifier.delete({ where: { id } });
    await logAudit(session.sub, "reference.deleted", { targetType: "Identifier", targetId: id, summary: `Deleted identifier ${cur.code}` });
    return json({ ok: true });
  }
  return bad("This table is read-only.", 405);
}
