import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { workDTO } from "@/lib/serialize";
import type { OwnershipSplit } from "@/types";

export const runtime = "nodejs";

const splitsTotal = (s: OwnershipSplit[]) =>
  s.reduce((sum, x) => sum + (Number(x.percentage) || 0), 0);

export async function POST(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  if (!b.title?.trim()) return bad("A work title is required.");
  const splits: OwnershipSplit[] = Array.isArray(b.ownershipSplits) ? b.ownershipSplits : [];
  if (splitsTotal(splits) !== 100) return bad("Ownership splits must total exactly 100%.");

  const work = await prisma.workDeclaration.create({
    data: {
      ownerId: session.sub,
      title: b.title,
      alternativeTitle: b.alternativeTitle ?? "",
      workType: b.workType ?? "Song",
      language: b.language ?? "",
      genre: b.genre ?? "",
      duration: b.duration ?? "",
      composers: JSON.stringify(b.composers ?? []),
      authors: JSON.stringify(b.authors ?? []),
      producers: JSON.stringify(b.producers ?? []),
      publisher: b.publisher ?? "",
      publisherIpi: b.publisherIpi ?? "",
      ownershipSplits: JSON.stringify(splits),
      isrc: b.isrc ?? "",
      iswc: b.iswc ?? "",
      audioFile: b.audioFile ?? "",
      dateCreated: b.dateCreated ?? "",
    },
  });

  // Record the reference recording so it appears on the Uploads screen.
  if (work.audioFile) {
    await prisma.uploadFile.create({
      data: {
        ownerId: session.sub,
        fileName: work.audioFile,
        fileType: "Audio",
        linkedTo: work.title,
        status: "Processing",
      },
    });
  }

  await prisma.statement.create({
    data: {
      ownerId: session.sub,
      type: "Submission Receipt",
      title: `Work Declaration — ${work.title}`,
      reference: `SR-W-${work.id.slice(-5).toUpperCase()}`,
    },
  });
  await prisma.notification.create({
    data: {
      ownerId: session.sub,
      title: "Work declaration pending review",
      body: `Your declaration for “${work.title}” has been received and is queued for review.`,
      type: "info",
    },
  });

  return json({ work: workDTO(work) }, 201);
}

// Members may delete their own declarations, except once registered (Approved)
// — registered works can only be removed by ZAMCOPS staff.
export async function DELETE(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  const id = b?.id ? String(b.id) : "";
  if (!id) return bad("A declaration id is required.");

  const row = await prisma.workDeclaration.findUnique({ where: { id } });
  if (!row || row.ownerId !== session.sub) return bad("Declaration not found.", 404);
  if (row.status === "Approved")
    return bad("This work is registered and can only be removed by ZAMCOPS staff. Contact the ZAMCOPS office to amend a registered work.", 409);

  await prisma.workDeclaration.delete({ where: { id } });
  return json({ ok: true });
}
