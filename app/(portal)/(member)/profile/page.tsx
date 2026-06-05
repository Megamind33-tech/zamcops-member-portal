"use client";

import React, { useState } from "react";
import { Save, CheckCircle2, IdCard, MapPin, Wallet, Users, FileUp } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { Field, TextInput, Select, FilePicker } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Misc";
import { useApp } from "@/lib/store";
import { profileCompletion } from "@/lib/member";
import { ZM_PROVINCES } from "@/data/reference";
import type { Member } from "@/types";

export default function ProfileScreen() {
  const { currentMember, updateProfile } = useApp();
  const member = currentMember!;
  const [form, setForm] = useState<Member>(member);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof Member) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setFile = (k: keyof Member) => (name: string) => setForm((f) => ({ ...f, [k]: name }));

  const completion = profileCompletion(form);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateProfile(form);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div>
      <TopBar title="Profile & KYC" subtitle={member.memberNumber} back="/dashboard" />

      <div className="px-4 py-4">
        <div className="card mb-4 px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-brand-900">KYC completion</span>
            <span className="text-sm font-bold text-gold-600">{completion}%</span>
          </div>
          <ProgressBar value={completion} className="mt-3" />
        </div>

        <form onSubmit={save} className="space-y-5">
          <Section icon={<IdCard size={15} />} title="Identity">
            <Field label="Full name" required>
              <TextInput value={form.fullName} onChange={set("fullName")} />
            </Field>
            <Field label="Stage name">
              <TextInput value={form.stageName} onChange={set("stageName")} />
            </Field>
            <Field label="NRC / passport">
              <TextInput value={form.nrcOrPassport} onChange={set("nrcOrPassport")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date of birth">
                <TextInput type="date" value={form.dateOfBirth ?? ""} onChange={set("dateOfBirth")} />
              </Field>
              <Field label="Gender">
                <Select value={form.gender ?? ""} onChange={set("gender")}>
                  <option value="">Select…</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </Select>
              </Field>
            </div>
          </Section>

          <Section icon={<MapPin size={15} />} title="Contact & location">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone">
                <TextInput type="tel" value={form.phone} onChange={set("phone")} />
              </Field>
              <Field label="Email">
                <TextInput type="email" value={form.email} onChange={set("email")} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Province">
                <Select value={form.province ?? ""} onChange={set("province")}>
                  <option value="">Select…</option>
                  {ZM_PROVINCES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Field label="District">
                <TextInput value={form.district ?? ""} onChange={set("district")} />
              </Field>
            </div>
            <Field label="Residential address">
              <TextInput value={form.address ?? ""} onChange={set("address")} />
            </Field>
          </Section>

          <Section icon={<Wallet size={15} />} title="Payout details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bank name">
                <TextInput value={form.bankName ?? ""} onChange={set("bankName")} />
              </Field>
              <Field label="Bank account">
                <TextInput value={form.bankAccount ?? ""} onChange={set("bankAccount")} />
              </Field>
            </div>
            <Field label="Mobile money number">
              <TextInput type="tel" value={form.mobileMoneyNumber ?? ""} onChange={set("mobileMoneyNumber")} />
            </Field>
          </Section>

          <Section icon={<Users size={15} />} title="Next of kin">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name">
                <TextInput value={form.nextOfKinName ?? ""} onChange={set("nextOfKinName")} />
              </Field>
              <Field label="Phone">
                <TextInput type="tel" value={form.nextOfKinPhone ?? ""} onChange={set("nextOfKinPhone")} />
              </Field>
            </div>
          </Section>

          <Section icon={<FileUp size={15} />} title="Documents">
            <FilePicker
              label="Upload NRC / passport"
              accept="image/*,application/pdf"
              value={form.nrcDocument}
              onPick={setFile("nrcDocument")}
            />
            <FilePicker
              label="Upload profile photo"
              accept="image/*"
              value={form.profilePhoto}
              onPick={setFile("profilePhoto")}
            />
          </Section>

          <Button type="submit" block size="lg">
            <Save size={18} /> Save profile
          </Button>
        </form>
      </div>

      {saved && (
        <div className="fixed inset-x-0 bottom-24 z-40 mx-auto flex max-w-app justify-center px-4">
          <span className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
            <CheckCircle2 size={16} /> Profile saved
          </span>
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card px-4 py-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-600">{icon}</span>
        <h3 className="text-sm font-bold text-brand-900">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
