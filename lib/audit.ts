import { prisma } from "@/lib/db";

export type AuditChange = { field: string; from: string; to: string };

const show = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
};

// The fields that differ between two versions of a record, for the Audit tab.
// `labels` maps a property to the heading staff see; only listed fields count.
export function diffFields(before: Record<string, unknown>, after: Record<string, unknown>, labels: Record<string, string>): AuditChange[] {
  const out: AuditChange[] = [];
  for (const [k, label] of Object.entries(labels)) {
    if (after[k] === undefined) continue;
    const a = show(before[k]);
    const b = show(after[k]);
    if (a !== b) out.push({ field: label, from: a.slice(0, 300), to: b.slice(0, 300) });
  }
  return out;
}

// Records who did what on the staff console. Admin identity is denormalised
// into the row so the trail stays readable even if the account is removed.
// Never throws — an audit failure must not block the underlying action.
export async function logAudit(
  adminId: string,
  action: string,
  opts: { targetType?: string; targetId?: string; summary?: string; changes?: AuditChange[] } = {}
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
        changes: opts.changes?.length ? JSON.stringify(opts.changes.slice(0, 60)) : "",
      },
    });
  } catch (err) {
    console.error("[audit] failed to record:", err);
  }
}
