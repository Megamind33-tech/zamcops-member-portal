"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserCog, Lock, Bell, LogOut, FileText, LifeBuoy } from "lucide-react";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card, CardHeader } from "@/components/zam/Card";
import { Field, Input } from "@/components/zam/Input";
import { Button } from "@/components/zam/Button";
import { StatusBadge } from "@/components/zam/StatusBadge";
import { useApp } from "@/lib/store";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-zam-orange" : "bg-zam-line"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
      />
    </button>
  );
}

const DEFAULT_PREFS = { email: true, sms: true, royalty: true, marketing: false };

function parsePrefs(raw?: string): typeof DEFAULT_PREFS {
  try {
    return { ...DEFAULT_PREFS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export default function SettingsScreen() {
  const router = useRouter();
  const { currentMember, logout, changePassword: changePasswordApi, updateProfile } = useApp();
  const member = currentMember!;
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [prefs, setPrefs] = useState(() => parsePrefs(member.notificationPrefs));

  const savePref = async (patch: Partial<typeof DEFAULT_PREFS>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    const res = await updateProfile({ notificationPrefs: JSON.stringify(next) });
    if (!res.ok) {
      setPrefs(prefs); // roll back on failure
      toast.error(res.error || "Could not save your preference.");
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg("");
    if (pw.next.length < 6) return setPwMsg("New password must be at least 6 characters.");
    if (pw.next !== pw.confirm) return setPwMsg("New passwords do not match.");
    const res = await changePasswordApi(pw.current, pw.next);
    if (!res.ok) return setPwMsg(res.error || "Could not update password.");
    setPw({ current: "", next: "", confirm: "" });
    setPwMsg("saved");
  };

  const doLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const prefRows: { key: keyof typeof prefs; label: string; desc: string }[] = [
    { key: "email", label: "Email notifications", desc: "Submission updates and approvals" },
    { key: "sms", label: "SMS notifications", desc: "Important alerts via text message" },
    { key: "royalty", label: "Royalty alerts", desc: "When new royalties are detected or paid" },
    { key: "marketing", label: "News & opportunities", desc: "ZAMCOPS updates and events" },
  ];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account and preferences." />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Account */}
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-zam-orange" /> Account
              </span>
            }
          />
          <div className="space-y-3 p-5 text-sm">
            {[
              ["Member number", member.memberNumber],
              ["Email", member.email],
              ["Phone", member.phone],
              ["Role", member.role],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <span className="text-zam-muted">{k}</span>
                <span className="font-medium text-zam-ink">{v}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3">
              <span className="text-zam-muted">Membership</span>
              <StatusBadge status={member.membershipStatus} />
            </div>
            <Link href="/profile" className="block">
              <Button variant="secondary" size="sm" className="mt-2 w-full">
                Edit profile
              </Button>
            </Link>
          </div>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-zam-orange" /> Change password
              </span>
            }
          />
          <form onSubmit={changePassword} className="space-y-4 p-5">
            <Field label="Current password">
              <Input
                type="password"
                placeholder="••••••••"
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password">
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                />
              </Field>
              <Field label="Confirm new">
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={pw.confirm}
                  onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                />
              </Field>
            </div>
            {pwMsg && pwMsg !== "saved" && <p className="text-sm text-zam-red">{pwMsg}</p>}
            {pwMsg === "saved" && <p className="text-sm font-medium text-zam-green">Password updated.</p>}
            <div className="flex justify-end">
              <Button type="submit" size="sm">
                Update password
              </Button>
            </div>
          </form>
        </Card>

        {/* Notification preferences */}
        <Card className="lg:col-span-2">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-zam-orange" /> Notification preferences
              </span>
            }
          />
          <div className="divide-y divide-zam-line p-5">
            {prefRows.map((p) => (
              <div key={p.key} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold text-zam-ink">{p.label}</p>
                  <p className="text-xs text-zam-muted">{p.desc}</p>
                </div>
                <Toggle checked={prefs[p.key]} onChange={(v) => savePref({ [p.key]: v })} />
              </div>
            ))}
          </div>
        </Card>

        {/* Quick links */}
        <Card className="lg:col-span-2">
          <CardHeader title="More" />
          <div className="divide-y divide-zam-line">
            {[
              { href: "/statements", icon: FileText, label: "Statements & receipts", sub: "Official receipts and royalty statements" },
              { href: "/support", icon: LifeBuoy, label: "Help & support", sub: "Reach the ZAMCOPS team" },
            ].map((r) => (
              <Link key={r.href} href={r.href} className="flex items-center gap-3 px-5 py-4 hover:bg-zam-canvas/60">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-zam-orange-soft text-zam-orange">
                  <r.icon className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-zam-ink">{r.label}</span>
                  <span className="block text-xs text-zam-muted">{r.sub}</span>
                </span>
              </Link>
            ))}
          </div>
        </Card>

        {/* Logout */}
        <div className="lg:col-span-2">
          <Button variant="danger" icon={<LogOut className="h-4 w-4" />} onClick={doLogout}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
