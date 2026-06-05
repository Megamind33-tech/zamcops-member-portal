import { MembershipApplication, TrackWork, RoyaltyEarning, AuditLog, ArtistProfile, LabelProfile } from "./types";

export interface AppState {
  applications: MembershipApplication[];
  works: TrackWork[];
  royalties: RoyaltyEarning[];
  artistProfiles: Record<string, ArtistProfile>;
  labelProfiles: Record<string, LabelProfile>;
  auditLogs: AuditLog[];
}

// Memory-only fallback state if localStorage is blocked or throws error in security-sandboxed preview iframe
let memoryState: AppState | null = null;

const INITIAL_STATE: AppState = {
  applications: [
    {
      id: "app-101",
      name: "Brian Chanda",
      stageOrRegName: "Brian Pompi",
      type: "artist",
      identifier: "312543/11/1",
      phone: "+260 977 452312",
      email: "pompi@zam-music.com",
      status: "Pending",
      submittedAt: "2026-06-01T10:30:00Z",
      nrcFrontFileName: "brian_chanda_nrc_front.jpg",
      nrcBackFileName: "brian_chanda_nrc_back.jpg",
      passportPhotoFileName: "brian_chanda_passport.jpg",
      contractFileName: "brian_chanda_membership_contract.pdf",
      idVerified: false,
      contractSigned: false,
      bylawsCompliant: false,
      credentialsValid: false,
      nrcFrontVerified: false,
      nrcBackVerified: false,
      passportPhotoVerified: false,
      contractVerified: false,
      annotations: [],
      auditNotes: ""
    },
    {
      id: "app-102",
      name: "Mwila Mulenga",
      stageOrRegName: "Mulenga Music Group",
      type: "label",
      identifier: "PACRA-2024-88432",
      phone: "+260 966 123456",
      email: "mwila@mulengamusic.com",
      status: "Information Requested",
      submittedAt: "2026-05-28T14:15:00Z",
      infoRequestNote: "Please re-upload front NRC asset. The original was too blurry to read.",
      nrcFrontFileName: "mwila_nrc_front_blurry.jpg",
      nrcBackFileName: "mwila_nrc_back.jpg",
      passportPhotoFileName: "mwila_passport_photo.png",
      contractFileName: "mulenga_records_deed.pdf",
      idVerified: false,
      contractSigned: true,
      bylawsCompliant: false,
      credentialsValid: false,
      nrcFrontVerified: false,
      nrcBackVerified: true,
      passportPhotoVerified: true,
      contractVerified: true,
      annotations: [
        {
          id: "ann-1",
          x: 45,
          y: 60,
          tool: "pin",
          text: "This front image is heavily blurred. We need a high-resolution flat scan.",
          drawPoints: null
        }
      ],
      auditNotes: "NRC Front fails resolution check. Other documents are valid. Sent supplement request."
    },
    {
      id: "app-103",
      name: "Roberto Banda",
      stageOrRegName: "Roberto",
      type: "artist",
      identifier: "223412/44/1",
      phone: "+260 955 778899",
      email: "roberto@brathahood.com",
      status: "Approved",
      submittedAt: "2026-05-15T09:00:00Z",
      nrcFrontFileName: "roberto_nrc_front.jpg",
      nrcBackFileName: "roberto_nrc_back.jpg",
      passportPhotoFileName: "roberto_portrait.png",
      contractFileName: "roberto_zamcops_agreement_signed.pdf",
      idVerified: true,
      contractSigned: true,
      bylawsCompliant: true,
      credentialsValid: true,
      nrcFrontVerified: true,
      nrcBackVerified: true,
      passportPhotoVerified: true,
      contractVerified: true,
      annotations: [],
      auditNotes: "All documents present, clean, and cross-referenced with national ID registry. Approved without comments."
    }
  ],
  works: [
    {
      id: "work-201",
      title: "Ama-Rulah",
      artistName: "Roberto",
      sharePercentage: 100,
      isrc: "ZM-A12-15-00101",
      genre: "Afropop",
      releaseYear: 2015,
      submittedBy: "roberto@brathahood.com",
      status: "Approved"
    },
    {
      id: "work-202",
      title: "Keep On Believing",
      artistName: "Brian Pompi",
      sharePercentage: 80,
      isrc: "ZM-A13-22-00512",
      genre: "Gospel Soul",
      releaseYear: 2022,
      submittedBy: "pompi@zam-music.com",
      status: "Pending"
    }
  ],
  royalties: [
    {
      id: "roy-301",
      trackId: "work-201",
      trackTitle: "Ama-Rulah",
      artistName: "Roberto",
      source: "Broadcasting (Radio/TV)",
      grossAmount: 15400,
      netAmount: 13090, // 15% society fee
      period: "Q1 2026 Distribution",
      status: "Disbursed",
      recipientEmail: "roberto@brathahood.com"
    }
  ],
  artistProfiles: {
    "roberto@brathahood.com": {
      fullName: "Roberto Banda",
      stageName: "Roberto",
      memberNumber: "ZAM-2526-809",
      membershipStatus: "Approved",
      nrcNumber: "223412/44/1",
      phone: "+260 955 778899",
      bankName: "ZANACO",
      bankBranch: "Main Civic Center",
      bankAccount: "0103445588320",
      mobileMoneyNumber: "+260 955 778899",
      createdAt: "2026-05-15T09:30:00Z"
    }
  },
  labelProfiles: {},
  auditLogs: [
    {
      id: "log-1",
      timestamp: "2026-05-15T09:30:00Z",
      actor: "admin@zamcops.org.zm",
      action: "MEMBER_APPLICATION_APPROVED",
      details: "Approved artist membership application for Roberto"
    },
    {
      id: "log-2",
      timestamp: "2026-05-28T14:26:00Z",
      actor: "admin@zamcops.org.zm",
      action: "INFO_REQUESTED",
      details: "Requested supplemental info for Mulenga Music Group - Blurry front NRC copy"
    }
  ]
};

export function loadFullState(): AppState {
  if (memoryState) {
    return memoryState;
  }
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const data = window.localStorage.getItem("zamcops_state");
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && Array.isArray(parsed.applications)) {
          memoryState = parsed as AppState;
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn("Storage reading fallback triggered:", e);
  }
  memoryState = INITIAL_STATE;
  return INITIAL_STATE;
}

export function saveFullState(state: AppState): void {
  memoryState = state;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("zamcops_state", JSON.stringify(state));
    }
  } catch (e) {
    console.warn("Storage writing fallback triggered:", e);
  }
}
