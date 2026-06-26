import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { albumDTO } from "@/lib/serialize";
import type { Track, OwnershipSplit } from "@/types";

export const runtime = "nodejs";

const splitsTotal = (s: OwnershipSplit[]) =>
  s.reduce((sum, x) => sum + (Number(x.percentage) || 0), 0);

export async function POST(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  if (!b.title?.trim()) return bad("Album title is required.");
  const tracks: Track[] = Array.isArray(b.tracks) ? b.tracks : [];
  if (tracks.length === 0) return bad("Add at least one track.");
  if (tracks.some((t) => !t.title?.trim())) return bad("Every track needs a title.");
  if (tracks.some((t) => splitsTotal(t.ownershipSplits || []) !== 100))
    return bad("Each track's ownership splits must total 100%.");

  const album = await prisma.albumSubmission.create({
    data: {
      ownerId: session.sub,
      title: b.title,
      artistName: b.artistName ?? "",
      releaseDate: b.releaseDate ?? "",
      coverArt: b.coverArt ?? "",
      backCover: b.backCover ?? "",
      tracks: JSON.stringify(tracks),
    },
  });

  // Record the covers + each track's audio so they appear on the Uploads screen.
  const uploads: { ownerId: string; fileName: string; fileType: string; linkedTo: string; status: string }[] = [];
  if (b.coverArt)
    uploads.push({ ownerId: session.sub, fileName: `${album.title} — front cover`, fileType: "Cover Art", linkedTo: album.title, status: "Pending" });
  if (b.backCover)
    uploads.push({ ownerId: session.sub, fileName: `${album.title} — back cover`, fileType: "Cover Art", linkedTo: album.title, status: "Pending" });
  // Track audio is uploaded separately (with bytes) via /api/member/upload.
  if (uploads.length) await prisma.uploadFile.createMany({ data: uploads });

  await prisma.statement.create({
    data: {
      ownerId: session.sub,
      type: "Submission Receipt",
      title: `Album — ${album.title}`,
      reference: `SR-A-${album.id.slice(-5).toUpperCase()}`,
    },
  });
  await prisma.notification.create({
    data: {
      ownerId: session.sub,
      title: "Album submission received",
      body: `“${album.title}” (${tracks.length} tracks) is now pending review.`,
      type: "info",
    },
  });

  return json({ album: albumDTO(album) }, 201);
}

// Members may delete their own album, except once registered (Approved).
export async function DELETE(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  const id = b?.id ? String(b.id) : "";
  if (!id) return bad("A submission id is required.");

  const row = await prisma.albumSubmission.findUnique({ where: { id } });
  if (!row || row.ownerId !== session.sub) return bad("Album not found.", 404);
  if (row.status === "Approved")
    return bad("This album is registered and can only be removed by ZAMCOPS staff.", 409);

  await prisma.albumSubmission.delete({ where: { id } });
  return json({ ok: true });
}
