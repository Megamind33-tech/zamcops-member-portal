// When the society's documents are issued, and which.
//
// Membership is not granted on paperwork alone. A person is admitted when the
// society accepts their first work onto the register — so approving that work
// is the same act as admitting them, and there is no separate approval of a
// membership application. Until then an applicant has an account and a
// submitted form, and nothing has been issued.
//
//   first accepted submission, new member
//       the membership application as submitted
//       the Deed of Assignment, executed by the member and the society
//       the admission letter, signed by the General Manager
//       the clearance certificate for that submission
//
//   every later accepted submission
//       the clearance certificate alone
//
// A submission is what the member sent in one go. A single is one work; an
// album is all of its tracks, sharing a batch. One submission gets one
// certificate however many works it carried, so a ten-track album produces a
// certificate naming ten works rather than ten certificates.

import { prisma } from "@/lib/db";
import {
  generateApplicationFormPdf,
  generateDeedPdf,
  generateAdmissionLetterPdf,
  type GeneratedPdf,
  type OfficialSigner,
} from "@/lib/documents";
import { generateClearanceCertificatePdf, toWorkLike } from "@/lib/workDocuments";
import type { ApplicationFormType } from "@/lib/applicationForms";

export const OFFICES = ["GENERAL_MANAGER", "BOARD_SECRETARY"] as const;
export type Office = (typeof OFFICES)[number];

const MEMBERSHIP_DOC_TYPES = ["Membership Application", "Deed of Assignment", "Admission Letter"] as const;
const CLEARANCE_DOC_TYPE = "Clearance Certificate";

/** The class a member holds from the moment their first work is accepted. */
export const ADMISSION_CLASS = "CANDIDATE";

function parseJSON<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export class IssueError extends Error {}

interface Filed {
  docType: string;
  pdf: GeneratedPdf;
  note: string;
}

async function file(ownerId: string, rows: Filed[]): Promise<void> {
  await prisma.memberDocument.createMany({
    data: rows.map(({ docType, pdf, note }) => ({
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
}

async function signer(office: Office, role: string): Promise<OfficialSigner> {
  const row = await prisma.officialSignature.findUnique({ where: { office } });
  if (!row?.image) {
    throw new IssueError(`No ${role} signature is on file — upload it under Official Signatures first.`);
  }
  return { officerName: row.officerName, officerTitle: row.officerTitle, image: row.image };
}

/**
 * The three membership documents, generated from the member's submitted
 * application. Called when the member is admitted, and again by staff when a
 * document needs re-issuing (after a new official signature, say).
 */
export async function issueMemberDocuments(ownerId: string): Promise<{ count: number }> {
  const member = await prisma.member.findUnique({ where: { id: ownerId } });
  if (!member) throw new IssueError("Member not found.");
  const application = await prisma.membershipApplication.findUnique({ where: { ownerId } });
  if (!application) throw new IssueError("This member has not completed a membership application.");
  if (application.status === "Draft") {
    throw new IssueError("This member's application has not been submitted yet.");
  }
  if (!member.signature) throw new IssueError("The member has not provided their signature yet.");

  const [gm, secretary] = await Promise.all([
    signer("GENERAL_MANAGER", "General Manager"),
    signer("BOARD_SECRETARY", "Board Secretary"),
  ]);

  const formType = application.formType as ApplicationFormType;
  const payload = parseJSON<Record<string, unknown>>(application.payload, {});
  const adminFields = parseJSON<Record<string, unknown>>(application.adminFields, {});
  const refBase = member.memberNumber.replace(/^ZAM-/, "");
  const membershipClass = application.membershipClass || ADMISSION_CLASS;

  const rows: Filed[] = [
    {
      docType: "Membership Application",
      note: `${formType} membership application — completed & signed`,
      pdf: await generateApplicationFormPdf({
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
      pdf: await generateDeedPdf({
        member,
        formType,
        payload,
        deedAgreedAt: application.deedAgreedAt,
        boardSecretary: secretary,
        reference: `DOA-${refBase}`,
      }),
    },
    {
      docType: "Admission Letter",
      note: `Admission as ${membershipClass.toUpperCase()} member`,
      pdf: await generateAdmissionLetterPdf({
        member,
        formType,
        payload,
        applicationDate: application.submittedAt,
        membershipClass,
        generalManager: gm,
        reference: `ADM-${refBase}`,
      }),
    },
  ];

  // A re-issue supersedes the previous set rather than piling up beside it.
  await prisma.memberDocument.deleteMany({
    where: { ownerId, generated: true, docType: { in: [...MEMBERSHIP_DOC_TYPES] } },
  });
  await file(ownerId, rows);
  return { count: rows.length };
}

export interface WorkApprovalResult {
  /** True when this approval is what admitted the member. */
  admitted: boolean;
  /** How many works the certificate covers. */
  works: number;
  documents: string[];
}

/**
 * Everything that follows a work being accepted onto the register.
 *
 * Issues the clearance certificate for the whole submission, and — if this is
 * the member's first accepted work — admits them and issues the membership set
 * alongside it.
 */
export async function issueOnWorkApproval(workId: string): Promise<WorkApprovalResult> {
  const work = await prisma.workDeclaration.findUnique({ where: { id: workId } });
  if (!work) throw new IssueError("Work not found.");

  const member = await prisma.member.findUnique({ where: { id: work.ownerId } });
  if (!member) throw new IssueError("Member not found.");
  if (!member.signature) {
    throw new IssueError("The member has not provided their signature yet — the certificate cannot be signed.");
  }
  const secretary = await signer("BOARD_SECRETARY", "Board Secretary");

  // Everything the member sent in with this work that has since been accepted.
  // Approving an album track by track re-issues a certificate covering the
  // tracks cleared so far, which is what the office would hand over.
  const batch = work.batchId
    ? await prisma.workDeclaration.findMany({
        where: { ownerId: work.ownerId, batchId: work.batchId, status: "Approved" },
        orderBy: [{ workNo: "asc" }, { submittedAt: "asc" }],
      })
    : [work];
  const works = (batch.length ? batch : [work]).map(toWorkLike);

  const refBase = member.memberNumber.replace(/^ZAM-/, "");
  const submissionRef = (work.batchId || work.id).slice(-6).toUpperCase();
  const reference = `COR-${submissionRef}-${refBase}`;

  const certificate = generateClearanceCertificatePdf({
    member,
    works,
    submissionRef,
    registeredAt: new Date(),
    boardSecretary: secretary,
    reference,
  });

  // This submission's certificate only — matched on the reference, which
  // carries the submission, so another submission's is never touched.
  await prisma.memberDocument.deleteMany({
    where: { ownerId: member.id, generated: true, docType: CLEARANCE_DOC_TYPE, reference },
  });
  await file(member.id, [
    {
      docType: CLEARANCE_DOC_TYPE,
      pdf: certificate,
      note:
        works.length === 1
          ? `“${works[0].title}” entered in the ZAMCOPS register of works`
          : `${works.length} works entered in the ZAMCOPS register`,
    },
  ]);

  const documents = [CLEARANCE_DOC_TYPE];

  // Admission. The application is approved by this same act, because accepting
  // the work is what makes the applicant a member.
  const application = await prisma.membershipApplication.findUnique({ where: { ownerId: member.id } });
  const admitting = !!application && application.status === "Submitted";
  if (admitting) {
    await prisma.membershipApplication.update({
      where: { ownerId: member.id },
      data: {
        status: "Approved",
        rejectionReason: "",
        decidedAt: new Date(),
        membershipClass: application.membershipClass || ADMISSION_CLASS,
      },
    });
    await issueMemberDocuments(member.id);
    await prisma.member.update({ where: { id: member.id }, data: { membershipStatus: "Active" } });
    documents.push(...MEMBERSHIP_DOC_TYPES);
  }

  return { admitted: admitting, works: works.length, documents };
}
