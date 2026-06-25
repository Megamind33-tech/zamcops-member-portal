import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";

const STATUSES = ["Pending", "Processing", "Approved", "Rejected"];

// Staff approve / reject (or re-queue) an uploaded file and notify the owner.
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  const id = b.id ? String(b.id) : "";
  const status = b.status;
  if (!id || !STATUSES.includes(status)) return bad("Invalid file review payload.");

  const reason = status === "Rejected" ? String(b.reason ?? "Rejected by ZAMCOPS review.") : "";

  const file = await prisma.uploadFile.update({
    where: { id },
    data: { status, rejectionReason: reason },
  });

  if (status === "Approved" || status === "Rejected") {
    await prisma.notification.create({
      data: {
        ownerId: file.ownerId,
        title: `File ${status.toLowerCase()}`,
        body:
          status === "Rejected"
            ? `Your file “${file.fileName}” was rejected: ${reason}`
            : `Your file “${file.fileName}” has been approved.`,
        type: status === "Approved" ? "success" : "warning",
      },
    });
  }

  return json({ ok: true });
}
