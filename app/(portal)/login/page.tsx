"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, ShieldCheck, Music, Coins } from "lucide-react";
import { Button } from "@/components/zam/Button";
import { Field, Input } from "@/components/zam/Input";
import { Logo } from "@/components/ui/Logo";
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
    <div className="min-h-screen grid lg:grid-cols-2 bg-zam-canvas">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-zam-ink text-white p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="bg-white rounded-2xl px-4 py-3 inline-flex shadow-card-lg">
            <Logo size={30} onDark={false} />
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="font-display font-bold text-3xl leading-tight">
            Protecting Zambian music, one work at a time.
          </h2>
          <p className="mt-4 text-white/70 leading-relaxed">
            Your home for declarations, submissions and royalties as a ZAMCOPS member.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-zam-orange">
                <ShieldCheck size={20} />
              </span>
              <span className="text-sm text-white/85">Official copyright registration &amp; protection</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-zam-orange">
                <Music size={20} />
              </span>
              <span className="text-sm text-white/85">Declare works, singles and albums</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-zam-orange">
                <Coins size={20} />
              </span>
              <span className="text-sm text-white/85">Track royalties from radio &amp; TV across Zambia</span>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/50">
          © 2026 Zambian Music Copyright Protection Society
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex justify-center mb-8">
            <div className="bg-white rounded-2xl px-4 py-3 inline-flex shadow-card">
              <Logo size={30} onDark={false} />
            </div>
          </div>

          <h1 className="font-display font-bold text-2xl text-zam-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-zam-muted">Sign in to your member portal.</p>

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
                <input type="checkbox" className="h-4 w-4 rounded border-zam-line text-zam-orange focus:ring-zam-orange/40" />
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
            New to ZAMCOPS?{" "}
            <Link href="/register" className="font-semibold text-zam-orange hover:underline">
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
