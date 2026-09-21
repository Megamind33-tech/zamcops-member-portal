// The official document set issued when a membership application is approved:
//
//   1. the completed membership application form (Individual / Group / Publisher)
//   2. the Deed of Assignment — signed by the member, counter-signed by the
//      Board Secretary's stored official signature
//   3. the admission letter — signed by the General Manager
//
// Each is the society's own document with the member's details written onto it,
// not a redrawing of one. The templates live in assets/forms/ and the positions
// in lib/officialForms/; this file only turns a database row into the values
// those maps expect.
//
// Runs on the server only (the approval route), so official signature images
// never reach the client raw — members receive the rendered PDFs and nothing
// else.

import {
  type ApplicationFormType,
  applicantName,
} from "@/lib/applicationForms";
import { type GeneratedPdf, type MemberLike, type OfficialSigner } from "@/lib/pdfKit";
import { renderOfficialForm, formDate } from "@/lib/officialForms/render";
import { applicationFormStamps, TEMPLATE_FOR } from "@/lib/officialForms/applicationForm";
import { deedStamps } from "@/lib/officialForms/deedOfAssignment";
import { admissionLetterStamps } from "@/lib/officialForms/admissionLetter";
import { districtProvince } from "@/lib/applicationPrefill";

export type { GeneratedPdf, OfficialSigner } from "@/lib/pdfKit";

// The address as the letter should carry it: street, area, then town.
function addressLinesOf(member: MemberLike): string[] {
  return [
    ...String(member.address || "")
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean),
    districtProvince(member.district, member.province),
  ].filter(Boolean);
}

// ── 1. The completed membership application form ───────────────────────────

export async function generateApplicationFormPdf(opts: {
  member: MemberLike;
  formType: ApplicationFormType;
  payload: Record<string, unknown>;
  adminFields: Record<string, unknown>;
  submittedAt: Date | null;
  reference: string;
}): Promise<GeneratedPdf> {
  const { stamps, unplaced } = applicationFormStamps({
    formType: opts.formType,
    payload: opts.payload,
    adminFields: opts.adminFields,
    applicantName: applicantName(opts.formType, opts.payload, opts.member.fullName),
    signedOn: formDate(opts.submittedAt ?? new Date()),
    applicantSignature: opts.member.signature || undefined,
  });

  // An answer with nowhere to go on the paper is a gap in the map, and the
  // office would only find it by reading the form. Say so where it can be seen.
  if (unplaced.length) {
    console.warn(
      `[documents] ${opts.formType} form for ${opts.member.memberNumber}: ` +
        `${unplaced.length} answer(s) have no place on the template — ${unplaced.join("; ")}`,
    );
  }

  return renderOfficialForm({
    template: TEMPLATE_FOR[opts.formType],
    stamps,
    fileName: `${opts.formType}-Membership-Application-${opts.member.memberNumber}.pdf`,
    reference: opts.reference,
  });
}

// ── 2. The Deed of Assignment (incl. Mechanical) ───────────────────────────

export async function generateDeedPdf(opts: {
  member: MemberLike;
  formType: ApplicationFormType;
  payload: Record<string, unknown>;
  deedAgreedAt: Date | null;
  boardSecretary: OfficialSigner;
  reference: string;
}): Promise<GeneratedPdf> {
  return renderOfficialForm({
    template: "deed",
    stamps: deedStamps({
      assignorName: applicantName(opts.formType, opts.payload, opts.member.fullName),
      assignorMemberNumber: opts.member.memberNumber,
      // One line, where the admission letter stacks the same parts.
      assignorAddress: addressLinesOf(opts.member).join(", "),
      madeOn: opts.deedAgreedAt ?? new Date(),
      assignorSignature: opts.member.signature || undefined,
      boardSecretarySignature: opts.boardSecretary.image,
      boardSecretaryName: opts.boardSecretary.officerName,
    }),
    fileName: `Deed-of-Assignment-${opts.member.memberNumber}.pdf`,
    reference: opts.reference,
  });
}

// ── 3. The admission letter ────────────────────────────────────────────────

export async function generateAdmissionLetterPdf(opts: {
  member: MemberLike;
  formType: ApplicationFormType;
  payload: Record<string, unknown>;
  applicationDate: Date | null;
  membershipClass: string; // e.g. "CANDIDATE"
  generalManager: OfficialSigner;
  reference: string;
}): Promise<GeneratedPdf> {
  return renderOfficialForm({
    template: "admission",
    stamps: admissionLetterStamps({
      memberName: applicantName(opts.formType, opts.payload, opts.member.fullName),
      addressLines: addressLinesOf(opts.member),
      applicationDate: formDate(opts.applicationDate ?? new Date()),
      membershipClass: opts.membershipClass || "CANDIDATE",
      generalManagerSignature: opts.generalManager.image,
    }),
    fileName: `Admission-Letter-${opts.member.memberNumber}.pdf`,
    reference: opts.reference,
  });
}
