// ZAMCOPS Artist Membership Portal — Domain Models
// Shared across the artist mobile app and the admin dashboard.

export type MemberRole =
  | "Artist"
  | "Composer"
  | "Producer"
  | "Publisher"
  | "Label"
  | "Next of Kin/Representative";

export type MembershipStatus = "Pending" | "Active" | "Suspended" | "Lapsed" | "Rejected";

export type ReviewStatus = "Pending" | "Approved" | "Rejected" | "Under Review";

export type WorkType =
  | "Song"
  | "Instrumental"
  | "Beat"
  | "Composition"
  | "Lyric"
  | "Arrangement";

export type ContributorRole =
  | "Composer"
  | "Author/Lyricist"
  | "Producer"
  | "Performer"
  | "Publisher"
  | "Arranger";

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
  // Membership
  membershipStatus: MembershipStatus;
  joinedAt: string;
  password?: string; // demo-only, never do this in production
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
  producers: string[];
  publisher?: string;
  publisherIpi?: string; // Publisher's IPI / CAE number, for cross-society registration
  ownershipSplits: OwnershipSplit[];
  isrc?: string;
  iswc?: string;
  dateCreated: string;
  status: ReviewStatus;
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
  coverArt?: string;
  tracks: Track[];
  status: ReviewStatus;
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
  | "Other";

export interface MemberDocument {
  id: string;
  ownerId: string;
  docType: MemberDocType;
  fileName: string;
  reference?: string;
  note?: string;
  uploadedAt: string;
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
