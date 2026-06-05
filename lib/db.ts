import { useState, useEffect } from "react";

// -------------------------------------------------------------
// Database Interfaces
// -------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: "Artist" | "Label" | "Publisher" | "Admin" | "Finance";
  status: "Active" | "Pending" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

export interface ArtistProfile {
  id: string;
  userId: string;
  fullName: string;
  stageName: string;
  dateOfBirth: string;
  nationality: string;
  nrcOrPassportNumber: string;
  phone: string;
  email: string;
  province: string;
  town: string;
  address: string;
  artistRoles: string[]; // e.g. ["Composer", "Lyricist", "Vocalist"]
  genres: string[]; // e.g. ["Kalindula", "Afro-pop"]
  membershipStatus: "Pending" | "Approved" | "Rejected" | "Draft";
  memberNumber?: string; // Generated on approval
  createdAt: string;
  updatedAt: string;
}

export interface LabelProfile {
  id: string;
  userId: string;
  labelName: string;
  registrationNumber: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  status: "Approved" | "Pending" | "Rejected";
  createdAt: string;
  updatedAt: string;
}

export interface PublisherProfile {
  id: string;
  userId: string;
  publisherName: string;
  registrationNumber: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  status: "Approved" | "Pending" | "Rejected";
  createdAt: string;
  updatedAt: string;
}

export interface MembershipApplication {
  id: string;
  applicantUserId: string;
  applicantType: "Artist" | "Label" | "Publisher";
  status: "Draft" | "Pending" | "Approved" | "Rejected" | "InformationRequested";
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  missingDocumentsNote?: string;
  applicationNumber: string;
}

export interface Document {
  id: string;
  ownerUserId: string;
  applicationId?: string;
  documentType: "NRC Front" | "NRC Back" | "Passport" | "Artist Photo" | "Signature" | "Proof of Payment" | "Certificate";
  fileUrl: string;
  fileName: string;
  mimeType: string;
  status: "Pending" | "Approved" | "Rejected";
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface Work {
  id: string;
  ownerUserId: string;
  workType: "Single" | "Album" | "EP" | "Instrumental" | "Composition";
  title: string;
  alternativeTitle?: string;
  genre: string;
  language: string;
  duration: number; // in seconds
  isrc?: string;
  iswc?: string;
  registrationNumber?: string; // e.g. ZCP-WR-xxxx
  status: "Pending" | "Approved" | "Rejected" | "Draft";
  submittedAt: string;
  approvedAt?: string;
  rejectedReason?: string;
}

export interface Song {
  id: string;
  workId: string;
  title: string;
  trackNumber: number;
  duration: number;
  audioFileUrl: string;
  artworkUrl?: string;
  lyricsFileUrl?: string;
  status: "Pending" | "Approved" | "Rejected" | "Draft";
}

export interface Album {
  id: string;
  ownerUserId: string;
  title: string;
  releaseDate: string;
  artworkUrl?: string;
  numberOfTracks: number;
  status: "Pending" | "Approved" | "Rejected" | "Draft";
}

export interface Contributor {
  id: string;
  workId: string;
  name: string;
  role: string; // e.g. "Composer" | "Author" | "Publisher" | "Producer" | "Performer"
  userId?: string;
  percentageSplit: number; // e.g. 50 (for 50%)
  contactInfo: string;
  publisherName?: string;
}

export interface RoyaltyUsageLog {
  id: string;
  workId: string;
  songId: string;
  sourceType: "Radio Broadcast" | "TV Broadcast" | "Digital Streaming" | "Live Performance" | "Public Place";
  stationOrUser: string; // e.g. "ZNBC Radio 2" or "Hot FM"
  usageDate: string;
  duration: number; // in seconds Logged
  amountGenerated: number; // ZMK
  metadata?: string;
  createdAt: string;
}

export interface RoyaltyEarning {
  id: string;
  ownerUserId: string;
  workId: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  status: "Pending" | "Paid" | "Processing";
}

export interface Payment {
  id: string;
  ownerUserId: string;
  paymentBatchId: string;
  amount: number;
  paymentMethod: string; // "Bank Transfer" | "Mobile Money (Airtel)" | "Mobile Money (MTN)"
  paymentReference: string;
  status: "Failed" | "Pending" | "Paid";
  paidAt?: string;
}

export interface PaymentBatch {
  id: string;
  batchName: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  status: "Pending" | "Processing" | "Paid";
  createdBy: string;
  createdAt: string;
}

export interface FinancialReport {
  id: string;
  reportType: "Monthly Collection" | "Distribution Summary" | "Royalties Audit" | "Bank Reconciliation";
  periodStart: string;
  periodEnd: string;
  fileUrl: string;
  generatedBy: string;
  generatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: string;
  newValue?: string;
  ipAddress: string;
  createdAt: string;
}

// -------------------------------------------------------------
// Seed Records (Stored in Memory / localStorage Init)
// -------------------------------------------------------------

const DEFAULT_USERS: User[] = [
  // 1. Approved Artist User
  {
    id: "artist-1",
    email: "artist@zamcops.org",
    phone: "+260971111111",
    passwordHash: "password", // Simple for testing
    role: "Artist",
    status: "Active",
    createdAt: "2025-01-10T08:00:00Z",
    updatedAt: "2025-01-15T12:00:00Z",
  },
  // 2. Pending Artist User
  {
    id: "artist-2",
    email: "pending@zamcops.org",
    phone: "+260972222222",
    passwordHash: "password",
    role: "Artist",
    status: "Pending",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T12:00:00Z",
  },
  // 3. Label User
  {
    id: "label-1",
    email: "info@zedbeats.co.zm",
    phone: "+260973333333",
    passwordHash: "password",
    role: "Label",
    status: "Active",
    createdAt: "2025-03-20T09:00:00Z",
    updatedAt: "2025-03-22T14:00:00Z",
  },
  // 4. Admin User
  {
    id: "admin-1",
    email: "admin@zamcops.org",
    phone: "+260978888888",
    passwordHash: "admin123",
    role: "Admin",
    status: "Active",
    createdAt: "2024-01-01T08:00:00Z",
    updatedAt: "2024-01-01T08:00:00Z",
  },
  // 5. Finance User
  {
    id: "finance-1",
    email: "finance@zamcops.org",
    phone: "+260979999999",
    passwordHash: "finance123",
    role: "Finance",
    status: "Active",
    createdAt: "2024-01-01T08:00:00Z",
    updatedAt: "2024-01-01T08:00:00Z",
  },
];

const DEFAULT_ARTIST_PROFILES: ArtistProfile[] = [
  {
    id: "profile-1",
    userId: "artist-1",
    fullName: "Mwansa Kalombo",
    stageName: "Chef Mwansa",
    dateOfBirth: "1990-05-15",
    nationality: "Zambian",
    nrcOrPassportNumber: "123456/11/1",
    phone: "+260971111111",
    email: "artist@zamcops.org",
    province: "Lusaka",
    town: "Lusaka",
    address: "Plot 45, Great East Road",
    artistRoles: ["Composer", "Lyricist", "Performer"],
    genres: ["Kalindula", "Afro-pop"],
    membershipStatus: "Approved",
    memberNumber: "ZCP-2025-0045",
    createdAt: "2025-01-10T08:30:00Z",
    updatedAt: "2025-01-15T12:00:00Z",
  },
  {
    id: "profile-2",
    userId: "artist-2",
    fullName: "Chileshe Bwalya",
    stageName: "Sister Chileshe",
    dateOfBirth: "1994-08-20",
    nationality: "Zambian",
    nrcOrPassportNumber: "234567/22/1",
    phone: "+260972222222",
    email: "pending@zamcops.org",
    province: "Copperbelt",
    town: "Ndola",
    address: "12 Chachacha Road",
    artistRoles: ["Vocalist", "Songwriter"],
    genres: ["Gospel", "R&B"],
    membershipStatus: "Pending",
    createdAt: "2026-06-01T10:30:00Z",
    updatedAt: "2026-06-01T12:00:00Z",
  },
];

const DEFAULT_LABEL_PROFILES: LabelProfile[] = [
  {
    id: "lprof-1",
    userId: "label-1",
    labelName: "ZedBeats Records Ltd",
    registrationNumber: "LREG-43891",
    contactPerson: "Danny Phiri",
    phone: "+260973333333",
    email: "info@zedbeats.co.zm",
    address: "101 Cairo Road, Lusaka",
    status: "Approved",
    createdAt: "2025-03-20T09:15:00Z",
    updatedAt: "2025-03-22T14:00:00Z",
  },
];

const DEFAULT_PUBLISHER_PROFILES: PublisherProfile[] = [];

const DEFAULT_APPLICATIONS: MembershipApplication[] = [
  {
    id: "application-2",
    applicantUserId: "artist-2",
    applicantType: "Artist",
    status: "Pending",
    submittedAt: "2026-06-01T12:00:00Z",
    applicationNumber: "APP-2026-0811",
  },
];

const DEFAULT_DOCUMENTS: Document[] = [
  // Artist 1 documents (Approved and visualizable)
  {
    id: "doc-11",
    ownerUserId: "artist-1",
    documentType: "NRC Front",
    fileUrl: "https://picsum.photos/seed/nrc1/800/500",
    fileName: "nrc_front_mwansa.jpg",
    mimeType: "image/jpeg",
    status: "Approved",
    uploadedAt: "2025-01-10T08:45:00Z",
    reviewedAt: "2025-01-15T11:30:00Z",
    reviewedBy: "admin-1",
  },
  {
    id: "doc-12",
    ownerUserId: "artist-1",
    documentType: "NRC Back",
    fileUrl: "https://picsum.photos/seed/nrc2/800/500",
    fileName: "nrc_back_mwansa.jpg",
    mimeType: "image/jpeg",
    status: "Approved",
    uploadedAt: "2025-01-10T08:46:00Z",
    reviewedAt: "2025-01-15T11:32:00Z",
    reviewedBy: "admin-1",
  },
  {
    id: "doc-13",
    ownerUserId: "artist-1",
    documentType: "Artist Photo",
    fileUrl: "https://picsum.photos/seed/artistphoto/400/400",
    fileName: "chef_mwansa_promo.jpg",
    mimeType: "image/jpeg",
    status: "Approved",
    uploadedAt: "2025-01-10T08:48:00Z",
    reviewedAt: "2025-01-15T11:35:00Z",
    reviewedBy: "admin-1",
  },
  // Artist 2 documents (Pending review)
  {
    id: "doc-21",
    ownerUserId: "artist-2",
    applicationId: "application-2",
    documentType: "NRC Front",
    fileUrl: "https://picsum.photos/seed/nrc3/800/500",
    fileName: "chileshe_nrc_front.png",
    mimeType: "image/png",
    status: "Pending",
    uploadedAt: "2026-06-01T11:45:00Z",
  },
  {
    id: "doc-22",
    ownerUserId: "artist-2",
    applicationId: "application-2",
    documentType: "Artist Photo",
    fileUrl: "https://picsum.photos/seed/chicphoto/400/400",
    fileName: "sister_chileshe_face.jpg",
    mimeType: "image/jpeg",
    status: "Pending",
    uploadedAt: "2026-06-01T11:50:00Z",
  },
];

const DEFAULT_WORKS: Work[] = [
  {
    id: "work-1",
    ownerUserId: "artist-1",
    workType: "Single",
    title: "Nalilubile",
    alternativeTitle: "I Was Lost",
    genre: "Kalindula",
    language: "Bemba",
    duration: 210,
    isrc: "ZM-A01-26-00101",
    iswc: "T-04329241-1",
    registrationNumber: "WR-2025-1031",
    status: "Approved",
    submittedAt: "2025-05-10T10:00:00Z",
    approvedAt: "2025-05-12T14:30:00Z",
  },
  {
    id: "work-2",
    ownerUserId: "artist-1",
    workType: "Single",
    title: "Zambia Mukwai",
    alternativeTitle: "My Zambia",
    genre: "Afro-pop",
    language: "Nyanja",
    duration: 185,
    isrc: "ZM-A01-26-00102",
    iswc: "T-04329241-2",
    registrationNumber: "WR-2025-1032",
    status: "Approved",
    submittedAt: "2025-05-15T09:00:00Z",
    approvedAt: "2025-05-16T11:00:00Z",
  },
  {
    id: "work-3",
    ownerUserId: "artist-1",
    workType: "Single",
    title: "Imiti Ikula",
    alternativeTitle: "The Growing Trees",
    genre: "Kalindula",
    language: "Bemba",
    duration: 240,
    isrc: "",
    iswc: "",
    status: "Pending",
    submittedAt: "2026-06-03T15:45:00Z",
  },
];

const DEFAULT_SONGS: Song[] = [
  {
    id: "song-1",
    workId: "work-1",
    title: "Nalilubile",
    trackNumber: 1,
    duration: 210,
    audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", // Working demo MP3 for audio player testing
    artworkUrl: "https://picsum.photos/seed/art1/400/400",
    status: "Approved",
  },
  {
    id: "song-2",
    workId: "work-2",
    title: "Zambia Mukwai",
    trackNumber: 1,
    duration: 185,
    audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    artworkUrl: "https://picsum.photos/seed/art2/400/400",
    status: "Approved",
  },
  {
    id: "song-3",
    workId: "work-3",
    title: "Imiti Ikula",
    trackNumber: 1,
    duration: 240,
    audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    artworkUrl: "https://picsum.photos/seed/art3/400/400",
    status: "Pending",
  },
];

const DEFAULT_CONTRIBUTORS: Contributor[] = [
  // Work 1 Splits: Composer: 60%, Lyricist: 40%
  {
    id: "cn-1",
    workId: "work-1",
    name: "Mwansa Kalombo",
    role: "Composer",
    userId: "artist-1",
    percentageSplit: 60,
    contactInfo: "+260971111111",
  },
  {
    id: "cn-2",
    workId: "work-1",
    name: "Mwansa Kalombo",
    role: "Lyricist",
    userId: "artist-1",
    percentageSplit: 40,
    contactInfo: "+260971111111",
  },
  // Work 2 Splits: 100% Composer Mwansa
  {
    id: "cn-3",
    workId: "work-2",
    name: "Mwansa Kalombo",
    role: "Composer",
    userId: "artist-1",
    percentageSplit: 100,
    contactInfo: "+260971111111",
  },
  // Work 3 Splits (Pending Splitting)
  {
    id: "cn-4",
    workId: "work-3",
    name: "Mwansa Kalombo",
    role: "Composer",
    userId: "artist-1",
    percentageSplit: 50,
    contactInfo: "+260971111111",
  },
  {
    id: "cn-5",
    workId: "work-3",
    name: "Mutale Phiri",
    role: "Lyricist",
    percentageSplit: 50,
    contactInfo: "+260975654321",
  },
];

const DEFAULT_ALBUMS: Album[] = [];

// Raw Usage Logs Seed - simulating broadcast usage of songs to generate royalty earnings
const DEFAULT_USAGE_LOGS: RoyaltyUsageLog[] = [
  {
    id: "log-1",
    workId: "work-1",
    songId: "song-1",
    sourceType: "Radio Broadcast",
    stationOrUser: "ZNBC Radio 2",
    usageDate: "2026-05-20",
    duration: 210,
    amountGenerated: 450.00,
    metadata: "Morning Drive Time playlist",
    createdAt: "2026-05-20T23:00:00Z",
  },
  {
    id: "log-2",
    workId: "work-1",
    songId: "song-1",
    sourceType: "TV Broadcast",
    stationOrUser: "ZTV Live",
    usageDate: "2026-05-21",
    duration: 210,
    amountGenerated: 900.00,
    metadata: "Music video chart countdown",
    createdAt: "2026-05-21T23:00:00Z",
  },
  {
    id: "log-3",
    workId: "work-2",
    songId: "song-2",
    sourceType: "Digital Streaming",
    stationOrUser: "Boomplay Zambia",
    usageDate: "2026-05-22",
    duration: 185,
    amountGenerated: 250.00,
    metadata: "35,000 Zambian Hits streams",
    createdAt: "2026-05-22T23:00:00Z",
  },
  {
    id: "log-4",
    workId: "work-1",
    songId: "song-1",
    sourceType: "Live Performance",
    stationOrUser: "Lusaka Music Festival",
    usageDate: "2026-05-25",
    duration: 420,
    amountGenerated: 1500.00,
    metadata: "Recorded live public log sheet",
    createdAt: "2026-05-25T23:00:00Z",
  },
];

const DEFAULT_ROYALTY_EARNINGS: RoyaltyEarning[] = [
  {
    id: "earning-1",
    ownerUserId: "artist-1",
    workId: "work-1",
    periodStart: "2026-01-01",
    periodEnd: "2026-03-31",
    grossAmount: 4500.00,
    deductions: 450.00, // ZAMCOPS 10% admin fee
    netAmount: 4050.00,
    status: "Paid",
  },
  {
    id: "earning-2",
    ownerUserId: "artist-1",
    workId: "work-2",
    periodStart: "2026-01-01",
    periodEnd: "2026-03-31",
    grossAmount: 2500.00,
    deductions: 250.00,
    netAmount: 2250.00,
    status: "Paid",
  },
  // Pending distribution (Ready for Finance Officer to distribute)
  {
    id: "earning-3",
    ownerUserId: "artist-1",
    workId: "work-1",
    periodStart: "2026-04-01",
    periodEnd: "2026-06-30",
    grossAmount: 6800.00,
    deductions: 680.00,
    netAmount: 6120.00,
    status: "Pending",
  },
];

const DEFAULT_PAYMENTS: Payment[] = [
  {
    id: "pay-1",
    ownerUserId: "artist-1",
    paymentBatchId: "batch-1",
    amount: 4050.00,
    paymentMethod: "Mobile Money (Airtel)",
    paymentReference: "TXN98240824",
    status: "Paid",
    paidAt: "2026-04-15T10:00:00Z",
  },
  {
    id: "pay-2",
    ownerUserId: "artist-1",
    paymentBatchId: "batch-1",
    amount: 2250.00,
    paymentMethod: "Mobile Money (Airtel)",
    paymentReference: "TXN98240825",
    status: "Paid",
    paidAt: "2026-04-15T10:05:00Z",
  },
];

const DEFAULT_PAYMENT_BATCHES: PaymentBatch[] = [
  {
    id: "batch-1",
    batchName: "Q1 2026 Distribution Batch",
    periodStart: "2026-01-01",
    periodEnd: "2026-03-31",
    totalAmount: 6300.00,
    status: "Paid",
    createdBy: "finance-1",
    createdAt: "2026-04-10T11:00:00Z",
  },
];

const DEFAULT_FINANCIAL_REPORTS: FinancialReport[] = [
  {
    id: "report-1",
    reportType: "Distribution Summary",
    periodStart: "2026-01-01",
    periodEnd: "2026-03-31",
    fileUrl: "#",
    generatedBy: "finance-1",
    generatedAt: "2026-04-12T16:00:00Z",
  },
];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: "audit-1",
    userId: "admin-1",
    userEmail: "admin@zamcops.org",
    action: "Approved Artist Membership",
    entityType: "ArtistProfile",
    entityId: "profile-1",
    previousValue: "membershipStatus: Pending",
    newValue: "membershipStatus: Approved; memberNumber: ZCP-2025-0045",
    ipAddress: "196.26.4.15",
    createdAt: "2025-01-15T12:00:00Z",
  },
  {
    id: "audit-2",
    userId: "admin-1",
    userEmail: "admin@zamcops.org",
    action: "Approved Musical Work",
    entityType: "Work",
    entityId: "work-1",
    previousValue: "status: Pending",
    newValue: "status: Approved; registrationNumber: WR-2025-1031",
    ipAddress: "196.26.4.15",
    createdAt: "2025-05-12T14:30:00Z",
  },
];

// -------------------------------------------------------------
// Reactive Storage Engine
// -------------------------------------------------------------

type DbSubscriber = () => void;
class ZAMCOPSDbEngine {
  private subscribers: Set<DbSubscriber> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      // Ensure initial load/seed
      this.init();
    }
  }

  private init() {
    if (!localStorage.getItem("zamcops_initialized")) {
      localStorage.setItem("zamcops_users", JSON.stringify(DEFAULT_USERS));
      localStorage.setItem("zamcops_artist_profiles", JSON.stringify(DEFAULT_ARTIST_PROFILES));
      localStorage.setItem("zamcops_label_profiles", JSON.stringify(DEFAULT_LABEL_PROFILES));
      localStorage.setItem("zamcops_publisher_profiles", JSON.stringify(DEFAULT_PUBLISHER_PROFILES));
      localStorage.setItem("zamcops_applications", JSON.stringify(DEFAULT_APPLICATIONS));
      localStorage.setItem("zamcops_documents", JSON.stringify(DEFAULT_DOCUMENTS));
      localStorage.setItem("zamcops_works", JSON.stringify(DEFAULT_WORKS));
      localStorage.setItem("zamcops_songs", JSON.stringify(DEFAULT_SONGS));
      localStorage.setItem("zamcops_albums", JSON.stringify(DEFAULT_ALBUMS));
      localStorage.setItem("zamcops_contributors", JSON.stringify(DEFAULT_CONTRIBUTORS));
      localStorage.setItem("zamcops_usage_logs", JSON.stringify(DEFAULT_USAGE_LOGS));
      localStorage.setItem("zamcops_royalty_earnings", JSON.stringify(DEFAULT_ROYALTY_EARNINGS));
      localStorage.setItem("zamcops_payments", JSON.stringify(DEFAULT_PAYMENTS));
      localStorage.setItem("zamcops_payment_batches", JSON.stringify(DEFAULT_PAYMENT_BATCHES));
      localStorage.setItem("zamcops_financial_reports", JSON.stringify(DEFAULT_FINANCIAL_REPORTS));
      localStorage.setItem("zamcops_audit_logs", JSON.stringify(DEFAULT_AUDIT_LOGS));
      localStorage.setItem("zamcops_initialized", "true");
    }
  }

  subscribe(sub: DbSubscriber) {
    this.subscribers.add(sub);
    return () => this.subscribers.delete(sub);
  }

  private notify() {
    this.subscribers.forEach((sub) => sub());
  }

  // Getters
  getCollection<T>(key: string): T[] {
    if (typeof window === "undefined") return [];
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : [];
  }

  // Setters
  setCollection<T>(key: string, data: T[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(data));
    this.notify();
  }

  // Utilities for operations
  getUsers(): User[] { return this.getCollection("zamcops_users"); }
  getArtistProfiles(): ArtistProfile[] { return this.getCollection("zamcops_artist_profiles"); }
  getLabelProfiles(): LabelProfile[] { return this.getCollection("zamcops_label_profiles"); }
  getPublisherProfiles(): PublisherProfile[] { return this.getCollection("zamcops_publisher_profiles"); }
  getApplications(): MembershipApplication[] { return this.getCollection("zamcops_applications"); }
  getDocuments(): Document[] { return this.getCollection("zamcops_documents"); }
  getWorks(): Work[] { return this.getCollection("zamcops_works"); }
  getSongs(): Song[] { return this.getCollection("zamcops_songs"); }
  getAlbums(): Album[] { return this.getCollection("zamcops_albums"); }
  getContributors(): Contributor[] { return this.getCollection("zamcops_contributors"); }
  getUsageLogs(): RoyaltyUsageLog[] { return this.getCollection("zamcops_usage_logs"); }
  getRoyaltyEarnings(): RoyaltyEarning[] { return this.getCollection("zamcops_royalty_earnings"); }
  getPayments(): Payment[] { return this.getCollection("zamcops_payments"); }
  getPaymentBatches(): PaymentBatch[] { return this.getCollection("zamcops_payment_batches"); }
  getFinancialReports(): FinancialReport[] { return this.getCollection("zamcops_financial_reports"); }
  getAuditLogs(): AuditLog[] { return this.getCollection("zamcops_audit_logs"); }

  // Mutation functions with audit logs automatically recorded
  logAudit(userId: string, email: string, action: string, entityType: string, entityId: string, prev?: string, nextValue?: string) {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: "audit-" + Date.now(),
      userId,
      userEmail: email,
      action,
      entityType,
      entityId,
      previousValue: prev,
      newValue: nextValue,
      ipAddress: "196.26.4.15", // simulated
      createdAt: new Date().toISOString()
    };
    this.setCollection("zamcops_audit_logs", [newLog, ...logs]);
  }

  // Register user
  registerUser(email: string, phone: string, passwordHash: string, role: "Artist" | "Label" | "Publisher"): User {
    const users = this.getUsers();
    // check duplicate
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) throw new Error("Email already registered");

    const userId = "usr-" + Date.now();
    const newUser: User = {
      id: userId,
      email,
      phone,
      passwordHash,
      role,
      status: role === "Artist" ? "Pending" : "Active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.setCollection("zamcops_users", [...users, newUser]);

    // Create a base empty profile
    if (role === "Artist") {
      const profiles = this.getArtistProfiles();
      const newProfile: ArtistProfile = {
        id: "profile-" + Date.now(),
        userId,
        fullName: "",
        stageName: "",
        dateOfBirth: "",
        nationality: "Zambian",
        nrcOrPassportNumber: "",
        phone,
        email,
        province: "",
        town: "",
        address: "",
        artistRoles: [],
        genres: [],
        membershipStatus: "Draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.setCollection("zamcops_artist_profiles", [...profiles, newProfile]);
    } else if (role === "Label") {
      const profiles = this.getLabelProfiles();
      const newProfile: LabelProfile = {
        id: "lprof-" + Date.now(),
        userId,
        labelName: "",
        registrationNumber: "",
        contactPerson: "",
        phone,
        email,
        address: "",
        status: "Pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.setCollection("zamcops_label_profiles", [...profiles, newProfile]);
    } else if (role === "Publisher") {
      const profiles = this.getPublisherProfiles();
      const newProfile: PublisherProfile = {
        id: "pubprof-" + Date.now(),
        userId,
        publisherName: "",
        registrationNumber: "",
        contactPerson: "",
        phone,
        email,
        address: "",
        status: "Pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.setCollection("zamcops_publisher_profiles", [...profiles, newProfile]);
    }

    this.logAudit(userId, email, `Created Account as ${role}`, "User", userId, undefined, JSON.stringify(newUser));
    return newUser;
  }

  updateArtistProfile(id: string, profile: Partial<ArtistProfile>, actorId: string, actorEmail: string) {
    const profiles = this.getArtistProfiles();
    const updated = profiles.map(p => {
      if (p.id === id) {
        const next = { ...p, ...profile, updatedAt: new Date().toISOString() };
        this.logAudit(actorId, actorEmail, "Updated Artist Profile", "ArtistProfile", id, JSON.stringify(p), JSON.stringify(next));
        return next;
      }
      return p;
    });
    this.setCollection("zamcops_artist_profiles", updated);
  }

  updateLabelProfile(id: string, profile: Partial<LabelProfile>, actorId: string, actorEmail: string) {
    const profiles = this.getLabelProfiles();
    const updated = profiles.map(p => {
      if (p.id === id) {
        const next = { ...p, ...profile, updatedAt: new Date().toISOString() };
        this.logAudit(actorId, actorEmail, "Updated Label Profile", "LabelProfile", id, JSON.stringify(p), JSON.stringify(next));
        return next;
      }
      return p;
    });
    this.setCollection("zamcops_label_profiles", updated);
  }

  updatePublisherProfile(id: string, profile: Partial<PublisherProfile>, actorId: string, actorEmail: string) {
    const profiles = this.getPublisherProfiles();
    const updated = profiles.map(p => {
      if (p.id === id) {
        const next = { ...p, ...profile, updatedAt: new Date().toISOString() };
        this.logAudit(actorId, actorEmail, "Updated Publisher Profile", "PublisherProfile", id, JSON.stringify(p), JSON.stringify(next));
        return next;
      }
      return p;
    });
    this.setCollection("zamcops_publisher_profiles", updated);
  }

  submitApplication(userId: string, applicantType: "Artist" | "Label" | "Publisher", actorEmail: string) {
    const apps = this.getApplications();
    const appId = "app-" + Date.now();
    const appNum = "APP-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
    const newApp: MembershipApplication = {
      id: appId,
      applicantUserId: userId,
      applicantType,
      status: "Pending",
      submittedAt: new Date().toISOString(),
      applicationNumber: appNum
    };
    this.setCollection("zamcops_applications", [...apps, newApp]);

    // Set membership status of artist profile to pending
    if (applicantType === "Artist") {
      const profiles = this.getArtistProfiles();
      const updated = profiles.map(p => p.userId === userId ? { ...p, membershipStatus: "Pending" as const } : p);
      this.setCollection("zamcops_artist_profiles", updated);
    }

    this.logAudit(userId, actorEmail, "Submitted Membership Application", "MembershipApplication", appId, undefined, JSON.stringify(newApp));
    return newApp;
  }

  // Upload Document
  uploadDocument(ownerUserId: string, docType: Document["documentType"], fileName: string, fileUrl: string): Document {
    const docs = this.getDocuments();
    const apps = this.getApplications();
    const userApp = apps.find(a => a.applicantUserId === ownerUserId);
    
    const newDoc: Document = {
      id: "doc-" + Date.now(),
      ownerUserId,
      applicationId: userApp?.id,
      documentType: docType,
      fileUrl: fileUrl || "https://picsum.photos/seed/" + Math.random().toString() + "/800/500",
      fileName,
      mimeType: "image/jpeg",
      status: "Pending",
      uploadedAt: new Date().toISOString()
    };
    this.setCollection("zamcops_documents", [...docs, newDoc]);
    return newDoc;
  }

  // Approve / Reject Application
  reviewApplication(applicationId: string, status: "Approved" | "Rejected" | "InformationRequested", reason: string, missingNote: string, adminId: string, adminEmail: string) {
    const apps = this.getApplications();
    const updatedApps = apps.map(app => {
      if (app.id === applicationId) {
        const next = {
          ...app,
          status,
          reviewedAt: new Date().toISOString(),
          reviewedBy: adminId,
          rejectionReason: reason || undefined,
          missingDocumentsNote: missingNote || undefined
        };
        this.logAudit(adminId, adminEmail, `Reviewed Application to ${status}`, "MembershipApplication", applicationId, JSON.stringify(app), JSON.stringify(next));
        
        // Update the actual profile status and generate member number if approved
        if (app.applicantType === "Artist") {
          const profiles = this.getArtistProfiles();
          const pUpdated = profiles.map(p => {
            if (p.userId === app.applicantUserId) {
              const memNum = status === "Approved" ? "ZCP-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000).toString().padStart(4, "0") : undefined;
              return { 
                ...p, 
                membershipStatus: status === "Approved" ? "Approved" as const : (status === "Rejected" ? "Rejected" as const : "Pending" as const),
                memberNumber: memNum || p.memberNumber,
                updatedAt: new Date().toISOString()
              };
            }
            return p;
          });
          this.setCollection("zamcops_artist_profiles", pUpdated);
        }
        
        return next;
      }
      return app;
    });
    this.setCollection("zamcops_applications", updatedApps);
  }

  submitWork(
    ownerUserId: string,
    workType: "Single" | "Album" | "EP" | "Instrumental" | "Composition",
    title: string,
    alternativeTitle: string,
    genre: string,
    language: string,
    durationString: string, // "MM:SS"
    isrc: string,
    iswc: string,
    contributors: Array<Omit<Contributor, "id" | "workId">>,
    audioFileUrl?: string,
    artworkUrl?: string
  ) {
    const works = this.getWorks();
    const workId = "work-" + Date.now();

    // calculate seconds
    let durSec = 180;
    if (durationString && durationString.includes(":")) {
      const [m, s] = durationString.split(":").map(Number);
      if (!isNaN(m) && !isNaN(s)) {
        durSec = (m * 60) + s;
      }
    } else if (!isNaN(Number(durationString))) {
      durSec = Number(durationString);
    }

    const newWork: Work = {
      id: workId,
      ownerUserId,
      workType,
      title,
      alternativeTitle: alternativeTitle || undefined,
      genre,
      language,
      duration: durSec,
      isrc: isrc || undefined,
      iswc: iswc || undefined,
      status: "Pending",
      submittedAt: new Date().toISOString()
    };

    // Save song record for singles or the main track
    const songs = this.getSongs();
    const newSong: Song = {
      id: "song-" + Date.now(),
      workId,
      title,
      trackNumber: 1,
      duration: durSec,
      audioFileUrl: audioFileUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
      artworkUrl: artworkUrl || "https://picsum.photos/seed/" + title + "/400/400",
      status: "Pending"
    };

    // Save contributors with ownership split
    const currentContributors = this.getContributors();
    const updatedContributors = [
      ...currentContributors,
      ...contributors.map((c, idx) => ({
        ...c,
        id: `cn-${Date.now()}-${idx}`,
        workId
      }))
    ];

    this.setCollection("zamcops_works", [...works, newWork]);
    this.setCollection("zamcops_songs", [...songs, newSong]);
    this.setCollection("zamcops_contributors", updatedContributors);

    this.logAudit(ownerUserId, "artist@zamcops.org", `Submitted Work: ${title}`, "Work", workId, undefined, JSON.stringify(newWork));
    return newWork;
  }

  // Approve / Reject Musical Work
  reviewWork(workId: string, status: "Approved" | "Rejected", reason: string, adminId: string, adminEmail: string) {
    const works = this.getWorks();
    const updatedWorks = works.map(w => {
      if (w.id === workId) {
        const regNum = status === "Approved" ? "WR-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000) : undefined;
        const next = {
          ...w,
          status,
          approvedAt: status === "Approved" ? new Date().toISOString() : undefined,
          rejectedReason: status === "Rejected" ? reason : undefined,
          registrationNumber: regNum || w.registrationNumber
        };
        this.logAudit(adminId, adminEmail, `Reviewed Work to ${status}`, "Work", workId, JSON.stringify(w), JSON.stringify(next));

        // Update connected song status
        const songs = this.getSongs();
        const updatedSongs = songs.map(s => s.workId === workId ? { ...s, status } : s);
        this.setCollection("zamcops_songs", updatedSongs);

        return next;
      }
      return w;
    });
    this.setCollection("zamcops_works", updatedWorks);
  }

  // Create payment batch & distribute earnings
  createPaymentBatch(batchName: string, periodStart: string, periodEnd: string, financeId: string, financeEmail: string) {
    const earnings = this.getRoyaltyEarnings();
    const pendingEarnings = earnings.filter(e => e.status === "Pending");

    if (pendingEarnings.length === 0) {
      throw new Error("No pending royalties search returned to distribute.");
    }

    const totalBatchAmount = pendingEarnings.reduce((acc, curr) => acc + curr.netAmount, 0);

    const batchId = "batch-" + Date.now();
    const newBatch: PaymentBatch = {
      id: batchId,
      batchName,
      periodStart,
      periodEnd,
      totalAmount: totalBatchAmount,
      status: "Processing",
      createdBy: financeId,
      createdAt: new Date().toISOString()
    };

    // Update earnings to Processing
    const updatedEarnings = earnings.map(e => {
      if (e.status === "Pending") {
        return { ...e, status: "Processing" as const };
      }
      return e;
    });

    // Generate Payment records for each user
    const userTotals: { [key: string]: number } = {};
    pendingEarnings.forEach(e => {
      userTotals[e.ownerUserId] = (userTotals[e.ownerUserId] || 0) + e.netAmount;
    });

    const payments = this.getPayments();
    const newPayments: Payment[] = Object.keys(userTotals).map((userId, idx) => {
      return {
        id: `pay-${Date.now()}-${idx}`,
        ownerUserId: userId,
        paymentBatchId: batchId,
        amount: userTotals[userId],
        paymentMethod: "Mobile Money (Airtel)", // Default for demo
        paymentReference: "TXN" + Math.floor(10000000 + Math.random() * 90000000),
        status: "Paid", // Automatically succeeds for prototype
        paidAt: new Date().toISOString()
      };
    });

    // Mark as paid immediately in our reactive database prototype
    newBatch.status = "Paid";
    const finalEarnings = updatedEarnings.map(e => e.status === "Processing" ? { ...e, status: "Paid" as const } : e);

    // Save all
    const batches = this.getPaymentBatches();
    this.setCollection("zamcops_payment_batches", [...batches, newBatch]);
    this.setCollection("zamcops_royalty_earnings", finalEarnings);
    this.setCollection("zamcops_payments", [...payments, ...newPayments]);

    this.logAudit(financeId, financeEmail, `Created & Processed Payment Batch: ${batchName}`, "PaymentBatch", batchId, undefined, JSON.stringify(newBatch));
    return newBatch;
  }

  // Trigger Mock Usage Stream / royalty growth (simulate playbacks)
  triggerUsagePlayback(workId: string, songId: string, sourceType: RoyaltyUsageLog["sourceType"], stationOrUser: string, grossAmountGenerated: number) {
    const logs = this.getUsageLogs();
    const newLog: RoyaltyUsageLog = {
      id: "log-" + Date.now(),
      workId,
      songId,
      sourceType,
      stationOrUser,
      usageDate: new Date().toISOString().split("T")[0],
      duration: 215,
      amountGenerated: grossAmountGenerated,
      createdAt: new Date().toISOString()
    };
    this.setCollection("zamcops_usage_logs", [...logs, newLog]);

    // Update or generate royalty earnings for the owner
    const work = this.getWorks().find(w => w.id === workId);
    if (!work) return;

    // Calculate splits for the earnings. To make it simple, we attribute it to the owner.
    // In a full implementation, splits are split, but for our prototype we accumulate it on the owner or the registered contributor.
    const earnings = this.getRoyaltyEarnings();
    // Check if there is already a Pending earning for this work and period
    const startOfQuarter = "2026-04-01";
    const endOfQuarter = "2026-06-30";
    const existingEarningIdx = earnings.findIndex(e => e.workId === workId && e.status === "Pending" && e.periodStart === startOfQuarter);

    const deduction = grossAmountGenerated * 0.10; // 10% ZAMCOPS fee
    const net = grossAmountGenerated - deduction;

    if (existingEarningIdx > -1) {
      const updatedEarnings = [...earnings];
      const existing = updatedEarnings[existingEarningIdx];
      updatedEarnings[existingEarningIdx] = {
        ...existing,
        grossAmount: existing.grossAmount + grossAmountGenerated,
        deductions: existing.deductions + deduction,
        netAmount: existing.netAmount + net
      };
      this.setCollection("zamcops_royalty_earnings", updatedEarnings);
    } else {
      const newEarning: RoyaltyEarning = {
        id: "earning-" + Date.now(),
        ownerUserId: work.ownerUserId,
        workId,
        periodStart: startOfQuarter,
        periodEnd: endOfQuarter,
        grossAmount: grossAmountGenerated,
        deductions: deduction,
        netAmount: net,
        status: "Pending"
      };
      this.setCollection("zamcops_royalty_earnings", [...earnings, newEarning]);
    }
  }
}

export const dbEngine = new ZAMCOPSDbEngine();

// Hook for components
export function useZAMCOPSDb() {
  const [stamp, setStamp] = useState(0);

  useEffect(() => {
    const unsub = dbEngine.subscribe(() => {
      setStamp(prev => prev + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  return {
    getUsers: () => dbEngine.getUsers(),
    getArtistProfiles: () => dbEngine.getArtistProfiles(),
    getLabelProfiles: () => dbEngine.getLabelProfiles(),
    getPublisherProfiles: () => dbEngine.getPublisherProfiles(),
    getApplications: () => dbEngine.getApplications(),
    getDocuments: () => dbEngine.getDocuments(),
    getWorks: () => dbEngine.getWorks(),
    getSongs: () => dbEngine.getSongs(),
    getAlbums: () => dbEngine.getAlbums(),
    getContributors: () => dbEngine.getContributors(),
    getUsageLogs: () => dbEngine.getUsageLogs(),
    getRoyaltyEarnings: () => dbEngine.getRoyaltyEarnings(),
    getPayments: () => dbEngine.getPayments(),
    getPaymentBatches: () => dbEngine.getPaymentBatches(),
    getFinancialReports: () => dbEngine.getFinancialReports(),
    getAuditLogs: () => dbEngine.getAuditLogs(),

    // Ops
    registerUser: (email: string, phone: string, passwordHash: string, role: "Artist" | "Label" | "Publisher") => 
      dbEngine.registerUser(email, phone, passwordHash, role),
    updateArtistProfile: (id: string, profile: Partial<ArtistProfile>, actorId: string, actorEmail: string) => 
      dbEngine.updateArtistProfile(id, profile, actorId, actorEmail),
    updateLabelProfile: (id: string, profile: Partial<LabelProfile>, actorId: string, actorEmail: string) => 
      dbEngine.updateLabelProfile(id, profile, actorId, actorEmail),
    updatePublisherProfile: (id: string, profile: Partial<PublisherProfile>, actorId: string, actorEmail: string) => 
      dbEngine.updatePublisherProfile(id, profile, actorId, actorEmail),
    submitApplication: (userId: string, applicantType: "Artist" | "Label" | "Publisher", actorEmail: string) => 
      dbEngine.submitApplication(userId, applicantType, actorEmail),
    uploadDocument: (ownerUserId: string, docType: Document["documentType"], fileName: string, fileUrl: string) =>
      dbEngine.uploadDocument(ownerUserId, docType, fileName, fileUrl),
    reviewApplication: (applicationId: string, status: "Approved" | "Rejected" | "InformationRequested", reason: string, missingNote: string, adminId: string, adminEmail: string) =>
      dbEngine.reviewApplication(applicationId, status, reason, missingNote, adminId, adminEmail),
    submitWork: (
      ownerUserId: string,
      workType: "Single" | "Album" | "EP" | "Instrumental" | "Composition",
      title: string,
      alternativeTitle: string,
      genre: string,
      language: string,
      durationString: string,
      isrc: string,
      iswc: string,
      contributors: Array<Omit<Contributor, "id" | "workId">>,
      audioFileUrl?: string,
      artworkUrl?: string
    ) => dbEngine.submitWork(ownerUserId, workType, title, alternativeTitle, genre, language, durationString, isrc, iswc, contributors, audioFileUrl, artworkUrl),
    reviewWork: (workId: string, status: "Approved" | "Rejected", reason: string, adminId: string, adminEmail: string) =>
      dbEngine.reviewWork(workId, status, reason, adminId, adminEmail),
    createPaymentBatch: (batchName: string, periodStart: string, periodEnd: string, financeId: string, financeEmail: string) =>
      dbEngine.createPaymentBatch(batchName, periodStart, periodEnd, financeId, financeEmail),
    triggerUsagePlayback: (workId: string, songId: string, sourceType: RoyaltyUsageLog["sourceType"], stationOrUser: string, grossAmountGenerated: number) =>
      dbEngine.triggerUsagePlayback(workId, songId, sourceType, stationOrUser, grossAmountGenerated),
    version: stamp
  };
}
