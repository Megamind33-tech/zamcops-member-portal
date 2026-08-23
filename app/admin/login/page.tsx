"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogIn, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAdminAuth } from "@/lib/adminAuth";

export default function AdminLoginScreen() {
  const router = useRouter();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const ok = await login(email, password);
    setBusy(false);
    if (ok) router.replace("/admin");
    else setError("Invalid staff credentials.");
  };

  return (
    <div className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-zam-ink px-4">
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo size={36} onDark />
        </div>
        <div className="card-lite relative overflow-hidden p-7">
          <div className="zam-flagline absolute inset-x-0 top-0 rounded-none" />
          <div className="mb-1 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-zam-ink text-white">
              <ShieldCheck size={16} />
            </span>
            <h1 className="font-display text-xl font-bold text-zam-ink">Staff Console</h1>
          </div>
          <p className="mb-6 text-sm text-zam-muted">Sign in to the ZAMCOPS administration dashboard.</p>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="field-label-lite">Staff email <span className="text-zam-red">*</span></span>
            <input
              type="email"
              className="field-input-lite"
              placeholder="admin@zamcops.org.zm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="field-label-lite">Password <span className="text-zam-red">*</span></span>
            <input
              type="password"
              className="field-input-lite"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p className="rounded-lg border border-zam-red/20 bg-zam-red/10 px-3 py-2 text-xs font-medium text-zam-red">{error}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="brand-gradient-zam inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white shadow-[0_16px_38px_-14px_rgba(242,108,33,0.65)] transition hover:opacity-95 disabled:opacity-50"
          >
            <LogIn size={18} /> {busy ? "Signing in…" : "Sign in to console"}
          </button>
        </form>

          <Link
            href="/login"
            className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-zam-muted transition hover:text-zam-ink"
          >
            <ArrowLeft size={16} /> Back to member portal
          </Link>
        </div>
        <p className="mt-6 text-center text-xs text-white/40">Authorised personnel only · ZAMCOPS © 2026</p>
      </div>
    </div>
  );
}
