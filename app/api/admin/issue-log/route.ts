import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

export const runtime = "nodejs";

// WIPO Connect Administration > Issue Log
export async function GET() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "ADMINISTRATION_MGMT"))) return bad("You do not have the Administration (Management) permission.", 403);
  const rows = await prisma.issueLog.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  return json({ rows });
}

// "Delete All"
export async function DELETE() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "ADMINISTRATION_MGMT"))) return bad("You do not have the Administration (Management) permission.", 403);
  const { count } = await prisma.issueLog.deleteMany({});
  await logAudit(session.sub, "issue-log.cleared", { targetType: "Issue log", summary: `Deleted ${count} issue log entries` });
  return json({ deleted: count });
}
