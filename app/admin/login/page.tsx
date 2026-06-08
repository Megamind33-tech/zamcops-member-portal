"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogIn } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
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
    <div className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-night-950 px-4">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-600/30 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-iris-500/25 blur-[100px]" />
      <div className="card relative w-full max-w-sm p-8">
        <div className="mb-6 flex items-center justify-between">
          <Logo size={40} subtitle="Staff Console" />
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 text-brand-200 ring-1 ring-brand-400/20">
            <ShieldCheck size={20} />
          </span>
        </div>
        <h1 className="font-display text-lg font-bold text-white">Staff sign in</h1>
        <p className="mt-1 text-sm text-night-300">Review applications, submissions and royalties.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Staff email" required>
            <TextInput type="email" placeholder="admin@zamcops.org.zm" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" required>
            <TextInput type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">{error}</p>}
          <Button type="submit" block size="lg" disabled={busy}>
            <LogIn size={18} /> {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
