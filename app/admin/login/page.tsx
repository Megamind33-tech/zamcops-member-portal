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
    <div className="grid min-h-[100dvh] place-items-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-card">
        <div className="mb-6 flex items-center justify-between">
          <Logo size={40} subtitle="Staff Console" />
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <ShieldCheck size={20} />
          </span>
        </div>
        <h1 className="text-lg font-extrabold text-slate-900">Staff sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Review applications, submissions and royalties.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Staff email" required>
            <TextInput type="email" placeholder="admin@zamcops.org.zm" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" required>
            <TextInput type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>}
          <Button type="submit" block size="lg" disabled={busy}>
            <LogIn size={18} /> {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
