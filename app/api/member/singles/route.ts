import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { singleDTO } from "@/lib/serialize";
import type { OwnershipSplit } from "@/types";

export const runtime = "nodejs";

const splitsTotal = (s: OwnershipSplit[]) =>
  s.reduce((sum, x) => sum + (Number(x.percentage) || 0), 0);

export async function POST(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  if (!b.title?.trim()) return bad("Song title is required.");
  if (!b.audioFile) return bad("An audio file is required.");
  const splits: OwnershipSplit[] = Array.isArray(b.ownershipSplits) ? b.ownershipSplits : [];
  if (splitsTotal(splits) !== 100) return bad("Ownership splits must total exactly 100%.");

  const song = await prisma.songSubmission.create({
    data: {
      ownerId: session.sub,
      title: b.title,
      artistName: b.artistName ?? "",
      featuredArtists: b.featuredArtists ?? "",
      producer: b.producer ?? "",
      genre: b.genre ?? "",
      releaseDate: b.releaseDate ?? "",
      audioFile: b.audioFile ?? "",
      coverArt: b.coverArt ?? "",
      lyricsFile: b.lyricsFile ?? "",
      isrc: b.isrc ?? "",
      ownershipSplits: JSON.stringify(splits),
    },
  });

  // Record uploaded files so they appear on the Uploads screen.
  const uploads = [];
  if (song.audioFile)
    uploads.push({ ownerId: session.sub, fileName: song.audioFile, fileType: "Audio", linkedTo: song.title, status: "Processing" });
  if (song.coverArt)
    uploads.push({ ownerId: session.sub, fileName: song.coverArt, fileType: "Cover Art", linkedTo: song.title, status: "Pending" });
  if (song.lyricsFile)
    uploads.push({ ownerId: session.sub, fileName: song.lyricsFile, fileType: "Lyrics", linkedTo: song.title, status: "Pending" });
  if (uploads.length) await prisma.uploadFile.createMany({ data: uploads });

  await prisma.statement.create({
    data: {
      ownerId: session.sub,
      type: "Submission Receipt",
      title: `Single — ${song.title}`,
      reference: `SR-S-${song.id.slice(-5).toUpperCase()}`,
    },
  });
  await prisma.notification.create({
    data: {
      ownerId: session.sub,
      title: "Single submission received",
      body: `“${song.title}” is now pending review.`,
      type: "info",
    },
  });

  return json({ single: singleDTO(song) }, 201);
}

// Members may delete their own single (any status).
export async function DELETE(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  const id = b?.id ? String(b.id) : "";
  if (!id) return bad("A submission id is required.");

  const row = await prisma.songSubmission.findUnique({ where: { id } });
  if (!row || row.ownerId !== session.sub) return bad("Single not found.", 404);

  await prisma.songSubmission.delete({ where: { id } });
  return json({ ok: true });
}
