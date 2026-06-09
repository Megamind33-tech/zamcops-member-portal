import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { licensableWorkDTO } from "@/lib/serialize";
import type { LicenseUsageType } from "@/types";

export const runtime = "nodejs";

const usageTypes: LicenseUsageType[] = ["Film & TV", "Advertising", "Online content", "Live events", "Other"];

// Adds one of the member's own works to ZAMCOPS' direct/sync licensing pool —
// businesses can then enquire about licensing it, with ZAMCOPS brokering the deal.
export async function POST(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  if (!b.workTitle?.trim()) return bad("Choose a work to list.");
  const types: string[] = Array.isArray(b.usageTypes) ? b.usageTypes.filter((t: string) => usageTypes.includes(t as LicenseUsageType)) : [];
  if (types.length === 0) return bad("Pick at least one usage type you're open to.");

  const work = await prisma.licensableWork.create({
    data: {
      ownerId: session.sub,
      workTitle: b.workTitle,
      workRef: b.workRef ?? "",
      usageTypes: JSON.stringify(types),
      minFee: b.minFee != null && b.minFee !== "" ? Number(b.minFee) : null,
      notes: b.notes ?? "",
    },
  });

  await prisma.notification.create({
    data: {
      ownerId: session.sub,
      title: "Added to licensing pool",
      body: `“${work.workTitle}” is now visible to ZAMCOPS' licensing desk for sync & direct licensing enquiries.`,
      type: "success",
    },
  });

  return json({ work: licensableWorkDTO(work) }, 201);
}

// Withdraws a work from the licensing pool.
export async function DELETE(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  if (!b?.id) return bad("Missing work id.");

  const work = await prisma.licensableWork.findUnique({ where: { id: b.id } });
  if (!work || work.ownerId !== session.sub) return bad("Work not found.", 404);

  await prisma.licensableWork.delete({ where: { id: b.id } });
  return json({ ok: true });
}
