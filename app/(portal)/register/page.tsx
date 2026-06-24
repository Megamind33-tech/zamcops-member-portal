"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/zam/Button";
import { Field, Input, Select } from "@/components/zam/Input";
import { Logo } from "@/components/ui/Logo";
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
    <div className="min-h-screen flex items-center justify-center bg-zam-canvas p-4 sm:p-8">
      <div className="w-full max-w-xl">
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-2xl px-4 py-3 inline-flex shadow-card">
            <Logo size={30} onDark={false} />
          </div>
        </div>

        <div className="bg-white border border-zam-line rounded-3xl shadow-card p-6 sm:p-8">
          <h1 className="font-display font-bold text-2xl text-zam-ink">Create your account</h1>
          <p className="mt-1 text-sm text-zam-muted">Register as a ZAMCOPS member — it only takes a minute.</p>

          <form onSubmit={submit} className="mt-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full legal name" required>
                <Input placeholder="Full legal name" value={form.fullName} onChange={set("fullName")} />
              </Field>
              <Field label="Stage name">
                <Input placeholder="Stage name" value={form.stageName} onChange={set("stageName")} />
              </Field>
              <Field label="NRC / passport number">
                <Input placeholder="NRC / passport number" value={form.nrcOrPassport} onChange={set("nrcOrPassport")} />
              </Field>
              <Field label="Role">
                <Select value={form.role} onChange={set("role")}>
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Phone number" required>
                <Input type="tel" placeholder="+260…" value={form.phone} onChange={set("phone")} />
              </Field>
              <Field label="Email" required>
                <Input type="email" placeholder="you@email.com" value={form.email} onChange={set("email")} />
              </Field>
              <Field label="Password" required>
                <Input type="password" placeholder="Min. 6 characters" value={form.password} onChange={set("password")} />
              </Field>
              <Field label="Confirm password" required>
                <Input type="password" placeholder="Re-enter password" value={form.confirm} onChange={set("confirm")} />
              </Field>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-zam-orange-soft/50 border border-zam-orange/20 p-3.5 text-xs leading-relaxed text-zam-ink">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-zam-orange" />
              By registering you agree to assign collection of public performance and mechanical royalties to ZAMCOPS under the Copyright Act of Zambia.
            </div>

            {error && <p className="mt-3 text-sm text-zam-red">{error}</p>}

            <Button type="submit" className="w-full mt-5" loading={busy}>
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zam-muted">
            Already a member?{" "}
            <Link href="/login" className="font-semibold text-zam-orange hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
