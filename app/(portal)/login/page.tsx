"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/zam/Button";
import { Field, Input } from "@/components/zam/Input";
import { AuthPhotoShell } from "@/components/brand/AuthPhotoShell";
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
    <AuthPhotoShell
      src="/img/auth-mic.webp"
      alt="Vocalist at a microphone"
      headline="Your works. Your catalogue. Your royalties."
      body="Sign in to register songs with artwork, download documents issued by ZAMCOPS, and follow royalty receiving and distribution."
    >
      <h1 className="font-display text-2xl font-semibold text-zam-ink">Sign in</h1>
      <p className="mt-1 text-sm text-zam-muted">Composers, authors and publishers.</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field label="Phone or email" required>
          <Input
            placeholder="you@email.com or +260…"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
          />
        </Field>

        <Field label="Password" required>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zam-muted transition hover:text-zam-ink"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>

        {error && <p className="text-sm text-zam-red">{error}</p>}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-zam-muted">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zam-line text-zam-orange focus:ring-zam-orange/40"
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-sm font-semibold text-zam-orange hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" loading={busy}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zam-muted">
        Not a member yet?{" "}
        <Link href="/register" className="font-semibold text-zam-orange hover:underline">
          Create an account
        </Link>
      </p>
    </AuthPhotoShell>
  );
}
