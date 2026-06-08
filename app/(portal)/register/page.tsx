"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, Select } from "@/components/ui/Field";
import { useApp } from "@/lib/store";
import type { MemberRole } from "@/types";

const roles: MemberRole[] = [
  "Artist",
  "Composer",
  "Producer",
  "Publisher",
  "Label",
  "Next of Kin/Representative",
];

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useApp();
  const [form, setForm] = useState({
    fullName: "",
    stageName: "",
    nrcOrPassport: "",
    phone: "",
    email: "",
    role: "Artist" as MemberRole,
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.fullName || !form.phone || !form.email || !form.password) {
      setError("Please complete all required fields.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const res = await register({
      fullName: form.fullName,
      stageName: form.stageName,
      nrcOrPassport: form.nrcOrPassport,
      phone: form.phone,
      email: form.email,
      role: form.role,
      password: form.password,
    });
    setBusy(false);
    if (res.ok) router.replace("/dashboard");
    else setError(res.error || "Registration failed.");
  };

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden px-4 py-4">
      <div className="pointer-events-none absolute -left-24 top-8 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-4 h-64 w-64 rounded-full bg-gold-400/10 blur-3xl" />

      <div className="card relative z-10 flex flex-1 flex-col px-5 py-6">
        <Logo size={40} />

        <div className="mt-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold-600">Join ZAMCOPS</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-brand-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Register as a ZAMCOPS member - it only takes a minute.
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Full legal name" required>
            <TextInput placeholder="e.g. Chanda M. Mwale" value={form.fullName} onChange={set("fullName")} />
          </Field>
          <Field label="Stage name">
            <TextInput placeholder="e.g. C-Note" value={form.stageName} onChange={set("stageName")} />
          </Field>
          <Field label="NRC / passport number">
            <TextInput
              placeholder="e.g. 327145/61/1"
              value={form.nrcOrPassport}
              onChange={set("nrcOrPassport")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone number" required>
              <TextInput type="tel" placeholder="+260 ..." value={form.phone} onChange={set("phone")} />
            </Field>
            <Field label="Email" required>
              <TextInput type="email" placeholder="you@email.com" value={form.email} onChange={set("email")} />
            </Field>
          </div>
          <Field label="Role" required hint="Choose how you are involved in your music.">
            <Select value={form.role} onChange={set("role")}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Password" required>
              <TextInput type="password" placeholder="Min. 6 characters" value={form.password} onChange={set("password")} />
            </Field>
            <Field label="Confirm password" required>
              <TextInput type="password" placeholder="Repeat" value={form.confirm} onChange={set("confirm")} />
            </Field>
          </div>

          {error && (
            <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>
          )}

          <div className="flex items-start gap-2 rounded-2xl bg-brand-50/60 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-brand-500" />
            By registering you agree to assign collection of public performance and mechanical royalties to ZAMCOPS under the Copyright Act of Zambia.
          </div>

          <Button type="submit" block size="lg" disabled={busy}>
            <UserPlus size={18} /> {busy ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already a member?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
