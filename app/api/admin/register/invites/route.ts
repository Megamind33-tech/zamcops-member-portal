import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { sendInvite, emailConfigured, READY } from "@/lib/invites";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_PER_CALL = 50;

// Send the first invitation to everyone who is ready, up to 50 at a time so a
// click cannot run for minutes or flood the mail provider. Staff press it again
// for the next batch. Anyone already invited is left alone; a single person can
// be re-invited from their own page.
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!emailConfigured()) return bad("Email is not set up on the server yet (RESEND_API_KEY).");

  const b = await req.json().catch(() => null);
  if (!b || b.confirm !== true) return bad("Confirmation required.");

  const rows = await prisma.rightHolder.findMany({ where: READY, select: { id: true }, take: MAX_PER_CALL, orderBy: { displayName: "asc" } });
  let sent = 0;
  const failed: string[] = [];
  for (const r of rows) {
    const res = await sendInvite(r.id);
    if (res.ok) sent++;
    else failed.push(res.error);
    await new Promise((ok) => setTimeout(ok, 150)); // stay well inside the provider's rate limit
  }
  const remaining = await prisma.rightHolder.count({ where: READY });
  await logAudit(session.sub, "register.invite.bulk", { targetType: "RightHolder", summary: `Sent ${sent} invites, ${failed.length} skipped, ${remaining} still waiting` });
  return json({ sent, skipped: failed.length, reasons: [...new Set(failed)].slice(0, 5), remaining });
}
