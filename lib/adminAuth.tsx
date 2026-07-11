"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface AdminIdentity {
  id: string;
  name: string;
  email: string;
}

interface AdminAuthValue {
  authed: boolean | null; // null while checking
  admin: AdminIdentity | null; // the signed-in staff account
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  recheck: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

// Shared admin session state (httpOnly cookie). Provided once around the admin
// area so the layout guard and the login page read/write the SAME state —
// otherwise a fresh login is invisible to the already-mounted layout and it
// bounces back to /admin/login.
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);

  const recheck = useCallback(async () => {
    try {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      const ok = me.authenticated && me.role === "admin";
      setAuthed(ok);
      setAdmin(ok ? me.admin ?? null : null);
    } catch {
      setAuthed(false);
      setAdmin(null);
    }
  }, []);

  useEffect(() => {
    recheck();
  }, [recheck]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setAuthed(true);
      setAdmin(data.admin ?? null);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthed(false);
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ authed, admin, login, logout, recheck }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
