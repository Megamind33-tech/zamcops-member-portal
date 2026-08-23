"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Send } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel } from "@/components/admin/widgets";
import { Field, TextInput, TextArea, Select } from "@/components/ui/Field";
import { useAdminData } from "@/lib/adminClient";

const LINKS = [
  { value: "", label: "No link" },
  { value: "/support", label: "Support" },
  { value: "/works", label: "Works" },
  { value: "/documents", label: "Documents" },
  { value: "/royalties", label: "Royalties" },
  { value: "/application", label: "Membership application" },
  { value: "/settings", label: "Settings" },
];

export default function AdminNoticesPage() {
  const { members, sendNotice, loading } = useAdminData();
  const [audience, setAudience] = useState<"one" | "active" | "all">("one");
  const [memberId, setMemberId] = useState("");
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [href, setHref] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members
      .filter((m) => {
        if (!needle) return true;
        return (
          m.fullName.toLowerCase().includes(needle) ||
          m.stageName.toLowerCase().includes(needle) ||
          m.memberNumber.toLowerCase().includes(needle) ||
          m.email.toLowerCase().includes(needle)
        );
      })
      .slice(0, 80);
  }, [members, q]);

  const activeCount = members.filter((m) => m.membershipStatus === "Active").length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (audience === "one" && !memberId) {
      toast.error("Choose a member.");
      return;
    }
    setBusy(true);
    const res = await sendNotice({ title, message, href, audience, memberId: audience === "one" ? memberId : undefined });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Notice sent to ${res.sent} member${res.sent === 1 ? "" : "s"}.`);
    setTitle("");
    setMessage("");
  };

  return (
    <div>
      <AdminHeader
        title="Member notices"
        subtitle="Send an in-app notification from staff to one member, every active member, or the whole register"
      />

      <Panel title="Compose">
        <form onSubmit={submit} className="space-y-4 p-5">
          <Field label="Audience" required>
            <Select value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)}>
              <option value="one">One member</option>
              <option value="active">All active members ({loading ? "…" : activeCount})</option>
              <option value="all">Everyone on the register ({loading ? "…" : members.length})</option>
            </Select>
          </Field>

          {audience === "one" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Search members">
                <TextInput placeholder="Name, number or email" value={q} onChange={(e) => setQ(e.target.value)} />
              </Field>
              <Field label="Member" required>
                <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                  <option value="">Choose…</option>
                  {filtered.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} · {m.memberNumber}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          <Field label="Title" required>
            <TextInput placeholder="Short subject" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Message" required hint="Shown in the member's Notifications list and, if they opted in, by email/SMS.">
            <TextArea rows={5} placeholder="What should members know?" value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <Field label="Open this page when tapped" hint="Optional. Members land on this portal path from the notice.">
            <Select value={href} onChange={(e) => setHref(e.target.value)}>
              {LINKS.map((l) => (
                <option key={l.value || "none"} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy || title.trim().length < 3 || message.trim().length < 8}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-night-950 transition hover:bg-accent-400 disabled:opacity-40"
            >
              <Send size={15} /> {busy ? "Sending…" : "Send notice"}
            </button>
            <p className="inline-flex items-center gap-1.5 text-xs text-night-400">
              <Bell size={13} /> Delivered to Notifications. Email and SMS follow each member&apos;s preferences.
            </p>
          </div>
        </form>
      </Panel>

      <p className="mt-4 text-xs text-night-400">
        To message one person from their file, open{" "}
        <Link href="/admin/directory" className="font-semibold text-accent-300 hover:underline">
          All Members
        </Link>{" "}
        and compose on their page.
      </p>
    </div>
  );
}
