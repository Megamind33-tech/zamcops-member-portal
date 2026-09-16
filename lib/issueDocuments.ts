// Issues (or re-issues) the official documents the Society generates:
//
//   * on approval of a membership application — the completed application form,
//     the fully signed Deed of Assignment, and the GM-signed admission letter
//   * on approval of a work — the member's Declaration of a Musical Work and
//     the Board Secretary's Certificate of Registration
//
// Each issue replaces the previously generated copies of the same set, so a
// re-issue (e.g. after an official signature is replaced, or after staff amend
// a work) supersedes cleanly instead of piling up duplicates.

import { prisma } from "@/lib/db";
import {
  generateApplicationFormPdf,
  generateDeedPdf,
  generateAdmissionLetterPdf,
  type GeneratedPdf,
  type OfficialSigner,
} from "@/lib/documents";
import {
  generateWorkDeclarationPdf,
  generateWorkCertificatePdf,
  toWorkLike,
} from "@/lib/workDocuments";
import type { ApplicationFormType } from "@/lib/applicationForms";

export const OFFICES = ["GENERAL_MANAGER", "BOARD_SECRETARY"] as const;
export type Office = (typeof OFFICES)[number];

const GENERATED_DOC_TYPES = ["Membership Application", "Deed of Assignment", "Admission Letter"] as const;
const GENERATED_WORK_DOC_TYPES = ["Work Declaration", "Certificate of Registration"] as const;

function parseJSON<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export class IssueError extends Error {}

// Generates the three PDFs and stores them as MemberDocument rows.
// Throws IssueError with a staff-readable message when a precondition fails.
export async function issueMemberDocuments(ownerId: string): Promise<{ count: number }> {
  const member = await prisma.member.findUnique({ where: { id: ownerId } });
  if (!member) throw new IssueError("Member not found.");
  const application = await prisma.membershipApplication.findUnique({ where: { ownerId } });
  if (!application) throw new IssueError("This member has not completed a membership application.");
  if (!member.signature) throw new IssueError("The member has not provided their signature yet.");

  const [gm, secretary] = await Promise.all([
    prisma.officialSignature.findUnique({ where: { office: "GENERAL_MANAGER" } }),
    prisma.officialSignature.findUnique({ where: { office: "BOARD_SECRETARY" } }),
  ]);
  if (!gm?.image)
    throw new IssueError("No General Manager signature is on file — upload it under Official Signatures first.");
  if (!secretary?.image)
    throw new IssueError("No Board Secretary signature is on file — upload it under Official Signatures first.");

  const formType = application.formType as ApplicationFormType;
  const payload = parseJSON<Record<string, unknown>>(application.payload, {});
  const adminFields = parseJSON<Record<string, unknown>>(application.adminFields, {});
  const refBase = member.memberNumber.replace(/^ZAM-/, "");
  const gmSigner: OfficialSigner = { officerName: gm.officerName, officerTitle: gm.officerTitle, image: gm.image };
  const bsSigner: OfficialSigner = {
    officerName: secretary.officerName,
    officerTitle: secretary.officerTitle,
    image: secretary.image,
  };

  const pdfs: { docType: (typeof GENERATED_DOC_TYPES)[number]; pdf: GeneratedPdf; note: string }[] = [
    {
      docType: "Membership Application",
      note: `${formType} membership application — completed & signed`,
      pdf: generateApplicationFormPdf({
        member,
        formType,
        payload,
        adminFields,
        submittedAt: application.submittedAt,
        reference: `APP-${refBase}`,
      }),
    },
    {
      docType: "Deed of Assignment",
      note: "Deed of Assignment (incl. Mechanical) — executed by the Assignor and the Society",
      pdf: generateDeedPdf({
        member,
        formType,
        payload,
        deedAgreedAt: application.deedAgreedAt,
        boardSecretary: bsSigner,
        reference: `DOA-${refBase}`,
      }),
    },
    {
      docType: "Admission Letter",
      note: `Admission as ${(application.membershipClass || "CANDIDATE").toUpperCase()} member`,
      pdf: generateAdmissionLetterPdf({
        member,
        formType,
        payload,
        applicationDate: application.submittedAt,
        membershipClass: application.membershipClass || "CANDIDATE",
        generalManager: gmSigner,
        reference: `ADM-${refBase}`,
      }),
    },
  ];

  // A re-issue supersedes the previous generated set.
  await prisma.memberDocument.deleteMany({
    where: { ownerId, generated: true, docType: { in: [...GENERATED_DOC_TYPES] } },
  });
  await prisma.memberDocument.createMany({
    data: pdfs.map(({ docType, pdf, note }) => ({
      ownerId,
      docType,
      fileName: pdf.fileName,
      reference: pdf.reference,
      note,
      mimeType: "application/pdf",
      data: pdf.base64,
      generated: true,
    })),
  });

  return { count: pdfs.length };
}


// Generates the work-registration pair for one approved work and files them
// under the member's documents. Called when staff approve a work; calling it
// again (after an amendment, or after a new official signature is uploaded)
// replaces that work's previous pair and leaves every other work alone.
export async function issueWorkDocuments(workId: string): Promise<{ count: number }> {
  const work = await prisma.workDeclaration.findUnique({ where: { id: workId } });
  if (!work) throw new IssueError("Work not found.");

  const member = await prisma.member.findUnique({ where: { id: work.ownerId } });
  if (!member) throw new IssueError("Member not found.");
  if (!member.signature)
    throw new IssueError("The member has not provided their signature yet — the declaration cannot be signed.");

  const secretary = await prisma.officialSignature.findUnique({ where: { office: "BOARD_SECRETARY" } });
  if (!secretary?.image)
    throw new IssueError("No Board Secretary signature is on file — upload it under Official Signatures first.");

  const workLike = toWorkLike(work);
  const refBase = `${work.id.slice(-6).toUpperCase()}-${member.memberNumber.replace(/^ZAM-/, "")}`;

  const pdfs: { docType: (typeof GENERATED_WORK_DOC_TYPES)[number]; pdf: GeneratedPdf; note: string }[] = [
    {
      docType: "Work Declaration",
      note: `Declaration of the musical work “${work.title}” — signed by the member`,
      pdf: generateWorkDeclarationPdf({ member, work: workLike, reference: `WD-${refBase}` }),
    },
    {
      docType: "Certificate of Registration",
      note: `“${work.title}” entered in the ZAMCOPS register of works`,
      pdf: generateWorkCertificatePdf({
        member,
        work: workLike,
        registeredAt: new Date(),
        boardSecretary: {
          officerName: secretary.officerName,
          officerTitle: secretary.officerTitle,
          image: secretary.image,
        },
        reference: `COR-${refBase}`,
      }),
    },
  ];

  // Supersede this work's previous pair only — matched on the reference, which
  // carries the work id, so another work's documents are never touched.
  await prisma.memberDocument.deleteMany({
    where: {
      ownerId: member.id,
      generated: true,
      docType: { in: [...GENERATED_WORK_DOC_TYPES] },
      reference: { in: pdfs.map(({ pdf }) => pdf.reference) },
    },
  });
  await prisma.memberDocument.createMany({
    data: pdfs.map(({ docType, pdf, note }) => ({
      ownerId: member.id,
      docType,
      fileName: pdf.fileName,
      reference: pdf.reference,
      note,
      mimeType: "application/pdf",
      data: pdf.base64,
      generated: true,
    })),
  });

  return { count: pdfs.length };
}
