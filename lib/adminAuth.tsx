"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface AdminAuthValue {
  authed: boolean | null; // null while checking
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

  const recheck = useCallback(async () => {
    try {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setAuthed(me.authenticated && me.role === "admin");
    } catch {
      setAuthed(false);
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
      setAuthed(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthed(false);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ authed, login, logout, recheck }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
