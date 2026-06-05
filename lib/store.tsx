"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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
import {
  DEMO_MEMBER,
  seedWorks,
  seedSingles,
  seedAlbums,
  seedUploads,
  seedRoyalty,
  seedNotifications,
  seedStatements,
} from "@/data/mock";
import { uid } from "@/lib/format";

const STORAGE_KEY = "zamcops_portal_v1";

interface PersistShape {
  members: Member[];
  currentMemberId: string | null;
  works: WorkDeclaration[];
  singles: SongSubmission[];
  albums: AlbumSubmission[];
  uploads: UploadFile[];
  notifications: AppNotification[];
  statements: Statement[];
  royalty: Record<string, RoyaltySummary>;
}

function seedState(): PersistShape {
  const m = DEMO_MEMBER;
  return {
    members: [m],
    currentMemberId: null, // require explicit login even in demo
    works: seedWorks(m.id),
    singles: seedSingles(m.id),
    albums: seedAlbums(m.id),
    uploads: seedUploads(m.id),
    notifications: seedNotifications(m.id),
    statements: seedStatements(m.id),
    royalty: { [m.id]: seedRoyalty(m.id) },
  };
}

function load(): PersistShape {
  if (typeof window === "undefined") return seedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    return JSON.parse(raw) as PersistShape;
  } catch {
    return seedState();
  }
}

interface AppContextValue extends PersistShape {
  ready: boolean;
  currentMember: Member | null;
  // auth
  login: (identifier: string, password: string) => boolean;
  register: (data: Partial<Member> & { password: string }) => Member;
  logout: () => void;
  // profile
  updateProfile: (patch: Partial<Member>) => void;
  // submissions
  addWork: (w: Omit<WorkDeclaration, "id" | "ownerId" | "submittedAt" | "status">) => WorkDeclaration;
  addSingle: (s: Omit<SongSubmission, "id" | "ownerId" | "submittedAt" | "status">) => SongSubmission;
  addAlbum: (a: Omit<AlbumSubmission, "id" | "ownerId" | "submittedAt" | "status">) => AlbumSubmission;
  // notifications
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  // admin review actions
  setReviewStatus: (
    kind: "work" | "single" | "album",
    id: string,
    status: WorkDeclaration["status"]
  ) => void;
  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistShape>(seedState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state, ready]);

  const currentMember =
    state.members.find((m) => m.id === state.currentMemberId) ?? null;

  const login = useCallback(
    (identifier: string, password: string) => {
      let ok = false;
      setState((s) => {
        const m = s.members.find(
          (x) =>
            (x.email.toLowerCase() === identifier.toLowerCase() ||
              x.phone.replace(/\s/g, "") === identifier.replace(/\s/g, "")) &&
            x.password === password
        );
        if (m) {
          ok = true;
          return { ...s, currentMemberId: m.id };
        }
        return s;
      });
      return ok;
    },
    []
  );

  const register = useCallback((data: Partial<Member> & { password: string }) => {
    const member: Member = {
      id: uid("mem"),
      memberNumber: `ZAM-2026-${Math.floor(10000 + Math.random() * 89999)}`,
      fullName: data.fullName ?? "",
      stageName: data.stageName ?? "",
      nrcOrPassport: data.nrcOrPassport ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      role: data.role ?? "Artist",
      membershipStatus: "Pending",
      joinedAt: new Date().toISOString(),
      password: data.password,
    };
    setState((s) => ({
      ...s,
      members: [...s.members, member],
      currentMemberId: member.id,
      royalty: {
        ...s.royalty,
        [member.id]: {
          ownerId: member.id,
          currency: "ZMW",
          totalEstimated: 0,
          pending: 0,
          paid: 0,
          usageLogs: [],
          topSongs: [],
        },
      },
      statements: [
        {
          id: uid("stm"),
          ownerId: member.id,
          type: "Membership Receipt",
          title: "2026 Membership Application",
          reference: `MR-2026-${member.memberNumber.split("-").pop()}`,
          amount: 350,
          issuedAt: new Date().toISOString(),
        },
        ...s.statements,
      ],
      notifications: [
        {
          id: uid("ntf"),
          ownerId: member.id,
          title: "Welcome to ZAMCOPS",
          body: "Your membership application has been received. Complete your profile to speed up verification.",
          type: "info",
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...s.notifications,
      ],
    }));
    return member;
  }, []);

  const logout = useCallback(() => {
    setState((s) => ({ ...s, currentMemberId: null }));
  }, []);

  const updateProfile = useCallback((patch: Partial<Member>) => {
    setState((s) => ({
      ...s,
      members: s.members.map((m) =>
        m.id === s.currentMemberId ? { ...m, ...patch } : m
      ),
    }));
  }, []);

  const pushReceipt = (s: PersistShape, ownerId: string, title: string, ref: string): Statement => ({
    id: uid("stm"),
    ownerId,
    type: "Submission Receipt",
    title,
    reference: ref,
    issuedAt: new Date().toISOString(),
  });

  const addWork = useCallback<AppContextValue["addWork"]>((w) => {
    const id = uid("wrk");
    let created!: WorkDeclaration;
    setState((s) => {
      const ownerId = s.currentMemberId!;
      created = { ...w, id, ownerId, status: "Pending", submittedAt: new Date().toISOString() };
      return {
        ...s,
        works: [created, ...s.works],
        statements: [pushReceipt(s, ownerId, `Work Declaration — ${w.title}`, `SR-W-${id.slice(-5)}`), ...s.statements],
        notifications: [
          {
            id: uid("ntf"),
            ownerId,
            title: "Work declaration pending review",
            body: `Your declaration for “${w.title}” has been received and is queued for review.`,
            type: "info",
            createdAt: new Date().toISOString(),
            read: false,
          },
          ...s.notifications,
        ],
      };
    });
    return created;
  }, []);

  const addSingle = useCallback<AppContextValue["addSingle"]>((song) => {
    const id = uid("sng");
    let created!: SongSubmission;
    setState((s) => {
      const ownerId = s.currentMemberId!;
      created = { ...song, id, ownerId, status: "Pending", submittedAt: new Date().toISOString() };
      const newUploads: UploadFile[] = [];
      if (song.audioFile) newUploads.push({ id: uid("upl"), ownerId, fileName: song.audioFile, fileType: "Audio", linkedTo: song.title, uploadedAt: new Date().toISOString(), status: "Processing" });
      if (song.coverArt) newUploads.push({ id: uid("upl"), ownerId, fileName: song.coverArt, fileType: "Cover Art", linkedTo: song.title, uploadedAt: new Date().toISOString(), status: "Pending" });
      return {
        ...s,
        singles: [created, ...s.singles],
        uploads: [...newUploads, ...s.uploads],
        statements: [pushReceipt(s, ownerId, `Single — ${song.title}`, `SR-S-${id.slice(-5)}`), ...s.statements],
        notifications: [
          { id: uid("ntf"), ownerId, title: "Single submission received", body: `“${song.title}” is now pending review.`, type: "info", createdAt: new Date().toISOString(), read: false },
          ...s.notifications,
        ],
      };
    });
    return created;
  }, []);

  const addAlbum = useCallback<AppContextValue["addAlbum"]>((album) => {
    const id = uid("alb");
    let created!: AlbumSubmission;
    setState((s) => {
      const ownerId = s.currentMemberId!;
      created = { ...album, id, ownerId, status: "Pending", submittedAt: new Date().toISOString() };
      return {
        ...s,
        albums: [created, ...s.albums],
        statements: [pushReceipt(s, ownerId, `Album — ${album.title}`, `SR-A-${id.slice(-5)}`), ...s.statements],
        notifications: [
          { id: uid("ntf"), ownerId, title: "Album submission received", body: `“${album.title}” (${album.tracks.length} tracks) is now pending review.`, type: "info", createdAt: new Date().toISOString(), read: false },
          ...s.notifications,
        ],
      };
    });
    return created;
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, []);

  const markAllRead = useCallback(() => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) =>
        n.ownerId === s.currentMemberId ? { ...n, read: true } : n
      ),
    }));
  }, []);

  const setReviewStatus = useCallback<AppContextValue["setReviewStatus"]>((kind, id, status) => {
    setState((s) => {
      if (kind === "work") return { ...s, works: s.works.map((w) => (w.id === id ? { ...w, status } : w)) };
      if (kind === "single") return { ...s, singles: s.singles.map((x) => (x.id === id ? { ...x, status } : x)) };
      return { ...s, albums: s.albums.map((x) => (x.id === id ? { ...x, status } : x)) };
    });
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = seedState();
    setState(fresh);
  }, []);

  const value: AppContextValue = {
    ...state,
    ready,
    currentMember,
    login,
    register,
    logout,
    updateProfile,
    addWork,
    addSingle,
    addAlbum,
    markNotificationRead,
    markAllRead,
    setReviewStatus,
    resetDemo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

// Convenience selectors scoped to the current member.
export function useMemberData() {
  const app = useApp();
  const id = app.currentMemberId;
  return {
    works: app.works.filter((w) => w.ownerId === id),
    singles: app.singles.filter((s) => s.ownerId === id),
    albums: app.albums.filter((a) => a.ownerId === id),
    uploads: app.uploads.filter((u) => u.ownerId === id),
    notifications: app.notifications.filter((n) => n.ownerId === id),
    statements: app.statements.filter((s) => s.ownerId === id),
    royalty: (id && app.royalty[id]) || null,
  };
}
