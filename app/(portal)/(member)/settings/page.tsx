"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Lock,
  Bell,
  LifeBuoy,
  FileText,
  LogOut,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { Field, TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store";
import { initials } from "@/lib/format";

export default function SettingsScreen() {
  const router = useRouter();
  const { currentMember, logout, changePassword: changePasswordApi } = useApp();
  const member = currentMember!;
  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [prefs, setPrefs] = useState({ email: true, sms: true, royalty: true });

  const togglePref = (k: keyof typeof prefs) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg("");
    if (pw.next.length < 6) return setPwMsg("New password must be at least 6 characters.");
    if (pw.next !== pw.confirm) return setPwMsg("New passwords do not match.");
    const res = await changePasswordApi(pw.current, pw.next);
    if (!res.ok) return setPwMsg(res.error || "Could not update password.");
    setPw({ current: "", next: "", confirm: "" });
    setShowPw(false);
    setPwMsg("saved");
  };

  const doLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div>
      <TopBar title="Settings" back="/dashboard" />

      <div className="space-y-5 px-4 py-4">
        {/* Account card */}
        <section className="card flex items-center gap-3 px-4 py-4">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {initials(member.stageName || member.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-brand-900">{member.fullName}</p>
            <p className="truncate text-xs text-slate-500">{member.email}</p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-400">{member.memberNumber}</p>
          </div>
        </section>

        {/* Account details */}
        <section>
          <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">Account</h3>
          <div className="card divide-y divide-slate-100">
            <Row href="/profile" icon={<User size={17} />} label="Account details" sub="Name, contact and KYC" />
            <button onClick={() => setShowPw((s) => !s)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Lock size={17} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-brand-900">Change password</span>
                <span className="block text-xs text-slate-500">Update your sign-in password</span>
              </span>
              <ChevronRight size={18} className={"text-slate-300 transition " + (showPw ? "rotate-90" : "")} />
            </button>
            {showPw && (
              <form onSubmit={changePassword} className="space-y-3 px-4 py-4">
                <Field label="Current password">
                  <TextInput type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="New password">
                    <TextInput type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                  </Field>
                  <Field label="Confirm">
                    <TextInput type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                  </Field>
                </div>
                {pwMsg && pwMsg !== "saved" && <p className="text-xs font-medium text-red-600">{pwMsg}</p>}
                <Button type="submit" block size="sm">
                  Update password
                </Button>
              </form>
            )}
          </div>
          {pwMsg === "saved" && (
            <p className="mt-2 flex items-center gap-1.5 px-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 size={14} /> Password updated.
            </p>
          )}
        </section>

        {/* Notification preferences */}
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Bell size={13} /> Notification preferences
          </h3>
          <div className="card divide-y divide-slate-100">
            <Toggle label="Email notifications" on={prefs.email} onClick={() => togglePref("email")} />
            <Toggle label="SMS notifications" on={prefs.sms} onClick={() => togglePref("sms")} />
            <Toggle label="Royalty statement alerts" on={prefs.royalty} onClick={() => togglePref("royalty")} />
          </div>
        </section>

        {/* More */}
        <section>
          <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">More</h3>
          <div className="card divide-y divide-slate-100">
            <Row href="/statements" icon={<FileText size={17} />} label="Statements & receipts" />
            <Row href="/support" icon={<LifeBuoy size={17} />} label="Help & support" />
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck size={17} />
              </span>
              <span className="flex-1 text-sm font-semibold text-brand-900">Membership</span>
              <span className="pill bg-emerald-50 text-emerald-700">{member.membershipStatus}</span>
            </div>
          </div>
        </section>

        <button
          onClick={doLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-3 text-sm font-semibold text-red-600"
        >
          <LogOut size={16} /> Log out
        </button>

        <p className="pb-2 text-center text-[11px] text-slate-400">
          ZAMCOPS Member Portal
        </p>
      </div>
    </div>
  );
}

function Row({
  href,
  icon,
  label,
  sub,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-brand-900">{label}</span>
        {sub && <span className="block text-xs text-slate-500">{sub}</span>}
      </span>
      <ChevronRight size={18} className="text-slate-300" />
    </Link>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm font-semibold text-brand-900">{label}</span>
      <button
        onClick={onClick}
        role="switch"
        aria-checked={on}
        className={"relative h-6 w-11 rounded-full transition " + (on ? "bg-brand-600" : "bg-slate-200")}
      >
        <span
          className={"absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition " + (on ? "left-[22px]" : "left-0.5")}
        />
      </button>
    </div>
  );
}
