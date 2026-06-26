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
  memberDistributionDTO,
  licensableWorkDTO,
  licenseRequestDTO,
} from "@/lib/serialize";

export const runtime = "nodejs";

// Returns everything the signed-in member needs to render the portal.
export async function GET() {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);
  const id = session.sub;

  const [
    member,
    works,
    singles,
    albums,
    uploads,
    notifications,
    statements,
    royalty,
    distributionEntries,
    licensableWorks,
    licenseRequests,
  ] = await Promise.all([
    prisma.member.findUnique({ where: { id } }),
    prisma.workDeclaration.findMany({ where: { ownerId: id }, orderBy: { submittedAt: "desc" } }),
    prisma.songSubmission.findMany({ where: { ownerId: id }, orderBy: { submittedAt: "desc" } }),
    prisma.albumSubmission.findMany({ where: { ownerId: id }, orderBy: { submittedAt: "desc" } }),
    prisma.uploadFile.findMany({ where: { ownerId: id }, orderBy: { uploadedAt: "desc" }, omit: { data: true } }),
    prisma.notification.findMany({ where: { ownerId: id }, orderBy: { createdAt: "desc" } }),
    prisma.statement.findMany({ where: { ownerId: id }, orderBy: { issuedAt: "desc" } }),
    prisma.royaltySummary.findUnique({ where: { ownerId: id } }),
    // Members only ever see PUBLISHED distributions — this is the visibility gate.
    prisma.distributionEntry.findMany({
      where: { ownerId: id, distribution: { status: "Published" } },
      include: { distribution: true },
      orderBy: { distribution: { publishedAt: "desc" } },
    }),
    prisma.licensableWork.findMany({ where: { ownerId: id }, orderBy: { createdAt: "desc" } }),
    prisma.licenseRequest.findMany({ where: { ownerId: id }, orderBy: { createdAt: "desc" } }),
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
    distributions: distributionEntries.map((e) => memberDistributionDTO(e.distribution, e)),
    licensableWorks: licensableWorks.map(licensableWorkDTO),
    licenseRequests: licenseRequests.map(licenseRequestDTO),
  });
}
