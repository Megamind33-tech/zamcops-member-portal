"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AtSign, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
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
    <div className="relative flex flex-1 flex-col overflow-hidden px-4 py-4">
      <div className="pointer-events-none absolute -left-24 top-8 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-4 h-64 w-64 rounded-full bg-gold-400/10 blur-3xl" />

      <div className="card relative z-10 flex flex-1 flex-col px-5 py-6">
        <Logo size={46} />

        <div className="mt-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold-600">Member access</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-brand-900">
            Welcome back
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Sign in to manage your ZAMCOPS membership.
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field label="Phone or email" required>
            <div className="relative">
              <AtSign
                size={16}
                className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
              />
              <TextInput
                className="pl-10"
                placeholder="you@email.com or +260..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
              />
            </div>
          </Field>

          <Field label="Password" required>
            <div className="relative">
              <Lock
                size={16}
                className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
              />
              <TextInput
                className="px-10"
                type={show ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-3 text-slate-400 hover:text-brand-600"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs font-semibold text-brand-600 hover:underline">
              Forgot password?
            </Link>
          </div>

          {error && (
            <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>
          )}

          <Button type="submit" block size="lg" disabled={busy}>
            <LogIn size={18} /> {busy ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-auto pt-8 text-center text-sm text-slate-500">
          New to ZAMCOPS?{" "}
          <Link href="/register" className="font-semibold text-brand-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
