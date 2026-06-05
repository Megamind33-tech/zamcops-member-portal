"use client";

import { useEffect, useState, useCallback } from "react";

// Real admin session backed by the API (httpOnly cookie). `authed` is null
// while the session is being checked, then true/false.
export function useAdminAuth() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  const check = useCallback(async () => {
    try {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setAuthed(me.authenticated && me.role === "admin");
    } catch {
      setAuthed(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

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

  return { authed, login, logout, recheck: check };
}
