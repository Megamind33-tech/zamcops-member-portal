import type {
  Member,
  WorkDeclaration,
  SongSubmission,
  AlbumSubmission,
  UploadFile,
  RoyaltySummary,
  AppNotification,
  Statement,
} from "@/types";

// Default demo member used to seed the prototype so screens never look empty.
export const DEMO_MEMBER: Member = {
  id: "mem-001",
  memberNumber: "ZAM-2026-00417",
  fullName: "Chanda M. Mwale",
  stageName: "C-Note",
  nrcOrPassport: "327145/61/1",
  dateOfBirth: "1994-08-12",
  gender: "Male",
  phone: "+260 977 412 880",
  email: "demo@zamcops.org.zm",
  role: "Artist",
  province: "Lusaka",
  district: "Lusaka",
  address: "Plot 22, Kabulonga, Lusaka",
  bankName: "Zanaco",
  bankAccount: "00410029981",
  mobileMoneyNumber: "+260 977 412 880",
  nextOfKinName: "Grace Mwale",
  nextOfKinPhone: "+260 966 110 220",
  nrcDocument: "nrc_chanda_mwale.pdf",
  profilePhoto: "profile_cnote.jpg",
  membershipStatus: "Active",
  joinedAt: "2026-01-14T09:20:00.000Z",
  password: "demo1234",
};

export const seedWorks = (ownerId: string): WorkDeclaration[] => [
  {
    id: "wrk-1001",
    ownerId,
    title: "Zambezi Sunrise",
    alternativeTitle: "Sunrise (Acoustic)",
    workType: "Song",
    language: "Bemba",
    genre: "Afro-Pop",
    duration: "03:48",
    composers: ["Chanda M. Mwale"],
    authors: ["Chanda M. Mwale"],
    producers: ["Mizu Beats"],
    publisher: "Self-Published",
    ownershipSplits: [
      { id: "s1", party: "Chanda M. Mwale", role: "Composer", percentage: 60 },
      { id: "s2", party: "Mizu Beats", role: "Producer", percentage: 40 },
    ],
    isrc: "ZM-A01-26-00011",
    iswc: "T-000.111.222-3",
    dateCreated: "2025-11-02",
    status: "Approved",
    submittedAt: "2026-01-20T10:00:00.000Z",
  },
  {
    id: "wrk-1002",
    ownerId,
    title: "Copperbelt Dreams",
    workType: "Composition",
    language: "Nyanja",
    genre: "Hip-Hop",
    duration: "04:05",
    composers: ["Chanda M. Mwale", "T. Phiri"],
    authors: ["T. Phiri"],
    producers: ["DJ Kopala"],
    publisher: "Kalandanya Music",
    ownershipSplits: [
      { id: "s1", party: "Chanda M. Mwale", role: "Composer", percentage: 50 },
      { id: "s2", party: "T. Phiri", role: "Author/Lyricist", percentage: 30 },
      { id: "s3", party: "DJ Kopala", role: "Producer", percentage: 20 },
    ],
    dateCreated: "2026-02-10",
    status: "Pending",
    submittedAt: "2026-03-01T08:30:00.000Z",
  },
];

export const seedSingles = (ownerId: string): SongSubmission[] => [
  {
    id: "sng-2001",
    ownerId,
    title: "Zambezi Sunrise",
    artistName: "C-Note",
    featuredArtists: "Wezi",
    producer: "Mizu Beats",
    genre: "Afro-Pop",
    releaseDate: "2026-01-15",
    audioFile: "zambezi_sunrise_master.wav",
    coverArt: "zambezi_cover.jpg",
    lyricsFile: "zambezi_lyrics.pdf",
    ownershipSplits: [
      { id: "s1", party: "C-Note", role: "Performer", percentage: 70 },
      { id: "s2", party: "Wezi", role: "Performer", percentage: 30 },
    ],
    status: "Approved",
    submittedAt: "2026-01-16T11:00:00.000Z",
  },
  {
    id: "sng-2002",
    ownerId,
    title: "Night Drive",
    artistName: "C-Note",
    producer: "DJ Kopala",
    genre: "R&B",
    releaseDate: "2026-04-02",
    audioFile: "night_drive_v3.wav",
    coverArt: "night_drive_cover.jpg",
    ownershipSplits: [
      { id: "s1", party: "C-Note", role: "Performer", percentage: 100 },
    ],
    status: "Under Review",
    submittedAt: "2026-04-03T09:15:00.000Z",
  },
];

export const seedAlbums = (ownerId: string): AlbumSubmission[] => [
  {
    id: "alb-3001",
    ownerId,
    title: "Kalulu Tales",
    artistName: "C-Note",
    releaseDate: "2025-12-01",
    coverArt: "kalulu_tales_cover.jpg",
    status: "Approved",
    submittedAt: "2025-12-02T14:00:00.000Z",
    tracks: [
      {
        id: "trk-1",
        title: "Intro: The Hare",
        duration: "01:20",
        genre: "Spoken Word",
        contributors: [
          { id: "c1", name: "C-Note", role: "Performer" },
        ],
        ownershipSplits: [
          { id: "s1", party: "C-Note", role: "Performer", percentage: 100 },
        ],
        audioFile: "intro_hare.wav",
      },
      {
        id: "trk-2",
        title: "Run Kalulu",
        duration: "03:30",
        genre: "Afro-Pop",
        contributors: [
          { id: "c1", name: "C-Note", role: "Performer" },
          { id: "c2", name: "Mizu Beats", role: "Producer" },
        ],
        ownershipSplits: [
          { id: "s1", party: "C-Note", role: "Performer", percentage: 60 },
          { id: "s2", party: "Mizu Beats", role: "Producer", percentage: 40 },
        ],
        audioFile: "run_kalulu.wav",
      },
    ],
  },
];

export const seedUploads = (ownerId: string): UploadFile[] => [
  {
    id: "upl-4001",
    ownerId,
    fileName: "zambezi_sunrise_master.wav",
    fileType: "Audio",
    linkedTo: "Zambezi Sunrise",
    uploadedAt: "2026-01-16T11:00:00.000Z",
    status: "Approved",
  },
  {
    id: "upl-4002",
    ownerId,
    fileName: "night_drive_v3.wav",
    fileType: "Audio",
    linkedTo: "Night Drive",
    uploadedAt: "2026-04-03T09:15:00.000Z",
    status: "Processing",
  },
  {
    id: "upl-4003",
    ownerId,
    fileName: "lowres_cover.png",
    fileType: "Cover Art",
    linkedTo: "Night Drive",
    uploadedAt: "2026-04-03T09:16:00.000Z",
    status: "Rejected",
    rejectionReason: "Cover art below 1400x1400px minimum resolution.",
  },
];

export const seedRoyalty = (ownerId: string): RoyaltySummary => ({
  ownerId,
  currency: "ZMW",
  totalEstimated: 18450.75,
  pending: 6230.5,
  paid: 12220.25,
  usageLogs: [
    { id: "log-1", songTitle: "Zambezi Sunrise", source: "ZNBC Radio 2", plays: 412, period: "Q1 2026", estimatedAmount: 4120.0 },
    { id: "log-2", songTitle: "Zambezi Sunrise", source: "Hot FM", plays: 286, period: "Q1 2026", estimatedAmount: 2860.0 },
    { id: "log-3", songTitle: "Run Kalulu", source: "Diamond TV", plays: 134, period: "Q1 2026", estimatedAmount: 2010.0 },
    { id: "log-4", songTitle: "Copperbelt Dreams", source: "Flava FM", plays: 98, period: "Q1 2026", estimatedAmount: 980.0 },
  ],
  topSongs: [
    { title: "Zambezi Sunrise", plays: 698, amount: 6980.0 },
    { title: "Run Kalulu", plays: 134, amount: 2010.0 },
    { title: "Copperbelt Dreams", plays: 98, amount: 980.0 },
  ],
});

export const seedNotifications = (ownerId: string): AppNotification[] => [
  {
    id: "ntf-1",
    ownerId,
    title: "Work declaration pending review",
    body: "Your declaration for “Copperbelt Dreams” has been received and is queued for review.",
    type: "info",
    createdAt: "2026-03-01T08:31:00.000Z",
    read: false,
  },
  {
    id: "ntf-2",
    ownerId,
    title: "Song submission approved",
    body: "“Zambezi Sunrise” has been approved and registered in the ZAMCOPS repertoire.",
    type: "success",
    createdAt: "2026-01-18T10:05:00.000Z",
    read: false,
  },
  {
    id: "ntf-3",
    ownerId,
    title: "Royalty statement available",
    body: "Your Q1 2026 royalty statement is ready to download.",
    type: "info",
    createdAt: "2026-04-05T07:00:00.000Z",
    read: true,
  },
  {
    id: "ntf-4",
    ownerId,
    title: "Profile requires NRC upload",
    body: "Please upload a clear copy of your NRC to complete KYC verification.",
    type: "warning",
    createdAt: "2026-04-06T07:00:00.000Z",
    read: false,
  },
];

export const seedStatements = (ownerId: string): Statement[] => [
  { id: "stm-1", ownerId, type: "Membership Receipt", title: "2026 Membership Subscription", reference: "MR-2026-00417", amount: 350, issuedAt: "2026-01-14T09:25:00.000Z" },
  { id: "stm-2", ownerId, type: "Submission Receipt", title: "Single — Zambezi Sunrise", reference: "SR-2026-2001", issuedAt: "2026-01-16T11:01:00.000Z" },
  { id: "stm-3", ownerId, type: "Royalty Statement", title: "Q1 2026 Royalty Statement", reference: "RS-2026-Q1-00417", amount: 12220.25, issuedAt: "2026-04-05T07:00:00.000Z" },
];

export const ZM_PROVINCES = [
  "Central", "Copperbelt", "Eastern", "Luapula", "Lusaka",
  "Muchinga", "Northern", "North-Western", "Southern", "Western",
];

export const GENRES = [
  "Afro-Pop", "Hip-Hop", "R&B", "Gospel", "Kalindula", "Zed-Beats",
  "Reggae/Dancehall", "Traditional", "Jazz", "Spoken Word", "Other",
];

export const LANGUAGES = [
  "Bemba", "Nyanja", "Tonga", "Lozi", "Kaonde", "Lunda", "Luvale", "English", "Other",
];
