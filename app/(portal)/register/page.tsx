"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mic2, IdCard, Phone, AtSign, Briefcase, Lock, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthScreen, AuthHeading } from "@/components/auth/AuthScreen";
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
    <AuthScreen photo="synth" position="center 30%">
      <AuthHeading
        kicker="Become a member"
        title={<>Join<br />ZAMCOPS</>}
        sub="Register as a ZAMCOPS member — it only takes a minute."
      />

      <form onSubmit={submit} className="mt-7">
        <div className="max-h-[42vh] space-y-3 overflow-y-auto no-scrollbar pb-1">
          {/* Identity */}
          <div className="glass-group">
            <div className="glass-field">
              <User size={17} className="shrink-0 text-white/55" />
              <input
                className="w-full bg-transparent outline-none placeholder:text-white/45"
                placeholder="Full legal name *"
                value={form.fullName}
                onChange={set("fullName")}
              />
            </div>
            <div className="glass-field">
              <Mic2 size={17} className="shrink-0 text-white/55" />
              <input
                className="w-full bg-transparent outline-none placeholder:text-white/45"
                placeholder="Stage name"
                value={form.stageName}
                onChange={set("stageName")}
              />
            </div>
            <div className="glass-field">
              <IdCard size={17} className="shrink-0 text-white/55" />
              <input
                className="w-full bg-transparent outline-none placeholder:text-white/45"
                placeholder="NRC / passport number"
                value={form.nrcOrPassport}
                onChange={set("nrcOrPassport")}
              />
            </div>
          </div>

          {/* Contact + role */}
          <div className="glass-group">
            <div className="glass-field">
              <Phone size={17} className="shrink-0 text-white/55" />
              <input
                className="w-full bg-transparent outline-none placeholder:text-white/45"
                type="tel"
                placeholder="Phone number *"
                value={form.phone}
                onChange={set("phone")}
              />
            </div>
            <div className="glass-field">
              <AtSign size={17} className="shrink-0 text-white/55" />
              <input
                className="w-full bg-transparent outline-none placeholder:text-white/45"
                type="email"
                placeholder="Email *"
                value={form.email}
                onChange={set("email")}
              />
            </div>
            <div className="glass-field">
              <Briefcase size={17} className="shrink-0 text-white/55" />
              <select
                className="w-full appearance-none bg-transparent text-white outline-none [&>option]:bg-night-850 [&>option]:text-white"
                value={form.role}
                onChange={set("role")}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Security */}
          <div className="glass-group">
            <div className="glass-field">
              <Lock size={17} className="shrink-0 text-white/55" />
              <input
                className="w-full bg-transparent outline-none placeholder:text-white/45"
                type="password"
                placeholder="Password (min. 6 characters) *"
                value={form.password}
                onChange={set("password")}
              />
            </div>
            <div className="glass-field">
              <ShieldCheck size={17} className="shrink-0 text-white/55" />
              <input
                className="w-full bg-transparent outline-none placeholder:text-white/45"
                type="password"
                placeholder="Confirm password *"
                value={form.confirm}
                onChange={set("confirm")}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[11px] leading-relaxed text-white/70 backdrop-blur">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-accent-300" />
            By registering you agree to assign collection of public performance and mechanical royalties to ZAMCOPS under the Copyright Act of Zambia.
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-2xl border border-red-400/25 bg-red-500/15 px-3 py-2.5 text-[13px] font-medium text-red-200 backdrop-blur">
            {error}
          </p>
        )}

        <Button type="submit" block size="lg" className="mt-5 h-[58px] rounded-[18px] text-[16px]" disabled={busy}>
          {busy ? "Creating account…" : "Create account"} <ArrowRight size={18} />
        </Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-white/65">
        Already a member?{" "}
        <Link href="/login" className="font-bold text-accent-400">
          Sign in
        </Link>
      </p>
    </AuthScreen>
  );
}
