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
    membershipStatus: m.membershipStatus,
    joinedAt: iso(m.joinedAt),
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
    ownershipSplits: parse<OwnershipSplit[]>(w.ownershipSplits, []),
    isrc: w.isrc,
    iswc: w.iswc,
    dateCreated: w.dateCreated,
    status: w.status,
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
    audioFile: s.audioFile,
    coverArt: s.coverArt,
    lyricsFile: s.lyricsFile,
    ownershipSplits: parse<OwnershipSplit[]>(s.ownershipSplits, []),
    status: s.status,
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
    tracks: parse<Track[]>(a.tracks, []),
    status: a.status,
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
