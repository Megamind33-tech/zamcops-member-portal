"use client";

import { useEffect, useState, useCallback } from "react";

// Lightweight, demo-only admin session kept separate from member auth.
const KEY = "zamcops_admin_authed";
const ADMIN_EMAIL = "admin@zamcops.org.zm";
const ADMIN_PASSWORD = "admin123";

export function useAdminAuth() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1");
  }, []);

  const login = useCallback((email: string, password: string) => {
    if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      window.localStorage.setItem(KEY, "1");
      setAuthed(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(KEY);
    setAuthed(false);
  }, []);

  return { authed, login, logout, ADMIN_EMAIL };
}
