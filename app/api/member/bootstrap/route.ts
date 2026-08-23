import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad, markHasData } from "@/lib/server";
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
export const dynamic = "force-dynamic";

async function listed<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[bootstrap] ${label} failed:`, err);
    return [];
  }
}

// Returns everything the signed-in member needs to render the portal.
// Catalogue/notification queries are isolated so a missing column after a
// deploy (before `prisma db push`) cannot bounce a valid session back to login.
export async function GET() {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);
  const id = session.sub;

  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) return bad("Member not found.", 404);

  const [
    works,
    singles,
    albums,
    uploads,
    uploadsWithData,
    notifications,
    statements,
    royalty,
    distributionEntries,
    licensableWorks,
    licenseRequests,
  ] = await Promise.all([
    listed("works", () => prisma.workDeclaration.findMany({ where: { ownerId: id }, orderBy: { submittedAt: "desc" } })),
    listed("singles", () => prisma.songSubmission.findMany({ where: { ownerId: id }, orderBy: { submittedAt: "desc" } })),
    listed("albums", () => prisma.albumSubmission.findMany({ where: { ownerId: id }, orderBy: { submittedAt: "desc" } })),
    listed("uploads", () =>
      prisma.uploadFile.findMany({ where: { ownerId: id }, orderBy: { uploadedAt: "desc" }, omit: { data: true } }),
    ),
    listed("uploadsWithData", () => prisma.uploadFile.findMany({ where: { ownerId: id, NOT: { data: "" } }, select: { id: true } })),
    listed("notifications", () => prisma.notification.findMany({ where: { ownerId: id }, orderBy: { createdAt: "desc" } })),
    listed("statements", () => prisma.statement.findMany({ where: { ownerId: id }, orderBy: { issuedAt: "desc" } })),
    prisma.royaltySummary.findUnique({ where: { ownerId: id } }).catch((err) => {
      console.error("[bootstrap] royalty failed:", err);
      return null;
    }),
    listed("distributions", () =>
      prisma.distributionEntry.findMany({
        where: { ownerId: id, distribution: { status: "Published" } },
        include: { distribution: true },
        orderBy: { distribution: { publishedAt: "desc" } },
      }),
    ),
    listed("licensableWorks", () => prisma.licensableWork.findMany({ where: { ownerId: id }, orderBy: { createdAt: "desc" } })),
    listed("licenseRequests", () => prisma.licenseRequest.findMany({ where: { ownerId: id }, orderBy: { createdAt: "desc" } })),
  ]);

  return json({
    member: memberDTO(member),
    works: works.map(workDTO),
    singles: singles.map(singleDTO),
    albums: albums.map(albumDTO),
    uploads: markHasData(uploads, uploadsWithData).map(uploadDTO),
    notifications: notifications.map(notificationDTO),
    statements: statements.map(statementDTO),
    royalty: royaltyDTO(royalty, id),
    distributions: distributionEntries.map((e) => memberDistributionDTO(e.distribution, e)),
    licensableWorks: licensableWorks.map(licensableWorkDTO),
    licenseRequests: licenseRequests.map(licenseRequestDTO),
  });
}
