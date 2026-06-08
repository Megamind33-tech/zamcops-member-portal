"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AtSign, MailCheck, ArrowLeft, ArrowRight } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AuthScreen, AuthHeading } from "@/components/auth/AuthScreen";

export default function ForgotPasswordScreen() {
  const [sent, setSent] = useState(false);
  const [contact, setContact] = useState("");

  return (
    <AuthScreen
      photo="piano"
      topRight={
        <Link href="/login" className="inline-flex items-center gap-1 text-[13px] font-semibold text-white/70 transition hover:text-white">
          <ArrowLeft size={16} /> Back to sign in
        </Link>
      }
    >
      {sent ? (
        <>
          <div className="grid h-16 w-16 place-items-center rounded-[1.25rem] border border-accent-400/20 bg-accent-500/12 text-accent-300">
            <MailCheck size={32} />
          </div>
          <AuthHeading
            kicker="Account help"
            title={<>Check your<br />inbox</>}
          />
          <p className="mt-3 max-w-[19rem] text-[15px] leading-relaxed text-white/70">
            If an account exists for{" "}
            <span className="font-semibold text-accent-400">{contact}</span>,
            we&apos;ve sent password reset instructions.
          </p>
          <ButtonLink href="/login" block size="lg" className="mt-7 h-[58px] rounded-[18px] text-[16px]">
            Return to sign in <ArrowRight size={18} />
          </ButtonLink>
        </>
      ) : (
        <>
          <AuthHeading
            kicker="Account help"
            title={<>Reset<br />access</>}
            sub="Enter the phone or email linked to your membership and we'll send reset instructions."
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="mt-7"
          >
            <div className="glass-group">
              <div className="glass-field">
                <AtSign size={17} className="shrink-0 text-white/55" />
                <input
                  className="w-full bg-transparent outline-none placeholder:text-white/45"
                  placeholder="you@email.com or +260…"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" block size="lg" className="mt-5 h-[58px] rounded-[18px] text-[16px]" disabled={!contact}>
              Send reset link <ArrowRight size={18} />
            </Button>
          </form>
        </>
      )}
    </AuthScreen>
  );
}
