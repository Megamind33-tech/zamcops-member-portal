import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

export const runtime = "nodejs";

const DYNAMIC_ENTITIES = ["Right Owner", "Work", "Account", "License", "Distribution Pool", "Distribution"];
const TYPES = ["Text", "Number", "Date", "List", "Yes/No"];

// WIPO Connect Administration > Dynamic Fields
export async function GET() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "DYNFIELD_ACCESS"))) return bad("You do not have the Dynamic Field (Access) permission.", 403);
  const fields = await prisma.dynamicField.findMany({ orderBy: [{ entity: "asc" }, { position: "asc" }, { label: "asc" }] });
  return json({ entities: DYNAMIC_ENTITIES, types: TYPES, canManage: await hasPermission(session.sub, "DYNFIELD_MGMT"), fields });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "DYNFIELD_MGMT"))) return bad("You do not have the Dynamic Field (Management) permission.", 403);
  const b = await req.json().catch(() => null);
  const entity = String(b?.entity ?? "");
  const label = String(b?.label ?? "").trim().slice(0, 120);
  const type = String(b?.type ?? "Text");
  if (!DYNAMIC_ENTITIES.includes(entity)) return bad("Choose what the field is added to.");
  if (!label) return bad("Label is required.");
  if (!TYPES.includes(type)) return bad("Unknown field type.");
  if (await prisma.dynamicField.findFirst({ where: { entity, label } })) return bad(`${entity} already has a field called “${label}”.`, 409);
  const options = type === "List" ? String(b?.options ?? "").split(",").map((x) => x.trim()).filter(Boolean).join(", ") : "";
  if (type === "List" && !options) return bad("Give the list its values, separated by commas.");
  const position = await prisma.dynamicField.count({ where: { entity } });
  const f = await prisma.dynamicField.create({ data: { entity, label, type, options, required: b?.required === true, position } });
  await logAudit(session.sub, "dynamic-field.created", { targetType: "Dynamic field", targetId: f.id, summary: `Added field “${label}” to ${entity}` });
  return json({ id: f.id }, 201);
}

export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "DYNFIELD_MGMT"))) return bad("You do not have the Dynamic Field (Management) permission.", 403);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const f = await prisma.dynamicField.delete({ where: { id } }).catch(() => null);
  if (!f) return bad("Field not found.", 404);
  await logAudit(session.sub, "dynamic-field.deleted", { targetType: "Dynamic field", targetId: id, summary: `Removed field “${f.label}” from ${f.entity}` });
  return json({ ok: true });
}
