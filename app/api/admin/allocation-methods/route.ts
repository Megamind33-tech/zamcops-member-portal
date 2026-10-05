import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { checkFormula } from "@/lib/formula";

export const runtime = "nodejs";

// Work and Right owner allocation methods (formulas). ?target=Work|Right owner
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const target = new URL(req.url).searchParams.get("target") ?? "";
  const methods = await prisma.allocationMethod.findMany({
    where: target ? { target } : {},
    orderBy: [{ target: "asc" }, { name: "asc" }],
    include: { _count: { select: { poolWork: true, poolRo: true, linkWork: true, linkRo: true } } },
  });
  return json({
    methods: methods.map((m) => ({
      id: m.id,
      name: m.name,
      target: m.target,
      formula: m.formula,
      description: m.description,
      used: m._count.poolWork + m._count.poolRo + m._count.linkWork + m._count.linkRo,
    })),
  });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const b = await req.json().catch(() => null);

  // { check: "formula" } — try a formula without saving it
  if (typeof b?.check === "string") return json(checkFormula(b.check));

  const name = String(b?.name ?? "").trim().slice(0, 120);
  if (!name) return bad("Give the method a name.");
  const target = b?.target === "Right owner" ? "Right owner" : "Work";
  const formula = String(b?.formula ?? "").trim();
  const c = checkFormula(formula);
  if (!c.ok) return bad(`Formula: ${c.error}.`);
  if (await prisma.allocationMethod.findUnique({ where: { target_name: { target, name } } })) return bad(`A ${target.toLowerCase()} method called “${name}” already exists.`, 409);
  const m = await prisma.allocationMethod.create({ data: { name, target, formula, description: String(b?.description ?? "").slice(0, 500) } });
  await logAudit(session.sub, "allocation-method.created", { targetType: "Allocation method", targetId: m.id, summary: `Created ${target.toLowerCase()} allocation method “${name}”`, changes: [{ field: "Formula", from: "", to: formula }] });
  return json({ id: m.id }, 201);
}
