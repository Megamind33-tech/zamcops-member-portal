import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { BI_QUERIES } from "@/lib/biCatalogue";
import { runBi } from "@/lib/biQueries";

export const runtime = "nodejs";
export const maxDuration = 120;

// WIPO Connect BI & Reports > Business Intelligence
export async function GET() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "REPORT_ACCESS"))) return bad("You do not have the Report (Access) permission.", 403);
  return json({ queries: BI_QUERIES.map((q) => ({ name: q.name, params: q.params, available: !!q.run, why: q.why ?? "" })) });
}

// POST { query, params, format?: "json" | "csv" } — runs one query
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "REPORT_ACCESS"))) return bad("You do not have the Report (Access) permission.", 403);
  const b = await req.json().catch(() => null);
  const q = BI_QUERIES.find((x) => x.name === b?.query);
  if (!q) return bad("Choose a query.");
  if (!q.run) return bad(q.why || "This query is not available.", 501);
  const params: Record<string, string> = {};
  for (const p of q.params) params[p.code] = String(b?.params?.[p.code] ?? "").trim().slice(0, 200);

  let result;
  try {
    result = await runBi(q.run, params);
  } catch (e) {
    return bad(e instanceof Error ? e.message : "The query failed.", 422);
  }
  await logAudit(session.sub, "bi.run", { targetType: "Report", summary: `Ran report “${q.name}” (${result.rows.length} rows)` });

  const format = b?.format === "csv" ? "csv" : "json";
  const file = q.name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (format === "csv") {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [result.columns.map(esc).join(","), ...result.rows.map((r) => r.map(esc).join(","))].join("\n");
    return new Response("﻿" + csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${file}.csv"`, "Cache-Control": "no-store" } });
  }
  return json(result);
}
