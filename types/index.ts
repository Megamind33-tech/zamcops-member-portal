// ZAMCOPS Member Portal — domain models shared by the member portal and staff dashboard.
//
// ZAMCOPS registers composers, authors and publishers of musical works
// (authors' rights). Arrangers receive a share on a work. Related rights
// (performers, producers) are not administered.

export type { MemberRole, ContributorRole } from "@/lib/roles";
import type { MemberRole, ContributorRole } from "@/lib/roles";

export type MembershipStatus = "Pending" | "Active" | "Suspended" | "Lapsed" | "Rejected";

export type ReviewStatus = "Pending" | "Approved" | "Rejected" | "Under Review";

export type WorkType = "Song" | "Instrumental" | "Arrangement";

export type UploadStatus = "Pending" | "Processing" | "Approved" | "Rejected";

export type StatementType =
  | "Membership Receipt"
  | "Submission Receipt"
  | "Royalty Statement";

// Performing rights (broadcast/public performance) and mechanical rights
// (reproduction/distribution) are collected and reconciled separately by
// CISAC-affiliated societies — splits often differ between the two, so a
// rightsholder's share must declare which it covers.
export type RightsType = "Performing" | "Mechanical" | "Both";

export interface Contributor {
  id: string;
  name: string;
  role: ContributorRole;
  ipiNumber?: string; // Interested Party Information number — cross-society rightsholder ID
}

export interface OwnershipSplit {
  id: string;
  party: string; // contributor / rights holder name
  role: ContributorRole;
  percentage: number;
  ipiNumber?: string; // Interested Party Information number, for reciprocal-society registration
  rightsType?: RightsType; // which royalty stream this share applies to
  // Identity — members already on file skip NRC + affirmation letter.
  memberId?: string;
  memberNumber?: string;
  knownMember?: boolean;
  nrc?: string; // required when the creator is not a ZAMCOPS member
  affirmationLetter?: string; // letter that they took part in creating the work
}

export interface Member {
  id: string;
  memberNumber: string; // e.g. ZAM-2026-00123
  // Identity
  fullName: string;
  stageName: string;
  nrcOrPassport: string;
  dateOfBirth?: string;
  gender?: "Male" | "Female" | "Other" | "";
  // Contact
  phone: string;
  email: string;
  role: MemberRole;
  // KYC / location
  province?: string;
  district?: string;
  address?: string;
  // Payout
  bankName?: string;
  bankAccount?: string;
  mobileMoneyNumber?: string;
  // Next of kin
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  // Documents
  nrcDocument?: string; // uploaded file name
  profilePhoto?: string; // uploaded file name
  // Preferences
  notificationPrefs?: string; // JSON { email, sms, royalty, marketing }
  // Membership
  membershipStatus: MembershipStatus;
  joinedAt: string;
  hasSignature?: boolean; // a reusable signature image is stored on file
  emailVerified?: boolean; // email confirmed via OTP
  password?: string; // demo-only, never do this in production
}

// ── Official membership application (digitised paper forms) ────────────────

export type ApplicationFormType = "Individual" | "Group" | "Publisher";
export type ApplicationStatus = "Draft" | "Submitted" | "Approved" | "Rejected";

export interface MembershipApplication {
  id: string;
  ownerId: string;
  formType: ApplicationFormType;
  payload: Record<string, unknown>; // applicant answers — shape per lib/applicationForms.ts
  adminFields: Record<string, string>; // staff-only fields (internal number, file, ...)
  status: ApplicationStatus;
  rejectionReason?: string;
  membershipClass?: string; // e.g. CANDIDATE — set by staff at approval
  deedAgreedAt?: string;
  submittedAt?: string;
  decidedAt?: string;
  updatedAt: string;
}

export type SignatureOffice = "GENERAL_MANAGER" | "BOARD_SECRETARY";

// A reusable official signature, managed by staff and applied to generated
// documents (GM → admission letters, Board Secretary → deeds of assignment).
export interface OfficialSignatureInfo {
  office: SignatureOffice;
  officerName: string;
  officerTitle: string;
  image?: string; // transparent PNG data URL — admin console only
  updatedAt: string;
}

export interface WorkDeclaration {
  id: string;
  ownerId: string;
  title: string;
  alternativeTitle?: string;
  workType: WorkType;
  language: string;
  genre: string;
  duration: string; // mm:ss
  composers: string[];
  authors: string[];
  subAuthors: string[];
  subArrangers: string[];
  arrangers?: string[];
  publisher?: string;
  coverArt?: string;
  publisherIpi?: string; // Publisher's IPI / CAE number, for cross-society registration
  ownershipSplits: OwnershipSplit[];
  isrc?: string;
  iswc?: string;
  audioFile?: string; // reference recording — file name
  studioReceipt?: string; // studio letter or receipt — required
  dateCreated: string;
  status: ReviewStatus;
  rejectionReason?: string;
  submittedAt: string;
}

export interface SongSubmission {
  id: string;
  ownerId: string;
  title: string;
  artistName: string;
  featuredArtists?: string;
  producer?: string;
  genre: string;
  releaseDate: string;
  isrc?: string;
  audioFile?: string;
  coverArt?: string;
  lyricsFile?: string;
  ownershipSplits: OwnershipSplit[];
  status: ReviewStatus;
  rejectionReason?: string;
  submittedAt: string;
}

export interface Track {
  id: string;
  title: string;
  duration: string;
  genre: string;
  contributors: Contributor[];
  ownershipSplits: OwnershipSplit[];
  isrc?: string;
  audioFile?: string;
}

export interface AlbumSubmission {
  id: string;
  ownerId: string;
  title: string;
  artistName: string;
  releaseDate: string;
  coverArt?: string; // front cover — image data URL
  backCover?: string; // back cover — image data URL
  tracks: Track[];
  studioReceipt?: string;
  status: ReviewStatus;
  rejectionReason?: string;
  submittedAt: string;
}

export interface UploadFile {
  id: string;
  ownerId: string;
  fileName: string;
  fileType: "Audio" | "Cover Art" | "Lyrics" | "Document";
  linkedTo?: string; // title of song / album / work
  uploadedAt: string;
  status: UploadStatus;
  rejectionReason?: string;
  hasFile?: boolean; // a downloadable/playable binary is stored (served via the staff proxy)
  fileSize?: number; // bytes
  mimeType?: string;
}

export interface RoyaltyUsageLog {
  id: string;
  songTitle: string;
  source: string; // station / platform
  plays: number;
  period: string;
  estimatedAmount: number;
}

export interface RoyaltySummary {
  ownerId: string;
  currency: string; // "ZMW"
  totalEstimated: number;
  pending: number;
  paid: number;
  usageLogs: RoyaltyUsageLog[];
  topSongs: { title: string; plays: number; amount: number }[];
}

export interface AppNotification {
  id: string;
  ownerId: string;
  title: string;
  body: string;
  type: "info" | "success" | "warning" | "action";
  href?: string;
  createdAt: string;
  read: boolean;
}

export interface Statement {
  id: string;
  ownerId: string;
  type: StatementType;
  title: string;
  reference: string;
  amount?: number;
  issuedAt: string;
}

export type MemberDocType =
  | "Clearance Letter"
  | "Deed of Assignment"
  | "Contract"
  | "ID Document"
  | "Membership Application"
  | "Admission Letter"
  | "Other";

export interface MemberDocument {
  id: string;
  ownerId: string;
  docType: MemberDocType;
  fileName: string;
  reference?: string;
  note?: string;
  uploadedAt: string;
  hasFile?: boolean; // downloadable bytes are stored
  generated?: boolean; // issued by the system at approval
}

export type SupportTicketStatus = "Open" | "Resolved";

export interface SupportThreadMessage {
  author: "member" | "staff";
  body: string;
  at: string;
}

// A help-desk query — filed by a signed-in member, or by a signed-out visitor
// requesting a password reset (ownerId empty, contact carries the identifier).
export interface SupportTicket {
  id: string;
  ownerId?: string;
  contact?: string;
  topic: string;
  message: string;
  status: SupportTicketStatus;
  reply?: string;
  thread: SupportThreadMessage[];
  createdAt: string;
  resolvedAt?: string;
}

export type DistributionStatus = "Draft" | "Published";

// A society-wide distribution period. Members only ever see Published periods —
// this is the gate between "detected activity" and "confirmed earnings".
export interface Distribution {
  id: string;
  periodLabel: string; // e.g. "Q1 2026"
  status: DistributionStatus;
  notes?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface DistributionEntry {
  id: string;
  distributionId: string;
  ownerId: string;
  amount: number;
  currency: string;
  topSongs: { title: string; plays: number; amount: number }[];
}

// A distribution period as seen by a member: the period plus their own confirmed payout.
export interface MemberDistribution extends Distribution {
  amount: number;
  currency: string;
  topSongs: { title: string; plays: number; amount: number }[];
}

export type LicenseUsageType =
  | "Film & TV"
  | "Advertising"
  | "Online content"
  | "Live events"
  | "Other";

export type LicenseRequestStatus =
  | "Submitted"
  | "In review"
  | "Offer sent"
  | "Accepted"
  | "Declined";

// A catalog work the member has opted into ZAMCOPS' direct/sync licensing pool.
export interface LicensableWork {
  id: string;
  ownerId: string;
  workTitle: string;
  workRef?: string;
  usageTypes: LicenseUsageType[];
  minFee?: number;
  notes?: string;
  status: "Active" | "Paused";
  createdAt: string;
}

// An inbound licensing enquiry from a business, brokered by ZAMCOPS — generates
// income for the member and a facilitation fee for the institution.
export interface LicenseRequest {
  id: string;
  workId: string;
  ownerId: string;
  requesterName: string;
  requesterCompany?: string;
  requesterEmail: string;
  usageType: LicenseUsageType;
  description?: string;
  proposedFee?: number;
  facilitationFee?: number;
  status: LicenseRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReviewItem {
  id: string;
  kind: "Member" | "Work Declaration" | "Single" | "Album" | "Upload";
  refId: string;
  title: string;
  submittedBy: string;
  submittedAt: string;
  status: ReviewStatus | UploadStatus | MembershipStatus;
}
