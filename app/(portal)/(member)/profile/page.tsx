"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { User, MapPin, Banknote, Users, FileUp } from "lucide-react";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card, CardHeader } from "@/components/zam/Card";
import { Field, Input, Select } from "@/components/zam/Input";
import { Button } from "@/components/zam/Button";
import { Progress } from "@/components/zam/Misc";
import { FilePicker } from "@/components/zam/FilePicker";
import { ImageUpload } from "@/components/zam/ImageUpload";
import { useApp } from "@/lib/store";
import { profileCompletion } from "@/lib/member";
import { ZM_PROVINCES } from "@/data/reference";
import type { Member } from "@/types";

export default function ProfileScreen() {
  const { currentMember, updateProfile } = useApp();
  const member = currentMember!;
  const [form, setForm] = useState<Member>(member);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof Member) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setFile = (k: keyof Member) => (name: string | undefined) => setForm((f) => ({ ...f, [k]: name }));

  const completion = profileCompletion(form);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await updateProfile(form);
    setBusy(false);
    if (res.ok) toast.success("Profile updated successfully.");
    else toast.error(res.error || "Could not save profile.");
  };

  return (
    <form onSubmit={save}>
      <PageHeader
        title="Profile & KYC"
        subtitle="Keep your details up to date so ZAMCOPS can pay you correctly."
        action={
          <Button type="submit" loading={busy}>
            Save changes
          </Button>
        }
      />

      {/* Profile photo + completion meter */}
      <Card className="mb-6 p-5">
        <ImageUpload
          name={form.fullName}
          value={form.profilePhoto}
          onChange={(dataUrl) => setForm((f) => ({ ...f, profilePhoto: dataUrl }))}
        />
        <div className="mt-5 border-t border-zam-line pt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-semibold text-zam-ink">Profile completion</span>
            <span className="text-sm font-bold text-zam-orange">{completion}%</span>
          </div>
          <Progress value={completion} tone={completion === 100 ? "green" : "orange"} />
          <p className="mt-1.5 text-xs text-zam-muted">
            {completion === 100
              ? "Your profile is complete — you're ready to receive payouts."
              : "Complete all sections to unlock royalty payouts. Don't forget to save your changes."}
          </p>
        </div>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Identity */}
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 text-zam-orange" /> Identity
              </span>
            }
          />
          <div className="space-y-4 p-5">
            <Field label="Full legal name" required>
              <Input value={form.fullName} onChange={set("fullName")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Stage name">
                <Input value={form.stageName} onChange={set("stageName")} />
              </Field>
              <Field label="NRC / Passport">
                <Input value={form.nrcOrPassport} onChange={set("nrcOrPassport")} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date of birth">
                <Input type="date" value={form.dateOfBirth ?? ""} onChange={set("dateOfBirth")} />
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
          </div>
        </Card>

        {/* Contact & location */}
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-zam-orange" /> Contact &amp; location
              </span>
            }
          />
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone">
                <Input type="tel" value={form.phone} onChange={set("phone")} />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={set("email")} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Province">
                <Select value={form.province ?? ""} onChange={set("province")}>
                  <option value="">Select…</option>
                  {ZM_PROVINCES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Field label="District">
                <Input value={form.district ?? ""} onChange={set("district")} />
              </Field>
            </div>
            <Field label="Residential address">
              <Input value={form.address ?? ""} onChange={set("address")} />
            </Field>
          </div>
        </Card>

        {/* Payout */}
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-zam-orange" /> Payout details
              </span>
            }
            description="Where ZAMCOPS sends your royalties"
          />
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bank name">
                <Input value={form.bankName ?? ""} onChange={set("bankName")} />
              </Field>
              <Field label="Bank account">
                <Input value={form.bankAccount ?? ""} onChange={set("bankAccount")} />
              </Field>
            </div>
            <Field label="Mobile money number">
              <Input type="tel" value={form.mobileMoneyNumber ?? ""} onChange={set("mobileMoneyNumber")} placeholder="+260 …" />
            </Field>
          </div>
        </Card>

        {/* Next of kin */}
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-zam-orange" /> Next of kin
              </span>
            }
            description="Beneficiary / representative"
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={form.nextOfKinName ?? ""} onChange={set("nextOfKinName")} />
            </Field>
            <Field label="Phone">
              <Input type="tel" value={form.nextOfKinPhone ?? ""} onChange={set("nextOfKinPhone")} />
            </Field>
          </div>
        </Card>

        {/* Documents */}
        <Card className="lg:col-span-2">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <FileUp className="h-4 w-4 text-zam-orange" /> Document uploads
              </span>
            }
            description="Required for KYC verification"
          />
          <div className="p-5">
            <FilePicker
              label="NRC / Passport copy"
              hint="PDF or image"
              kind="document"
              value={form.nrcDocument}
              onChange={setFile("nrcDocument")}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" size="lg" loading={busy}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
