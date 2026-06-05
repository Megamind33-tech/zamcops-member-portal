import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import {
  memberDTO,
  workDTO,
  singleDTO,
  albumDTO,
  uploadDTO,
  royaltyDTO,
} from "@/lib/serialize";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const [members, works, singles, albums, uploads, royalty] = await Promise.all([
    prisma.member.findMany({ orderBy: { joinedAt: "desc" } }),
    prisma.workDeclaration.findMany({ orderBy: { submittedAt: "desc" } }),
    prisma.songSubmission.findMany({ orderBy: { submittedAt: "desc" } }),
    prisma.albumSubmission.findMany({ orderBy: { submittedAt: "desc" } }),
    prisma.uploadFile.findMany({ orderBy: { uploadedAt: "desc" } }),
    prisma.royaltySummary.findMany(),
  ]);

  return json({
    members: members.map(memberDTO),
    works: works.map(workDTO),
    singles: singles.map(singleDTO),
    albums: albums.map(albumDTO),
    uploads: uploads.map(uploadDTO),
    royalty: royalty.map((r) => royaltyDTO(r, r.ownerId)),
  });
}
