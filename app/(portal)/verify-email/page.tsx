"use client";

// Email verification: after registering, the member enters the 6-digit code
// emailed to them. Verification is required before an application can be
// submitted — this keeps registrations tied to a real, reachable inbox.

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MailCheck, RefreshCcw } from "lucide-react";
import { Button } from "@/components/zam/Button";
import { Logo } from "@/components/ui/Logo";
import { useApp } from "@/lib/store";

const RESEND_COOLDOWN = 60; // seconds

export default function VerifyEmailPage() {
  const router = useRouter();
  const { ready, currentMember, refresh } = useApp();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ready) return;
    if (!currentMember) router.replace("/login");
    else if (currentMember.emailVerified) router.replace("/dashboard");
    else inputRef.current?.focus();
  }, [ready, currentMember, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, error: data.error as string | undefined };
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code from the email.");
    setBusy(true);
    const res = await post({ action: "verify", code });
    setBusy(false);
    if (!res.ok) return setError(res.error || "Could not verify the code.");
    await refresh();
    router.replace("/dashboard");
  };

  const resend = async () => {
    setError("");
    setNotice("");
    setResending(true);
    const res = await post({ action: "send" });
    setResending(false);
    if (!res.ok) return setError(res.error || "Could not send a new code.");
    setNotice("A new code is on its way — check your inbox (and spam folder).");
    setCooldown(RESEND_COOLDOWN);
  };

  if (!ready || !currentMember || currentMember.emailVerified) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-zam-canvas">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-zam-line border-t-zam-orange" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-zam-canvas p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-2xl bg-white px-4 py-3 shadow-card">
            <Logo size={30} onDark={false} />
          </div>
        </div>

        <div className="rounded-3xl border border-zam-line bg-white p-6 shadow-card sm:p-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-zam-orange-soft text-zam-orange">
            <MailCheck size={22} />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-zam-ink">Verify your email</h1>
          <p className="mt-1 text-sm text-zam-muted">
            We sent a 6-digit code to <strong className="text-zam-ink">{currentMember.email}</strong>. Enter it below
            to confirm your address.
          </p>

          <form onSubmit={verify} className="mt-6 space-y-4">
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              className="h-14 w-full rounded-xl border border-zam-line bg-white text-center font-mono text-2xl tracking-[0.5em] text-zam-ink focus:border-zam-orange focus:outline-none focus:ring-2 focus:ring-zam-orange/20"
            />
            {error && <p className="text-sm font-medium text-zam-red">{error}</p>}
            {notice && <p className="text-sm font-medium text-zam-green">{notice}</p>}
            <Button type="submit" loading={busy} disabled={code.length !== 6} className="w-full">
              Verify email
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm">
            <button
              onClick={resend}
              disabled={cooldown > 0 || resending}
              className="inline-flex items-center gap-1.5 font-semibold text-zam-orange disabled:text-zam-muted"
            >
              <RefreshCcw size={14} className={resending ? "animate-spin" : undefined} />
              {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
            </button>
            <button onClick={() => router.push("/dashboard")} className="font-semibold text-zam-muted hover:text-zam-ink">
              Do this later
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-zam-muted">
          You can browse the portal without verifying, but your membership application can only be submitted from a
          verified email address.
        </p>
      </div>
    </div>
  );
}
