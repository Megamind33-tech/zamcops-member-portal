"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/zam/Button";
import { Field, Input, Select } from "@/components/zam/Input";
import { AuthPhotoShell } from "@/components/brand/AuthPhotoShell";
import { useApp } from "@/lib/store";
import { MEMBER_ROLES } from "@/lib/roles";
import type { MemberRole } from "@/types";

const roles: MemberRole[] = [...MEMBER_ROLES];

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useApp();
  const [form, setForm] = useState({
    fullName: "",
    stageName: "",
    nrcOrPassport: "",
    phone: "",
    email: "",
    role: "Composer" as MemberRole,
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
    if (res.ok) router.replace("/verify-email");
    else setError(res.error || "Registration failed.");
  };

  return (
    <AuthPhotoShell
      src="/img/piano.webp"
      alt="Hands on a piano"
      wide
      headline="Join as a composer, author or publisher."
      body="Membership is for the people who write and publish musical works. Register songs with artwork in one submission."
    >
      <h1 className="font-display text-2xl font-semibold text-zam-ink">Create your account</h1>
      <p className="mt-1 text-sm text-zam-muted">
        Open to composers, authors and publishers of musical works.
      </p>

      <form onSubmit={submit} className="mt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full legal name" required>
            <Input placeholder="Full legal name" value={form.fullName} onChange={set("fullName")} />
          </Field>
          <Field label="Pseudonym">
            <Input placeholder="Pseudonym" value={form.stageName} onChange={set("stageName")} />
          </Field>
          <Field label="NRC / passport number">
            <Input placeholder="NRC / passport number" value={form.nrcOrPassport} onChange={set("nrcOrPassport")} />
          </Field>
          <Field label="You are joining as">
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

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-zam-orange/20 bg-zam-orange-soft/50 p-3.5 text-xs leading-relaxed text-zam-ink">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-zam-orange" />
          By registering you agree that, if admitted, collection of performing and mechanical royalties is assigned to
          ZAMCOPS under the Copyright and Performance Rights Act.
        </div>

        {error && <p className="mt-3 text-sm text-zam-red">{error}</p>}

        <Button type="submit" className="mt-5 w-full" loading={busy}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zam-muted">
        Already a member?{" "}
        <Link href="/login" className="font-semibold text-zam-orange hover:underline">
          Sign in
        </Link>
      </p>
    </AuthPhotoShell>
  );
}
