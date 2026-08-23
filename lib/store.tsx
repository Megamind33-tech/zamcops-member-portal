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
  refresh: () => Promise<boolean>;
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
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MemberState>(empty);
  const [ready, setReady] = useState(false);
  const bootGen = React.useRef(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/member/bootstrap", { credentials: "same-origin", cache: "no-store" });
      if (!res.ok) {
        setState(empty);
        return false;
      }
      const data = await res.json();
      if (!data.member) {
        setState(empty);
        return false;
      }
      setState({
        member: data.member,
        works: data.works ?? [],
        singles: data.singles ?? [],
        albums: data.albums ?? [],
        uploads: data.uploads ?? [],
        notifications: data.notifications ?? [],
        statements: data.statements ?? [],
        royalty: data.royalty ?? null,
        distributions: data.distributions ?? [],
        licensableWorks: data.licensableWorks ?? [],
        licenseRequests: data.licenseRequests ?? [],
      });
      return true;
    } catch {
      setState(empty);
      return false;
    }
  }, []);

  // Bootstrap session on mount. A generation counter drops stale /me results
  // so they cannot wipe a login that completed while the first check was in flight.
  useEffect(() => {
    const gen = ++bootGen.current;
    (async () => {
      try {
        const me = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" }).then((r) => r.json());
        if (gen !== bootGen.current) return;
        if (me.authenticated && me.role === "member") {
          await refresh();
        }
      } catch {
        /* ignore */
      } finally {
        if (gen === bootGen.current) setReady(true);
      }
    })();
  }, [refresh]);

  const login = useCallback<AppContextValue["login"]>(
    async (identifier, password) => {
      bootGen.current += 1;
      const { res, data } = await postJSON("/api/auth/login", { identifier, password });
      if (!res.ok) return { ok: false, error: data.error || "Sign in failed." };
      const loaded = await refresh();
      setReady(true);
      if (!loaded) {
        return {
          ok: false,
          error: "Signed in, but the portal could not load your account. Please try again.",
        };
      }
      return { ok: true };
    },
    [refresh]
  );

  const register = useCallback<AppContextValue["register"]>(
    async (payload) => {
      bootGen.current += 1;
      const { res, data } = await postJSON("/api/auth/register", payload);
      if (!res.ok) return { ok: false, error: data.error || "Registration failed." };
      const loaded = await refresh();
      setReady(true);
      if (!loaded) return { ok: false, error: "Account created, but the portal could not load. Please sign in." };
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

  const makeDelete = useCallback(
    (url: string) =>
      async (id: string): Promise<Result> => {
        const { res, data } = await postJSON(url, { id }, "DELETE");
        if (!res.ok) return { ok: false, error: data.error || "Could not delete this submission." };
        await refresh();
        return { ok: true };
      },
    [refresh]
  );

  const deleteWork = useCallback<AppContextValue["deleteWork"]>((id) => makeDelete("/api/member/works")(id), [makeDelete]);
  const deleteSingle = useCallback<AppContextValue["deleteSingle"]>((id) => makeDelete("/api/member/singles")(id), [makeDelete]);
  const deleteAlbum = useCallback<AppContextValue["deleteAlbum"]>((id) => makeDelete("/api/member/albums")(id), [makeDelete]);

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
