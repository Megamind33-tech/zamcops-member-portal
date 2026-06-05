"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MailCheck, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";

export default function ForgotPasswordScreen() {
  const [sent, setSent] = useState(false);
  const [contact, setContact] = useState("");

  return (
    <div className="flex flex-1 flex-col bg-white px-6 pb-10 pt-10">
      <Link href="/login" className="mb-8 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
        <ArrowLeft size={16} /> Back to sign in
      </Link>
      <Logo size={40} />

      {sent ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <MailCheck size={32} />
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-brand-900">Check your inbox</h1>
          <p className="mt-2 max-w-xs text-sm text-slate-500">
            If an account exists for <span className="font-semibold text-brand-700">{contact}</span>,
            we&apos;ve sent password reset instructions.
          </p>
          <Link href="/login" className="mt-8 w-full">
            <Button block size="lg">
              Return to sign in
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8">
            <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">Reset password</h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter the phone or email linked to your membership and we&apos;ll send reset
              instructions.
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
                placeholder="you@email.com or +260…"
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
  );
}
