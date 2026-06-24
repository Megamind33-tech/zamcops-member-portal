"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AtSign, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthScreen, AuthHeading } from "@/components/auth/AuthScreen";
import { useApp } from "@/lib/store";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useApp();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await login(identifier.trim(), password);
    setBusy(false);
    if (res.ok) router.replace("/dashboard");
    else setError(res.error || "Sign in failed.");
  };

  return (
    <AuthScreen photo="auth-mic" position="center 32%">
      <AuthHeading kicker="Member access" title={<>Welcome<br />back</>} sub="Pick up your declarations, submissions and royalties." />

      <form onSubmit={submit} className="mt-7">
        <div className="glass-group">
          <div className="glass-field">
            <AtSign size={17} className="shrink-0 text-white/55" />
            <input
              className="w-full bg-transparent outline-none placeholder:text-white/45"
              placeholder="you@email.com or +260…"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="glass-field">
            <Lock size={17} className="shrink-0 text-white/55" />
            <input
              className="w-full bg-transparent outline-none placeholder:text-white/45"
              type={show ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="shrink-0 text-white/55 transition hover:text-white"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <Link href="/forgot-password" className="text-[13px] font-semibold text-white/70 transition hover:text-white">
            Forgot password?
          </Link>
        </div>

        {error && (
          <p className="mt-3 rounded-2xl border border-red-400/25 bg-red-500/15 px-3 py-2.5 text-[13px] font-medium text-red-200 backdrop-blur">
            {error}
          </p>
        )}

        <Button type="submit" block size="lg" className="mt-5 h-[58px] rounded-[18px] text-[16px]" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"} <ArrowRight size={18} />
        </Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-white/65">
        New here?{" "}
        <Link href="/register" className="font-bold text-accent-400">
          Create an account
        </Link>
      </p>

      <p className="mt-3 text-center">
        <Link
          href="/admin/login"
          className="text-[12px] font-medium text-white/40 underline-offset-4 transition hover:text-white/75 hover:underline"
        >
          ZAMCOPS staff sign-in
        </Link>
      </p>
    </AuthScreen>
  );
}
