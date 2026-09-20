// Legal text for the work-registration documents. Kept beside the Deed of
// Assignment's text (lib/deedText.ts) rather than inside the renderer, so the
// wording can be reviewed by the office without reading PDF code.
//
// The Deed of Assignment already vests a member's performing, synchronising
// and mechanical rights in the Society for the whole of their catalogue. A
// work declaration does not re-assign anything: it identifies one work, records
// who created it and in what shares, and warrants that those particulars are
// true — which is what the Society relies on when it distributes royalties and
// when it registers the work with affiliated societies through CISAC.

export const WORK_DECLARATION_TITLE = "DECLARATION OF A MUSICAL WORK";
export const WORK_CERTIFICATE_TITLE = "CERTIFICATE OF REGISTRATION OF A MUSICAL WORK";

// The certificate a member receives for a submission. One submission, one
// certificate, however many works it carried — a single is a certificate for
// one work, an album of ten is one certificate listing ten.
export const CLEARANCE_CERTIFICATE_TITLE = "CERTIFICATE OF REGISTRATION";

// Printed above the declarant's signature on the declaration.
export const WORK_DECLARATION_CLAUSES: string[] = [
  "I, the undersigned member of the Zambia Music Copyright Protection Society, declare that the particulars of the musical work set out in this document are true and complete to the best of my knowledge and belief.",
  "I declare that the work is original, that it was created by the persons named in the schedule of interested parties set out in this document, and that the shares shown against their names are the shares agreed between us in respect of the rights stated.",
  "I declare that the work does not, to the best of my knowledge, infringe the copyright or any other right of any other person, and that no part of it has been copied from any other work save where a sample, interpolation or adaptation is expressly disclosed in this document.",
  "Where any interested party named in that schedule is not a member of the Society, I confirm that a letter affirming that person's contribution to the work has been lodged with the Society together with proof of their identity.",
  "I acknowledge that the performing, synchronising and mechanical rights in this work are assigned to the Society under the Deed of Assignment executed by me on admission to membership, and that this declaration identifies the work to which that assignment applies.",
  "I undertake to notify the Society in writing without delay of any change to these particulars, including any change of publisher, any transfer of a share, and any dispute raised in respect of the work.",
  "I understand that royalties are distributed on the strength of these particulars, that a false or misleading declaration may result in the suspension of distribution in respect of the work, and that I am liable to the Society and to any affected party for any loss arising from a declaration I knew, or ought to have known, to be untrue.",
];

// Printed on the certificate, under the Society's counter-signature.
export const CLEARANCE_CERTIFICATE_CLAUSES: string[] = [
  "This is to certify that the musical work or works described in this certificate have been entered in the register of works maintained by the Zambia Music Copyright Protection Society, on the declaration of the member named above and on the evidence lodged with the Society.",
  "The rights in those works are administered by the Society in accordance with the Deed of Assignment executed by the member, the Memorandum and Articles of Association of the Society and the rules and regulations made thereunder.",
  "Registration records the particulars declared to the Society. It is not an adjudication of authorship or of ownership, and it does not by itself create, transfer or confirm copyright in a work. The Society may amend or cancel an entry where the particulars are shown to be incorrect or where a dispute is upheld.",
  "Any person disputing the particulars shown in this certificate may lodge a claim with the Society in writing, stating the grounds of the dispute and supplying the evidence relied upon.",
];

export const WORK_CERTIFICATE_CLAUSES: string[] = [
  "This is to certify that the musical work described in this certificate has been entered in the register of works maintained by the Zambia Music Copyright Protection Society, on the declaration of the member named above and on the evidence lodged with the Society.",
  "The rights in the work are administered by the Society in accordance with the Deed of Assignment executed by the member, the Memorandum and Articles of Association of the Society and the rules and regulations made thereunder.",
  "Registration records the particulars declared to the Society. It is not an adjudication of authorship or of ownership, and it does not by itself create, transfer or confirm copyright in the work. The Society may amend or cancel an entry where the particulars are shown to be incorrect or where a dispute is upheld.",
  "Any person disputing the particulars shown in this certificate may lodge a claim with the Society in writing, stating the grounds of the dispute and supplying the evidence relied upon.",
];

// The undertaking a non-member contributor's affirmation letter stands for —
// printed in the evidence section so the reader knows what is on file.
export const WORK_EVIDENCE_NOTE =
  "The items listed above were lodged with the Society in support of this registration and are held on the member's file. Audio masters, artwork and affirmation letters are retained in the Society's storage and are available to the office on request.";
