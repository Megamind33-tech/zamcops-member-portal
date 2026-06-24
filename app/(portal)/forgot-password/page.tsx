"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MailCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/zam/Button";
import { Field, Input } from "@/components/zam/Input";
import { Logo } from "@/components/ui/Logo";

export default function ForgotPasswordScreen() {
  const [sent, setSent] = useState(false);
  const [contact, setContact] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-zam-canvas p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-2xl px-4 py-3 inline-flex shadow-card">
            <Logo size={30} onDark={false} />
          </div>
        </div>

        <div className="bg-white border border-zam-line rounded-3xl shadow-card p-7">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zam-green-soft text-zam-green">
                <MailCheck size={26} />
              </div>
              <h1 className="mt-5 font-display font-bold text-2xl text-zam-ink">Check your inbox</h1>
              <p className="mt-2 text-sm text-zam-muted">
                If an account exists for{" "}
                <span className="font-semibold text-zam-ink">{contact}</span>, we&apos;ve sent password reset instructions.
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
              <h1 className="font-display font-bold text-2xl text-zam-ink">Reset your password</h1>
              <p className="mt-1 text-sm text-zam-muted">
                Enter the phone or email linked to your membership and we&apos;ll send reset instructions.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                className="mt-6 space-y-4"
              >
                <Field label="Phone or email" required>
                  <Input
                    placeholder="you@email.com or +260…"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                </Field>

                <Button type="submit" className="w-full" disabled={!contact}>
                  Send reset link
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
        </div>
      </div>
    </div>
  );
}
