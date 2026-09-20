import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { albumDTO } from "@/lib/serialize";
import { notifyMember } from "@/lib/notify";
import { applyKnownMembers, contributorGaps, splitColumnErrors } from "@/lib/works";
import { normalizeContributorRole } from "@/lib/roles";
import { fetchRegisterHits } from "@/lib/registerHits";
import type { Track } from "@/types";

export const runtime = "nodejs";

// Names on a track holding a given role, taken from its splits — the same
// source the declaration's distribution key is built from.
function namesFor(t: Track, role: string): string[] {
  return (t.ownershipSplits ?? [])
    .filter((s) => normalizeContributorRole(String(s.role ?? "")) === role)
    .map((s) => String(s.party ?? "").trim())
    .filter(Boolean);
}

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
    const splitErrors = splitColumnErrors(splits);
    if (splitErrors.length) return bad(`On “${t.title}”: ${splitErrors[0]}`);
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

  // An album is a batch of works, and every work is declared — the society's
  // WORK DECLARATION is filled per song, not per release. Without this an album
  // of ten tracks produced no declarations at all and ten registrable works
  // existed only as JSON inside one row, invisible to review, to the register
  // and to royalty distribution.
  //
  // Each track becomes its own declaration, numbered by its place in the batch,
  // which is what the form's "Work No" box records.
  try {
    await prisma.workDeclaration.createMany({
      data: tracks.map((t, i) => ({
        ownerId: session.sub,
        batchId: album.id,
        workNo: String(i + 1),
        title: String(t.title).trim(),
        workType: "Song",
        genre: t.genre ?? "",
        language: "",
        duration: t.duration ?? "",
        isrc: t.isrc ?? "",
        audioFile: t.audioFile ?? "",
        coverArt: b.coverArt ?? "",
        studioReceipt,
        ownershipSplits: JSON.stringify(t.ownershipSplits ?? []),
        composers: JSON.stringify(namesFor(t, "Composer")),
        authors: JSON.stringify(namesFor(t, "Author")),
        subArrangers: JSON.stringify(namesFor(t, "Arranger")),
        publisher: namesFor(t, "Publisher")[0] ?? "",
        yearComposed: String(b.releaseDate ?? "").slice(0, 4),
        dateCreated: b.releaseDate ?? "",
      })),
    });
  } catch (err) {
    // The album is already saved and the member told. Losing the per-track
    // declarations is worth shouting about, but not worth discarding the
    // submission they just made.
    console.error("[albums] per-track work declarations failed:", err);
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
