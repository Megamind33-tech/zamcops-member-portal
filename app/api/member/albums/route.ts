import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { albumDTO } from "@/lib/serialize";
import { notifyMember } from "@/lib/notify";
import { applyKnownMembers, contributorGaps, splitsTotalOk } from "@/lib/works";
import { fetchRegisterHits } from "@/lib/registerHits";
import type { Track } from "@/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  if (!b.title?.trim()) return bad("Album title is required.");
  const tracks: Track[] = Array.isArray(b.tracks) ? b.tracks : [];
  if (tracks.length === 0) return bad("Add at least one track.");
  if (tracks.some((t) => !t.title?.trim())) return bad("Every track needs a title.");

  const studioReceipt = String(b.studioReceipt ?? "").trim();
  if (!studioReceipt) return bad("Upload the studio letter or receipt for this album.", 400);

  const owner = await prisma.member.findUnique({
    where: { id: session.sub },
    select: { fullName: true, memberNumber: true },
  });

  for (const t of tracks) {
    const raw = t.ownershipSplits || [];
    const register = await fetchRegisterHits(raw);
    const splits = applyKnownMembers(raw, owner ?? undefined, register);
    t.ownershipSplits = splits;
    if (!splitsTotalOk(splits)) return bad(`Splits on “${t.title}” must add up to 100%.`);
    const gaps = contributorGaps(splits, owner ?? undefined);
    if (gaps.length) return bad(`On “${t.title}”: ${gaps[0]}`);
  }

  const albumData = {
    ownerId: session.sub,
    title: b.title,
    artistName: b.artistName ?? "",
    releaseDate: b.releaseDate ?? "",
    coverArt: b.coverArt ?? "",
    backCover: b.backCover ?? "",
    tracks: JSON.stringify(tracks),
    studioReceipt,
  };

  let album;
  try {
    album = await prisma.albumSubmission.create({ data: albumData });
  } catch (err) {
    console.error("[albums] create with studioReceipt failed, retrying without column:", err);
    try {
      const { studioReceipt: _drop, ...withoutReceipt } = albumData;
      void _drop;
      album = await prisma.albumSubmission.create({ data: withoutReceipt });
    } catch (err2) {
      console.error("[albums] create failed:", err2);
      return bad("Could not submit the album. Check the studio receipt and each track, then try again.", 500);
    }
  }

  const uploads: { ownerId: string; fileName: string; fileType: string; linkedTo: string; status: string }[] = [];
  if (b.coverArt)
    uploads.push({
      ownerId: session.sub,
      fileName: `${album.title} — front cover`,
      fileType: "Cover Art",
      linkedTo: album.title,
      status: "Pending",
    });
  if (b.backCover)
    uploads.push({
      ownerId: session.sub,
      fileName: `${album.title} — back cover`,
      fileType: "Cover Art",
      linkedTo: album.title,
      status: "Pending",
    });
  if (uploads.length) await prisma.uploadFile.createMany({ data: uploads }).catch(() => {});

  await prisma.statement
    .create({
      data: {
        ownerId: session.sub,
        type: "Submission Receipt",
        title: `Album — ${album.title}`,
        reference: `SR-A-${album.id.slice(-5).toUpperCase()}`,
      },
    })
    .catch(() => {});

  await notifyMember(session.sub, {
    title: "Album submission received",
    body: `“${album.title}” (${tracks.length} tracks) is now pending review.`,
    type: "info",
    href: "/works",
  }).catch((err) => console.error("[albums] notify failed:", err));

  return json({ album: albumDTO(album) }, 201);
}

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
