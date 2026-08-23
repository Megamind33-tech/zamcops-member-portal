import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { memberDocumentDTO } from "@/lib/serialize";
import { notifyMember } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const DOC_TYPES = [
  "Clearance Letter",
  "Deed of Assignment",
  "Contract",
  "ID Document",
  "Membership Application",
  "Admission Letter",
  "Other",
];

// Attach an official document (clearance letter, deed of assignment, etc.) to a
// member's file, and notify the member it was added.
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  const { ownerId, docType, fileName, reference, note } = b;
  if (!ownerId || !fileName?.trim()) return bad("A member and a file are required.");
  if (docType && !DOC_TYPES.includes(docType)) return bad("Invalid document type.");

  const member = await prisma.member.findUnique({ where: { id: ownerId } });
  if (!member) return bad("Member not found.", 404);

  const doc = await prisma.memberDocument.create({
    data: {
      ownerId,
      docType: docType || "Other",
      fileName,
      reference: reference ?? "",
      note: note ?? "",
    },
  });

  await notifyMember(ownerId, {
    title: "Document added to your file",
    body: `ZAMCOPS attached a ${doc.docType} (“${doc.fileName}”) to your membership record.`,
    type: "info",
    href: "/documents",
  });

  await logAudit(session.sub, "document.attached", {
    targetType: "MemberDocument",
    targetId: doc.id,
    summary: `Attached ${doc.docType} “${doc.fileName}” to ${member.fullName}`,
  });

  return json({ document: memberDocumentDTO(doc) }, 201);
}

// Remove a document from a member's file.
export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b?.id) return bad("Document id required.");
  const doc = await prisma.memberDocument.delete({ where: { id: b.id } }).catch(() => null);

  if (doc) {
    await logAudit(session.sub, "document.removed", {
      targetType: "MemberDocument",
      targetId: doc.id,
      summary: `Removed ${doc.docType} “${doc.fileName}”`,
    });
  }

  return json({ ok: true });
}
