import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import {
  memberDTO,
  workDTO,
  singleDTO,
  albumDTO,
  uploadDTO,
  notificationDTO,
  statementDTO,
  royaltyDTO,
} from "@/lib/serialize";

export const runtime = "nodejs";

// Returns everything the signed-in member needs to render the portal.
export async function GET() {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);
  const id = session.sub;

  const [member, works, singles, albums, uploads, notifications, statements, royalty] =
    await Promise.all([
      prisma.member.findUnique({ where: { id } }),
      prisma.workDeclaration.findMany({ where: { ownerId: id }, orderBy: { submittedAt: "desc" } }),
      prisma.songSubmission.findMany({ where: { ownerId: id }, orderBy: { submittedAt: "desc" } }),
      prisma.albumSubmission.findMany({ where: { ownerId: id }, orderBy: { submittedAt: "desc" } }),
      prisma.uploadFile.findMany({ where: { ownerId: id }, orderBy: { uploadedAt: "desc" } }),
      prisma.notification.findMany({ where: { ownerId: id }, orderBy: { createdAt: "desc" } }),
      prisma.statement.findMany({ where: { ownerId: id }, orderBy: { issuedAt: "desc" } }),
      prisma.royaltySummary.findUnique({ where: { ownerId: id } }),
    ]);

  if (!member) return bad("Member not found.", 404);

  return json({
    member: memberDTO(member),
    works: works.map(workDTO),
    singles: singles.map(singleDTO),
    albums: albums.map(albumDTO),
    uploads: uploads.map(uploadDTO),
    notifications: notifications.map(notificationDTO),
    statements: statements.map(statementDTO),
    royalty: royaltyDTO(royalty, id),
  });
}
