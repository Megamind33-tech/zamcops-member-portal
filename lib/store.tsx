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
  MemberDistribution,
  LicensableWork,
  LicenseRequest,
} from "@/types";

type Result<T = void> = { ok: boolean; error?: string; item?: T };

interface MemberState {
  member: Member | null;
  works: WorkDeclaration[];
  singles: SongSubmission[];
  albums: AlbumSubmission[];
  uploads: UploadFile[];
  notifications: AppNotification[];
  statements: Statement[];
  royalty: RoyaltySummary | null;
  distributions: MemberDistribution[];
  licensableWorks: LicensableWork[];
  licenseRequests: LicenseRequest[];
}

const empty: MemberState = {
  member: null,
  works: [],
  singles: [],
  albums: [],
  uploads: [],
  notifications: [],
  statements: [],
  royalty: null,
  distributions: [],
  licensableWorks: [],
  licenseRequests: [],
};

interface AppContextValue extends MemberState {
  ready: boolean;
  currentMember: Member | null;
  refresh: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<Result>;
  register: (data: Partial<Member> & { password: string }) => Promise<Result>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Member>) => Promise<Result>;
  changePassword: (current: string, next: string) => Promise<Result>;
  addWork: (w: Record<string, unknown>) => Promise<Result<WorkDeclaration>>;
  addSingle: (s: Record<string, unknown>) => Promise<Result<SongSubmission>>;
  addAlbum: (a: Record<string, unknown>) => Promise<Result<AlbumSubmission>>;
  deleteWork: (id: string) => Promise<Result>;
  deleteSingle: (id: string) => Promise<Result>;
  deleteAlbum: (id: string) => Promise<Result>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addLicensableWork: (w: Record<string, unknown>) => Promise<Result<LicensableWork>>;
  withdrawLicensableWork: (id: string) => Promise<Result>;
}

const AppContext = createContext<AppContextValue | null>(null);

async function postJSON(url: string, body?: unknown, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MemberState>(empty);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/member/bootstrap");
    if (!res.ok) {
      setState(empty);
      return;
    }
    const data = await res.json();
    setState({
      member: data.member,
      works: data.works,
      singles: data.singles,
      albums: data.albums,
      uploads: data.uploads,
      notifications: data.notifications,
      statements: data.statements,
      royalty: data.royalty,
      distributions: data.distributions ?? [],
      licensableWorks: data.licensableWorks ?? [],
      licenseRequests: data.licenseRequests ?? [],
    });
  }, []);

  // Bootstrap session on mount.
  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/auth/me").then((r) => r.json());
        if (me.authenticated && me.role === "member") {
          await refresh();
        }
      } catch {
        /* ignore */
      } finally {
        setReady(true);
      }
    })();
  }, [refresh]);

  const login = useCallback<AppContextValue["login"]>(
    async (identifier, password) => {
      const { res, data } = await postJSON("/api/auth/login", { identifier, password });
      if (!res.ok) return { ok: false, error: data.error || "Sign in failed." };
      await refresh();
      return { ok: true };
    },
    [refresh]
  );

  const register = useCallback<AppContextValue["register"]>(
    async (payload) => {
      const { res, data } = await postJSON("/api/auth/register", payload);
      if (!res.ok) return { ok: false, error: data.error || "Registration failed." };
      await refresh();
      return { ok: true };
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    await postJSON("/api/auth/logout");
    setState(empty);
  }, []);

  const updateProfile = useCallback<AppContextValue["updateProfile"]>(async (patch) => {
    const { res, data } = await postJSON("/api/member/profile", patch, "PATCH");
    if (!res.ok) return { ok: false, error: data.error || "Could not save profile." };
    setState((s) => ({ ...s, member: data.member }));
    return { ok: true };
  }, []);

  const changePassword = useCallback<AppContextValue["changePassword"]>(async (current, next) => {
    const { res, data } = await postJSON("/api/member/password", { current, next }, "PATCH");
    if (!res.ok) return { ok: false, error: data.error || "Could not update password." };
    return { ok: true };
  }, []);

  const addWork = useCallback<AppContextValue["addWork"]>(
    async (w) => {
      const { res, data } = await postJSON("/api/member/works", w);
      if (!res.ok) return { ok: false, error: data.error || "Could not submit declaration." };
      await refresh();
      return { ok: true, item: data.work };
    },
    [refresh]
  );

  const addSingle = useCallback<AppContextValue["addSingle"]>(
    async (s) => {
      const { res, data } = await postJSON("/api/member/singles", s);
      if (!res.ok) return { ok: false, error: data.error || "Could not submit single." };
      await refresh();
      return { ok: true, item: data.single };
    },
    [refresh]
  );

  const addAlbum = useCallback<AppContextValue["addAlbum"]>(
    async (a) => {
      const { res, data } = await postJSON("/api/member/albums", a);
      if (!res.ok) return { ok: false, error: data.error || "Could not submit album." };
      await refresh();
      return { ok: true, item: data.album };
    },
    [refresh]
  );

  const makeDelete = (url: string) =>
    async (id: string): Promise<Result> => {
      const { res, data } = await postJSON(url, { id }, "DELETE");
      if (!res.ok) return { ok: false, error: data.error || "Could not delete this submission." };
      await refresh();
      return { ok: true };
    };

  const deleteWork = useCallback<AppContextValue["deleteWork"]>((id) => makeDelete("/api/member/works")(id), [refresh]);
  const deleteSingle = useCallback<AppContextValue["deleteSingle"]>((id) => makeDelete("/api/member/singles")(id), [refresh]);
  const deleteAlbum = useCallback<AppContextValue["deleteAlbum"]>((id) => makeDelete("/api/member/albums")(id), [refresh]);

  const markNotificationRead = useCallback(async (id: string) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
    await postJSON("/api/member/notifications", { id }, "PATCH");
  }, []);

  const markAllRead = useCallback(async () => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
    await postJSON("/api/member/notifications", { all: true }, "PATCH");
  }, []);

  const addLicensableWork = useCallback<AppContextValue["addLicensableWork"]>(
    async (w) => {
      const { res, data } = await postJSON("/api/member/licensing", w);
      if (!res.ok) return { ok: false, error: data.error || "Could not add work to the licensing pool." };
      await refresh();
      return { ok: true, item: data.work };
    },
    [refresh]
  );

  const withdrawLicensableWork = useCallback<AppContextValue["withdrawLicensableWork"]>(
    async (id) => {
      const { res, data } = await postJSON("/api/member/licensing", { id }, "DELETE");
      if (!res.ok) return { ok: false, error: data.error || "Could not withdraw work." };
      await refresh();
      return { ok: true };
    },
    [refresh]
  );

  const value: AppContextValue = {
    ...state,
    ready,
    currentMember: state.member,
    refresh,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    addWork,
    addSingle,
    addAlbum,
    deleteWork,
    deleteSingle,
    deleteAlbum,
    markNotificationRead,
    markAllRead,
    addLicensableWork,
    withdrawLicensableWork,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

// Member-scoped collections (already filtered server-side).
export function useMemberData() {
  const app = useApp();
  return {
    works: app.works,
    singles: app.singles,
    albums: app.albums,
    uploads: app.uploads,
    notifications: app.notifications,
    statements: app.statements,
    royalty: app.royalty,
    distributions: app.distributions,
    licensableWorks: app.licensableWorks,
    licenseRequests: app.licenseRequests,
  };
}
