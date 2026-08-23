"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MailCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/zam/Button";
import { Field, Input } from "@/components/zam/Input";
import { AuthPhotoShell } from "@/components/brand/AuthPhotoShell";

export default function ForgotPasswordScreen() {
  const [sent, setSent] = useState(false);
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: contact }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not submit your request — please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Could not reach the server — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthPhotoShell
      src="/img/hands.webp"
      alt="Musician's hands"
      headline="We'll help you back into your catalogue."
      body="The ZAMCOPS team verifies identity before issuing a temporary password."
    >
      {sent ? (
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zam-green-soft text-zam-green">
            <MailCheck size={26} />
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold text-zam-ink">Request received</h1>
          <p className="mt-2 text-sm text-zam-muted">
            If an account exists for <span className="font-semibold text-zam-ink">{contact}</span>, the ZAMCOPS team
            will verify your identity and contact you with a temporary password — usually within one working day. You
            can also call <span className="font-semibold text-zam-ink">+260 211 250 082</span>.
          </p>
          <Link
            href="/login"
            className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-zam-muted hover:text-zam-ink"
          >
            <ArrowLeft size={16} /> Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <h1 className="font-display text-2xl font-semibold text-zam-ink">Reset your password</h1>
          <p className="mt-1 text-sm text-zam-muted">
            Enter the phone or email linked to your membership. The ZAMCOPS team will verify your identity and issue
            you a temporary password.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Phone or email" required>
              <Input
                placeholder="you@email.com or +260…"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </Field>

            {error && <p className="text-sm text-zam-red">{error}</p>}

            <Button type="submit" className="w-full" disabled={!contact || busy}>
              {busy ? "Submitting…" : "Request reset"}
            </Button>
          </form>

          <Link
            href="/login"
            className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-zam-muted hover:text-zam-ink"
          >
            <ArrowLeft size={16} /> Back to sign in
          </Link>
        </>
      )}
    </AuthPhotoShell>
  );
}
