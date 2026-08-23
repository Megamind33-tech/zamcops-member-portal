import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { workDTO } from "@/lib/serialize";
import { notifyMember } from "@/lib/notify";
import { normalizeContributorRole } from "@/lib/roles";
import {
  applyKnownMembers,
  contributorGaps,
  namesFromSplits,
  normalizeWorkType,
  splitsTotalOk,
} from "@/lib/works";
import { fetchRegisterHits } from "@/lib/registerHits";
import type { OwnershipSplit } from "@/types";

export const runtime = "nodejs";

function listOf(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((x) => x.trim()).filter(Boolean);
  return [];
}

export async function POST(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  if (!b.title?.trim()) return bad("A work title is required.");
  if (!b.audioFile) return bad("Please attach the song (audio file).");
  if (!b.coverArt) return bad("Please attach the artwork.");
  if (!String(b.studioReceipt || "").trim()) {
    return bad("Upload the studio letter or receipt — required for every registration.");
  }

  const owner = await prisma.member.findUnique({
    where: { id: session.sub },
    select: { fullName: true, memberNumber: true },
  });

  const rawSplits: OwnershipSplit[] = Array.isArray(b.ownershipSplits)
    ? b.ownershipSplits.map((s: OwnershipSplit) => ({
        ...s,
        role: normalizeContributorRole(String(s.role || "Composer")),
      }))
    : [];
  const register = await fetchRegisterHits(rawSplits);
  const splits = applyKnownMembers(rawSplits, owner ?? undefined, register);
  if (!splitsTotalOk(splits)) return bad("Ownership splits must total 100%.");
  const gaps = contributorGaps(splits, owner ?? undefined);
  if (gaps.length) return bad(gaps[0]);

  const fromSplits = namesFromSplits(splits);
  const composers = fromSplits.composers.length ? fromSplits.composers : listOf(b.composers);
  const authors = fromSplits.authors.length ? fromSplits.authors : [...listOf(b.authors), ...listOf(b.subAuthors)];
  const arrangers = fromSplits.arrangers.length
    ? fromSplits.arrangers
    : listOf(b.arrangers).length
      ? listOf(b.arrangers)
      : listOf(b.subArrangers);
  const publisher = fromSplits.publisher || String(b.publisher ?? "");
  const workType = normalizeWorkType(b.workType);
  const studioReceipt = String(b.studioReceipt).trim();
  const coverArt = String(b.coverArt ?? "");

  let work;
  try {
    work = await prisma.workDeclaration.create({
      data: {
        ownerId: session.sub,
        title: String(b.title).trim(),
        alternativeTitle: b.alternativeTitle ?? "",
        workType,
        language: b.language ?? "",
        genre: b.genre ?? "",
        duration: b.duration ?? "",
        composers: JSON.stringify(composers),
        authors: JSON.stringify(authors),
        subAuthors: JSON.stringify([]),
        subArrangers: JSON.stringify(arrangers),
        producers: JSON.stringify([]),
        publisher,
        publisherIpi: b.publisherIpi ?? "",
        ownershipSplits: JSON.stringify(splits),
        isrc: b.isrc ?? "",
        iswc: b.iswc ?? "",
        audioFile: b.audioFile ?? "",
        coverArt,
        studioReceipt,
        dateCreated: b.dateCreated ?? "",
      },
    });
  } catch (err) {
    console.error("[works] create with studioReceipt failed, retrying without column:", err);
    try {
      work = await prisma.workDeclaration.create({
        data: {
          ownerId: session.sub,
          title: String(b.title).trim(),
          alternativeTitle: b.alternativeTitle ?? "",
          workType,
          language: b.language ?? "",
          genre: b.genre ?? "",
          duration: b.duration ?? "",
          composers: JSON.stringify(composers),
          authors: JSON.stringify(authors),
          subAuthors: JSON.stringify([]),
          subArrangers: JSON.stringify(arrangers),
          producers: JSON.stringify(studioReceipt ? [`studioReceipt:${studioReceipt}`] : []),
          publisher,
          publisherIpi: b.publisherIpi ?? "",
          ownershipSplits: JSON.stringify(splits),
          isrc: b.isrc ?? "",
          iswc: b.iswc ?? "",
          audioFile: b.audioFile ?? "",
          coverArt: coverArt.startsWith("data:") && coverArt.length > 400_000 ? "" : coverArt,
          dateCreated: b.dateCreated ?? "",
        },
      });
    } catch (err2) {
      console.error("[works] create failed:", err2);
      return bad("Could not save this work. Try again — if the artwork is very large, replace it with a smaller JPEG.", 500);
    }
  }

  const uploads: {
    ownerId: string;
    fileName: string;
    fileType: string;
    linkedTo: string;
    status: string;
    url?: string;
    data?: string;
    mimeType?: string;
  }[] = [];

  const isInlineCover = coverArt.startsWith("data:");
  const isUrlCover = coverArt.startsWith("http");
  if (isUrlCover) {
    uploads.push({
      ownerId: session.sub,
      fileName: `${work.title} — cover art.jpg`,
      fileType: "Cover Art",
      linkedTo: work.title,
      status: "Pending",
      url: coverArt,
      mimeType: "image/jpeg",
    });
  } else if (isInlineCover && coverArt.length < 400_000) {
    uploads.push({
      ownerId: session.sub,
      fileName: `${work.title} — cover art.jpg`,
      fileType: "Cover Art",
      linkedTo: work.title,
      status: "Pending",
      data: coverArt.replace(/^data:[^;]+;base64,/, ""),
      mimeType: "image/jpeg",
    });
  }

  if (studioReceipt) {
    uploads.push({
      ownerId: session.sub,
      fileName: studioReceipt,
      fileType: "Document",
      linkedTo: `${work.title} — studio receipt`,
      status: "Pending",
    });
  }
  for (const s of splits) {
    if (s.affirmationLetter) {
      uploads.push({
        ownerId: session.sub,
        fileName: s.affirmationLetter,
        fileType: "Document",
        linkedTo: `${work.title} — affirmation · ${s.party}`,
        status: "Pending",
      });
    }
  }

  if (uploads.length) {
    await prisma.uploadFile.createMany({ data: uploads }).catch((err) => {
      console.error("[works] evidence upload rows failed:", err);
    });
  }

  await prisma.statement
    .create({
      data: {
        ownerId: session.sub,
        type: "Submission Receipt",
        title: `Work registration — ${work.title}`,
        reference: `SR-W-${work.id.slice(-5).toUpperCase()}`,
      },
    })
    .catch(() => {});

  await notifyMember(session.sub, {
    title: "Work received for registration",
    body: `“${work.title}” has been received and is queued for review.`,
    type: "info",
    href: "/works",
  }).catch((err) => console.error("[works] notify failed:", err));

  return json({ work: workDTO(work) }, 201);
}

export async function DELETE(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  const id = b?.id ? String(b.id) : "";
  if (!id) return bad("A declaration id is required.");

  const row = await prisma.workDeclaration.findUnique({ where: { id } });
  if (!row || row.ownerId !== session.sub) return bad("Declaration not found.", 404);
  if (row.status === "Approved")
    return bad(
      "This work is registered and can only be removed by ZAMCOPS staff. Contact the ZAMCOPS office to amend a registered work.",
      409,
    );

  await prisma.workDeclaration.delete({ where: { id } });
  return json({ ok: true });
}
