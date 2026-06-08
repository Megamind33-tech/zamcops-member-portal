"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MailCheck, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { PhotoBackdrop } from "@/components/media/PhotoBackdrop";

export default function ForgotPasswordScreen() {
  const [sent, setSent] = useState(false);
  const [contact, setContact] = useState("");

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden px-4 py-4">
      <PhotoBackdrop photo="piano" scrim="strong" />
      <div className="pointer-events-none absolute -left-24 top-8 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-4 h-64 w-64 rounded-full bg-gold-400/10 blur-3xl" />

      <div className="card relative z-10 flex flex-1 flex-col px-5 py-6">
        <Link href="/login" className="mb-8 inline-flex items-center gap-1 text-sm font-semibold text-brand-300 hover:text-brand-200">
          <ArrowLeft size={16} /> Back to sign in
        </Link>
        <Logo size={40} />

        {sent ? (
          <div className="mt-12 flex flex-1 flex-col items-center justify-center text-center">
            <div className="grid h-16 w-16 place-items-center rounded-[1.25rem] bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-400/20">
              <MailCheck size={32} />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-white">
              Check your inbox
            </h1>
            <p className="mt-2 max-w-xs text-sm text-night-300">
              If an account exists for <span className="font-semibold text-brand-300">{contact}</span>,
              we&apos;ve sent password reset instructions.
            </p>
            <ButtonLink href="/login" block size="lg" className="mt-8">
              Return to sign in
            </ButtonLink>
          </div>
        ) : (
          <>
            <div className="mt-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold-400">Account recovery</p>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">
                Reset password
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-night-300">
                Enter the phone or email linked to your membership and we&apos;ll send reset instructions.
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="mt-8 space-y-4"
            >
              <Field label="Phone or email" required>
                <TextInput
                  placeholder="you@email.com or +260..."
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </Field>
              <Button type="submit" block size="lg" disabled={!contact}>
                Send reset link
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
