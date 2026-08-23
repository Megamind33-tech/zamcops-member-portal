import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad, markHasData } from "@/lib/server";
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

async function listed<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[admin overview] ${label} failed:`, err);
    return [];
  }
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const [members, works, singles, albums, uploads, uploadsWithData, royalty, distributions, licensableWorks, licenseRequests, memberDocuments, memberDocumentsWithData, supportTickets] =
    await Promise.all([
      listed("members", () => prisma.member.findMany({ orderBy: { joinedAt: "desc" } })),
      listed("works", () => prisma.workDeclaration.findMany({ orderBy: { submittedAt: "desc" } })),
      listed("singles", () => prisma.songSubmission.findMany({ orderBy: { submittedAt: "desc" } })),
      listed("albums", () => prisma.albumSubmission.findMany({ orderBy: { submittedAt: "desc" } })),
      listed("uploads", () => prisma.uploadFile.findMany({ orderBy: { uploadedAt: "desc" }, omit: { data: true } })),
      listed("uploadsWithData", () => prisma.uploadFile.findMany({ where: { NOT: { data: "" } }, select: { id: true } })),
      listed("royalty", () => prisma.royaltySummary.findMany()),
      listed("distributions", () => prisma.distribution.findMany({ include: { entries: true }, orderBy: { createdAt: "desc" } })),
      listed("licensableWorks", () => prisma.licensableWork.findMany({ orderBy: { createdAt: "desc" } })),
      listed("licenseRequests", () => prisma.licenseRequest.findMany({ orderBy: { createdAt: "desc" } })),
      listed("memberDocuments", () => prisma.memberDocument.findMany({ orderBy: { uploadedAt: "desc" }, omit: { data: true } })),
      listed("memberDocumentsWithData", () => prisma.memberDocument.findMany({ where: { NOT: { data: "" } }, select: { id: true } })),
      listed("supportTickets", () => prisma.supportTicket.findMany({ orderBy: { createdAt: "desc" } })),
    ]);

  return json({
    members: members.map(memberDTO),
    works: works.map(workDTO),
    singles: singles.map(singleDTO),
    albums: albums.map(albumDTO),
    uploads: markHasData(uploads, uploadsWithData).map(uploadDTO),
    royalty: royalty.map((r) => royaltyDTO(r, r.ownerId)),
    distributions: distributions.map((d) => ({ ...distributionDTO(d), entries: d.entries.map(distributionEntryDTO) })),
    licensableWorks: licensableWorks.map(licensableWorkDTO),
    licenseRequests: licenseRequests.map(licenseRequestDTO),
    memberDocuments: markHasData(memberDocuments, memberDocumentsWithData).map(memberDocumentDTO),
    supportTickets: supportTickets.map(supportTicketDTO),
  });
}
