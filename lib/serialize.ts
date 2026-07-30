import type {
  Member,
  WorkDeclaration,
  SongSubmission,
  AlbumSubmission,
  UploadFile,
  AppNotification,
  Statement,
  RoyaltySummary,
  OwnershipSplit,
  Track,
  RoyaltyUsageLog,
  Distribution,
  DistributionEntry,
  MemberDistribution,
  LicensableWork,
  LicenseRequest,
  LicenseUsageType,
  SupportTicket,
  MembershipApplication,
} from "@/types";

const iso = (d: Date | string): string => (d instanceof Date ? d.toISOString() : d);
const parse = <T,>(s: string, fallback: T): T => {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
};

/* eslint-disable @typescript-eslint/no-explicit-any */

export function memberDTO(m: any): Member {
  return {
    id: m.id,
    memberNumber: m.memberNumber,
    fullName: m.fullName,
    stageName: m.stageName,
    nrcOrPassport: m.nrcOrPassport,
    dateOfBirth: m.dateOfBirth,
    gender: m.gender,
    phone: m.phone,
    email: m.email,
    role: m.role,
    province: m.province,
    district: m.district,
    address: m.address,
    bankName: m.bankName,
    bankAccount: m.bankAccount,
    mobileMoneyNumber: m.mobileMoneyNumber,
    nextOfKinName: m.nextOfKinName,
    nextOfKinPhone: m.nextOfKinPhone,
    nrcDocument: m.nrcDocument,
    profilePhoto: m.profilePhoto,
    notificationPrefs: m.notificationPrefs,
    membershipStatus: m.membershipStatus,
    joinedAt: iso(m.joinedAt),
    hasSignature: !!m.signature,
    emailVerified: !!m.emailVerifiedAt,
  };
}

export function applicationDTO(a: any): MembershipApplication {
  return {
    id: a.id,
    ownerId: a.ownerId,
    formType: a.formType,
    payload: parse<Record<string, unknown>>(a.payload, {}),
    adminFields: parse<Record<string, string>>(a.adminFields, {}),
    status: a.status,
    rejectionReason: a.rejectionReason || undefined,
    membershipClass: a.membershipClass || undefined,
    deedAgreedAt: a.deedAgreedAt ? iso(a.deedAgreedAt) : undefined,
    submittedAt: a.submittedAt ? iso(a.submittedAt) : undefined,
    decidedAt: a.decidedAt ? iso(a.decidedAt) : undefined,
    updatedAt: iso(a.updatedAt),
  };
}

export function workDTO(w: any): WorkDeclaration {
  return {
    id: w.id,
    ownerId: w.ownerId,
    title: w.title,
    alternativeTitle: w.alternativeTitle,
    workType: w.workType,
    language: w.language,
    genre: w.genre,
    duration: w.duration,
    composers: parse<string[]>(w.composers, []),
    authors: parse<string[]>(w.authors, []),
    producers: parse<string[]>(w.producers, []),
    publisher: w.publisher,
    publisherIpi: w.publisherIpi,
    ownershipSplits: parse<OwnershipSplit[]>(w.ownershipSplits, []),
    isrc: w.isrc,
    iswc: w.iswc,
    audioFile: w.audioFile,
    dateCreated: w.dateCreated,
    status: w.status,
    rejectionReason: w.rejectionReason || undefined,
    submittedAt: iso(w.submittedAt),
  };
}

export function singleDTO(s: any): SongSubmission {
  return {
    id: s.id,
    ownerId: s.ownerId,
    title: s.title,
    artistName: s.artistName,
    featuredArtists: s.featuredArtists,
    producer: s.producer,
    genre: s.genre,
    releaseDate: s.releaseDate,
    isrc: s.isrc,
    audioFile: s.audioFile,
    coverArt: s.coverArt,
    lyricsFile: s.lyricsFile,
    ownershipSplits: parse<OwnershipSplit[]>(s.ownershipSplits, []),
    status: s.status,
    rejectionReason: s.rejectionReason || undefined,
    submittedAt: iso(s.submittedAt),
  };
}

export function albumDTO(a: any): AlbumSubmission {
  return {
    id: a.id,
    ownerId: a.ownerId,
    title: a.title,
    artistName: a.artistName,
    releaseDate: a.releaseDate,
    coverArt: a.coverArt,
    backCover: a.backCover,
    tracks: parse<Track[]>(a.tracks, []),
    status: a.status,
    rejectionReason: a.rejectionReason || undefined,
    submittedAt: iso(a.submittedAt),
  };
}

export function uploadDTO(u: any): UploadFile {
  return {
    id: u.id,
    ownerId: u.ownerId,
    fileName: u.fileName,
    fileType: u.fileType,
    linkedTo: u.linkedTo || undefined,
    uploadedAt: iso(u.uploadedAt),
    status: u.status,
    rejectionReason: u.rejectionReason || undefined,
    // List queries omit `data` (payload size) and pass `hasData` instead —
    // computed server-side so inline-stored files still report a file.
    hasFile: !!(u.data || u.url || u.hasData),
    fileSize: u.fileSize ?? 0,
    mimeType: u.mimeType || undefined,
  };
}

export function notificationDTO(n: any): AppNotification {
  return {
    id: n.id,
    ownerId: n.ownerId,
    title: n.title,
    body: n.body,
    type: n.type,
    createdAt: iso(n.createdAt),
    read: n.read,
  };
}

export function statementDTO(s: any): Statement {
  return {
    id: s.id,
    ownerId: s.ownerId,
    type: s.type,
    title: s.title,
    reference: s.reference,
    amount: s.amount ?? undefined,
    issuedAt: iso(s.issuedAt),
  };
}

export function royaltyDTO(r: any | null, ownerId: string): RoyaltySummary {
  if (!r) {
    return {
      ownerId,
      currency: "ZMW",
      totalEstimated: 0,
      pending: 0,
      paid: 0,
      usageLogs: [],
      topSongs: [],
    };
  }
  return {
    ownerId: r.ownerId,
    currency: r.currency,
    totalEstimated: r.totalEstimated,
    pending: r.pending,
    paid: r.paid,
    usageLogs: parse<RoyaltyUsageLog[]>(r.usageLogs, []),
    topSongs: parse<RoyaltySummary["topSongs"]>(r.topSongs, []),
  };
}

export function distributionDTO(d: any): Distribution {
  return {
    id: d.id,
    periodLabel: d.periodLabel,
    status: d.status,
    notes: d.notes,
    publishedAt: d.publishedAt ? iso(d.publishedAt) : undefined,
    createdAt: iso(d.createdAt),
  };
}

// A published distribution joined with one member's entry — what that member sees.
export function memberDistributionDTO(d: any, entry: any): MemberDistribution {
  return {
    ...distributionDTO(d),
    amount: entry.amount,
    currency: entry.currency,
    topSongs: parse<MemberDistribution["topSongs"]>(entry.topSongs, []),
  };
}

export function distributionEntryDTO(e: any): DistributionEntry {
  return {
    id: e.id,
    distributionId: e.distributionId,
    ownerId: e.ownerId,
    amount: e.amount,
    currency: e.currency,
    topSongs: parse<DistributionEntry["topSongs"]>(e.topSongs, []),
  };
}

export function licensableWorkDTO(w: any): LicensableWork {
  return {
    id: w.id,
    ownerId: w.ownerId,
    workTitle: w.workTitle,
    workRef: w.workRef || undefined,
    usageTypes: parse<LicenseUsageType[]>(w.usageTypes, []),
    minFee: w.minFee ?? undefined,
    notes: w.notes || undefined,
    status: w.status,
    createdAt: iso(w.createdAt),
  };
}

export function licenseRequestDTO(r: any): LicenseRequest {
  return {
    id: r.id,
    workId: r.workId,
    ownerId: r.ownerId,
    requesterName: r.requesterName,
    requesterCompany: r.requesterCompany || undefined,
    requesterEmail: r.requesterEmail,
    usageType: r.usageType,
    description: r.description || undefined,
    proposedFee: r.proposedFee ?? undefined,
    facilitationFee: r.facilitationFee ?? undefined,
    status: r.status,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

export function memberDocumentDTO(d: any) {
  return {
    id: d.id,
    ownerId: d.ownerId,
    docType: d.docType,
    fileName: d.fileName,
    reference: d.reference || undefined,
    note: d.note || undefined,
    uploadedAt: iso(d.uploadedAt),
    hasFile: !!(d.data || d.url || d.hasData),
    generated: !!d.generated,
  };
}

export function supportTicketDTO(t: any): SupportTicket {
  return {
    id: t.id,
    ownerId: t.ownerId || undefined,
    contact: t.contact || undefined,
    topic: t.topic,
    message: t.message,
    status: t.status,
    reply: t.reply || undefined,
    createdAt: iso(t.createdAt),
    resolvedAt: t.resolvedAt ? iso(t.resolvedAt) : undefined,
  };
}
