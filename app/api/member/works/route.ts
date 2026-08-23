import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { workDTO, singleDTO } from "@/lib/serialize";
import { notifyMember } from "@/lib/notify";
import { normalizeContributorRole } from "@/lib/roles";
import type { OwnershipSplit } from "@/types";

export const runtime = "nodejs";

const splitsTotal = (s: OwnershipSplit[]) =>
  s.reduce((sum, x) => sum + (Number(x.percentage) || 0), 0);

function listOf(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((x) => x.trim()).filter(Boolean);
  return [];
}

function coverUploadRow(ownerId: string, title: string, coverArt: string) {
  const isInline = coverArt.startsWith("data:");
  const isUrl = coverArt.startsWith("http");
  const data = isInline ? coverArt.replace(/^data:[^;]+;base64,/, "") : "";
  return {
    ownerId,
    fileName: `${title} — cover art.jpg`,
    fileType: "Cover Art",
    linkedTo: title,
    status: "Pending",
    mimeType: "image/jpeg",
    data,
    url: isUrl ? coverArt : "",
  };
}

export async function POST(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  if (!b.title?.trim()) return bad("A work title is required.");
  if (!b.audioFile) return bad("Please attach the song (audio file).");
  if (!b.coverArt) return bad("Please attach the artwork.");
  const splits: OwnershipSplit[] = Array.isArray(b.ownershipSplits)
    ? b.ownershipSplits.map((s: OwnershipSplit) => ({
        ...s,
        role: normalizeContributorRole(String(s.role || "Composer")),
      }))
    : [];
  if (splitsTotal(splits) !== 100) return bad("Ownership splits must total exactly 100%.");

  const composers = listOf(b.composers);
  const authors = [...listOf(b.authors), ...listOf(b.subAuthors)];
  const arrangers = listOf(b.arrangers).length ? listOf(b.arrangers) : listOf(b.subArrangers);

  const result = await prisma.$transaction(async (tx) => {
    const work = await tx.workDeclaration.create({
      data: {
        ownerId: session.sub,
        title: b.title,
        alternativeTitle: b.alternativeTitle ?? "",
        workType: b.workType ?? "Song",
        language: b.language ?? "",
        genre: b.genre ?? "",
        duration: b.duration ?? "",
        composers: JSON.stringify(composers),
        authors: JSON.stringify(authors),
        subAuthors: JSON.stringify([]),
        subArrangers: JSON.stringify(arrangers),
        producers: JSON.stringify([]),
        publisher: b.publisher ?? "",
        publisherIpi: b.publisherIpi ?? "",
        ownershipSplits: JSON.stringify(splits),
        isrc: b.isrc ?? "",
        iswc: b.iswc ?? "",
        audioFile: b.audioFile ?? "",
        coverArt: b.coverArt ?? "",
        dateCreated: b.dateCreated ?? "",
      },
    });

    const song = await tx.songSubmission.create({
      data: {
        ownerId: session.sub,
        title: b.title,
        artistName: b.performedBy ?? "",
        featuredArtists: "",
        producer: "",
        genre: b.genre ?? "",
        releaseDate: b.dateCreated ?? "",
        audioFile: b.audioFile ?? "",
        coverArt: b.coverArt ?? "",
        lyricsFile: b.lyricsFile ?? "",
        isrc: b.isrc ?? "",
        ownershipSplits: JSON.stringify(splits),
      },
    });

    await tx.uploadFile.create({ data: coverUploadRow(session.sub, work.title, String(b.coverArt)) });

    await tx.statement.create({
      data: {
        ownerId: session.sub,
        type: "Submission Receipt",
        title: `Work registration — ${work.title}`,
        reference: `SR-W-${work.id.slice(-5).toUpperCase()}`,
      },
    });

    return { work, song };
  });

  await notifyMember(session.sub, {
    title: "Work received for registration",
    body: `“${result.work.title}” (song and artwork) has been received and is queued for review.`,
    type: "info",
    href: "/works",
  });

  return json({ work: workDTO(result.work), single: singleDTO(result.song) }, 201);
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
