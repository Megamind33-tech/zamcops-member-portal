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
  distributionDTO,
  distributionEntryDTO,
  licensableWorkDTO,
  licenseRequestDTO,
  memberDocumentDTO,
  supportTicketDTO,
} from "@/lib/serialize";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const [members, works, singles, albums, uploads, royalty, distributions, licensableWorks, licenseRequests, memberDocuments, supportTickets] =
    await Promise.all([
      prisma.member.findMany({ orderBy: { joinedAt: "desc" } }),
      prisma.workDeclaration.findMany({ orderBy: { submittedAt: "desc" } }),
      prisma.songSubmission.findMany({ orderBy: { submittedAt: "desc" } }),
      prisma.albumSubmission.findMany({ orderBy: { submittedAt: "desc" } }),
      prisma.uploadFile.findMany({ orderBy: { uploadedAt: "desc" }, omit: { data: true } }),
      prisma.royaltySummary.findMany(),
      prisma.distribution.findMany({ include: { entries: true }, orderBy: { createdAt: "desc" } }),
      prisma.licensableWork.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.licenseRequest.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.memberDocument.findMany({ orderBy: { uploadedAt: "desc" } }),
      prisma.supportTicket.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

  return json({
    members: members.map(memberDTO),
    works: works.map(workDTO),
    singles: singles.map(singleDTO),
    albums: albums.map(albumDTO),
    uploads: uploads.map(uploadDTO),
    royalty: royalty.map((r) => royaltyDTO(r, r.ownerId)),
    distributions: distributions.map((d) => ({ ...distributionDTO(d), entries: d.entries.map(distributionEntryDTO) })),
    licensableWorks: licensableWorks.map(licensableWorkDTO),
    licenseRequests: licenseRequests.map(licenseRequestDTO),
    memberDocuments: memberDocuments.map(memberDocumentDTO),
    supportTickets: supportTickets.map(supportTicketDTO),
  });
}
