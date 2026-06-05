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
    <div className="flex flex-1 flex-col bg-white px-6 pb-8 pt-10">
      <Logo size={44} />

      <div className="mt-10">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to manage your ZAMCOPS membership.</p>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Phone or email" required>
          <div className="relative">
            <AtSign size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" />
            <TextInput
              className="pl-10"
              placeholder="you@email.com or +260…"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
            />
          </div>
        </Field>

        <Field label="Password" required>
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" />
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
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>
        )}

        <Button type="submit" block size="lg" disabled={busy}>
          <LogIn size={18} /> {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-auto pt-8 text-center text-sm text-slate-500">
        New to ZAMCOPS?{" "}
        <Link href="/register" className="font-semibold text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
