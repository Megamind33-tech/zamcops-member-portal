import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit, diffFields } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { getParameters, putSetting } from "@/lib/settings";
import { PARAM_SECTIONS, PARAM_DEFAULTS } from "@/lib/parameters";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "CONFIGURATION_ACCESS"))) return bad("You do not have the Configuration (Access) permission.", 403);
  return json({ values: await getParameters(), editable: await hasPermission(session.sub, "CONFIGURATION_MGMT") });
}

// Saves one section of the Parameters page (each WIPO section has its own Save).
export async function PUT(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "CONFIGURATION_MGMT"))) return bad("You do not have the Configuration (Management) permission.", 403);
  const b = await req.json().catch(() => null);
  const section = PARAM_SECTIONS.find((s) => s.title === b?.section);
  if (!section || typeof b?.values !== "object") return bad("Unknown section.");

  const before = await getParameters();
  const next = { ...before };
  for (const f of section.fields) {
    if (!(f.key in b.values)) continue;
    const v = b.values[f.key];
    if (f.kind === "check") next[f.key] = v === true;
    else if (f.kind === "multi") next[f.key] = Array.isArray(v) ? v.map(String).filter((x) => f.options?.includes(x)) : [];
    else if (f.kind === "select") {
      if (!f.options?.includes(String(v))) return bad(`${f.label}: choose one of the listed values.`);
      next[f.key] = String(v);
    } else next[f.key] = String(v ?? "").trim().slice(0, 300);
  }
  if (section.fields.some((f) => f.key === "closedDays") && next.closedDays !== "" && !/^\d{1,4}$/.test(String(next.closedDays))) return bad("Close distribution (Days) must be a whole number.");
  if (section.fields.some((f) => f.key === "licenseEnd") && next.licenseEnd !== "" && !/^\d{1,4}$/.test(String(next.licenseEnd))) return bad("License End Date must be a whole number of days.");

  await putSetting("parameters", next);
  const labels = Object.fromEntries(section.fields.map((f) => [f.key, f.label]));
  await logAudit(session.sub, "parameters.updated", { targetType: "Parameters", targetId: section.title, summary: `Saved Parameters › ${section.title}`, changes: diffFields(before, next, labels) });
  return json({ values: next, defaults: PARAM_DEFAULTS });
}
