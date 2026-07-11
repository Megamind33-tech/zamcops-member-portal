import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";

// The staff activity trail, newest first (capped — it's a review feed, not an export).
export async function GET() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return json({ logs });
}
