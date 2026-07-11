import { prisma } from "@/lib/db";

// Records who did what on the staff console. Admin identity is denormalised
// into the row so the trail stays readable even if the account is removed.
// Never throws — an audit failure must not block the underlying action.
export async function logAudit(
  adminId: string,
  action: string,
  opts: { targetType?: string; targetId?: string; summary?: string } = {}
): Promise<void> {
  try {
    const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
    await prisma.auditLog.create({
      data: {
        adminId,
        adminName: admin?.name ?? "Unknown staff",
        adminEmail: admin?.email ?? "",
        action,
        targetType: opts.targetType ?? "",
        targetId: opts.targetId ?? "",
        summary: (opts.summary ?? "").slice(0, 500),
      },
    });
  } catch (err) {
    console.error("[audit] failed to record:", err);
  }
}
