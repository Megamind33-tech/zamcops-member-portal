export interface User {
  email: string;
  role: "admin" | "applicant";
}

export interface HistoricalAuditEntry {
  id: string;
  docType: string;
  timestamp: string;
  auditor: string;
  status: "comment" | "approved" | "rejected" | string;
  message: string;
  sessionNo: number;
}

export interface MembershipApplication {
  id: string;
  name: string; // Full client/representative legal name
  stageOrRegName: string; // Stage Name or Label Corporate Registration Name
  type: "artist" | "label";
  identifier: string; // NRC Number (e.g. 123456/11/1) or PACRA Registration Number
  phone: string;
  email: string;
  status: "Pending" | "Approved" | "Rejected" | "Information Requested";
  submittedAt: string;
  infoRequestNote?: string;
  
  // Uploaded files
  nrcFrontFileName?: string;
  nrcBackFileName?: string;
  passportPhotoFileName?: string;
  contractFileName?: string;
  // Fallbacks
  nrcFileName?: string;

  // Verification Audit States
  idVerified?: boolean;
  contractSigned?: boolean;
  bylawsCompliant?: boolean;
  credentialsValid?: boolean;
  
  // Granular asset checkboxes
  nrcFrontVerified?: boolean;
  nrcBackVerified?: boolean;
  passportPhotoVerified?: boolean;
  contractVerified?: boolean;
  
  auditNotes?: string;
  annotations?: any[];
  historicalAudits?: HistoricalAuditEntry[];
  infoRequested?: boolean; // added compatibility field
}

export interface TrackWork {
  id: string;
  title: string;
  artistName: string;
  sharePercentage: number;
  isrc: string;
  genre: string;
  releaseYear: number;
  submittedBy: string; // Email of Filer
  status: "Pending" | "Approved" | "Rejected";
}

export interface RoyaltyEarning {
  id: string;
  trackId: string;
  trackTitle: string;
  artistName: string;
  source: string;
  grossAmount: number;
  netAmount: number;
  period: string;
  status: string;
  recipientEmail: string;
}

export interface ArtistProfile {
  fullName: string;
  stageName: string;
  memberNumber: string;
  membershipStatus: string;
  nrcNumber: string;
  phone: string;
  bankName: string;
  bankBranch: string;
  bankAccount: string;
  mobileMoneyNumber: string;
  createdAt: string;
}

export interface LabelProfile {
  labelName: string;
  registrationNumber: string;
  representativeName: string;
  phone: string;
  bankName: string;
  bankAccount: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}
