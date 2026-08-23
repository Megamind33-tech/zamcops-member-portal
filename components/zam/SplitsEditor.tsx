"use client";

import React, { useState } from "react";
import {
  Plus as PlusIcon,
  Trash2 as Trash2Icon,
  CheckCircle2 as CheckCircle2Icon,
  AlertTriangle as AlertTriangleIcon,
  Search,
} from "lucide-react";
import { Input, Select } from "./Input";
import { Button } from "./Button";
import { Progress } from "./Misc";
import { MandateNote } from "@/components/zam/MandateNote";
import { DocumentUpload } from "@/components/zam/DocumentUpload";
import { CONTRIBUTOR_ROLES, normalizeContributorRole } from "@/lib/roles";
import { isKnownOnFile, splitsTotal, splitsTotalOk } from "@/lib/works";
import { uid } from "@/lib/format";
import type { OwnershipSplit } from "@/types";

type Hit = { id: string; fullName: string; memberNumber: string; role: string };

export function SplitsEditor({
  splits,
  onChange,
  ownerName,
  ownerMemberNumber,
  workTitle,
}: {
  splits: OwnershipSplit[];
  onChange: (s: OwnershipSplit[]) => void;
  ownerName?: string;
  ownerMemberNumber?: string;
  workTitle?: string;
}) {
  const owner = { fullName: ownerName, memberNumber: ownerMemberNumber };
  const total = splitsTotal(splits);
  const valid = splitsTotalOk(splits);
  const [lookup, setLookup] = useState<Record<number, { q: string; hits: Hit[]; busy: boolean; error: string }>>({});

  function update(i: number, patch: Partial<OwnershipSplit>) {
    onChange(
      splits.map((s, idx) => {
        if (idx !== i) return s;
        const next: OwnershipSplit = { ...s, ...patch };
        if (patch.party !== undefined && !next.memberId) {
          const sameOwner = !!(ownerName && next.party.trim().toLowerCase() === ownerName.trim().toLowerCase());
          next.knownMember = sameOwner;
          if (sameOwner && ownerMemberNumber) next.memberNumber = ownerMemberNumber;
        }
        return next;
      }),
    );
  }

  function add() {
    onChange([...splits, { id: uid("split"), party: "", role: "Composer", percentage: 0 }]);
  }
  function remove(i: number) {
    onChange(splits.filter((_, idx) => idx !== i));
  }

  function applyHit(i: number, m: Hit) {
    update(i, {
      party: m.fullName,
      memberId: m.id,
      memberNumber: m.memberNumber,
      knownMember: true,
      nrc: "",
      affirmationLetter: "",
    });
    setLookup((prev) => ({ ...prev, [i]: { q: m.memberNumber, hits: [], busy: false, error: "" } }));
  }

  async function search(i: number) {
    const q = (lookup[i]?.q || splits[i]?.memberNumber || "").trim();
    if (q.length < 3) {
      setLookup((prev) => ({
        ...prev,
        [i]: { q, hits: [], busy: false, error: "Enter at least 3 characters of their member number or name." },
      }));
      return;
    }
    setLookup((prev) => ({ ...prev, [i]: { q, hits: [], busy: true, error: "" } }));
    try {
      const res = await fetch(`/api/member/creators?q=${encodeURIComponent(q)}`, { credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      const hits: Hit[] = Array.isArray(data.members) ? data.members : [];
      setLookup((prev) => ({
        ...prev,
        [i]: {
          q,
          hits,
          busy: false,
          error: hits.length ? "" : "No member on file with that number or name. Enter their NRC and upload their letter.",
        },
      }));
    } catch {
      setLookup((prev) => ({
        ...prev,
        [i]: { q, hits: [], busy: false, error: "Could not look up that member. Try again." },
      }));
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-zam-muted">
        List every composer, author, arranger or publisher once here — this is the ownership record. Members already on
        file only need their member number. Anyone who is not a member must provide an NRC and a letter affirming they
        wrote, composed, arranged or otherwise created this work.
      </p>
      <div className="space-y-3">
        {splits.map((s, i) => {
          const role = normalizeContributorRole(String(s.role || "Composer"));
          const known = isKnownOnFile(s, owner);
          const row = lookup[i] || { q: s.memberNumber || "", hits: [] as Hit[], busy: false, error: "" };
          return (
            <div key={s.id || i} className="space-y-3 rounded-2xl border border-zam-line bg-zam-canvas/60 p-3">
              <div className="grid grid-cols-12 gap-2 items-center">
                <Input
                  className="col-span-5"
                  placeholder="Creator name"
                  value={s.party}
                  onChange={(e) => update(i, { party: e.target.value })}
                />
                <Select className="col-span-4" value={role} onChange={(e) => update(i, { role: normalizeContributorRole(e.target.value) })}>
                  {CONTRIBUTOR_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
                <div className="col-span-2 relative">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    className="pr-7 text-right"
                    value={s.percentage}
                    onChange={(e) => update(i, { percentage: Number(e.target.value) })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zam-muted">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="col-span-1 inline-flex items-center justify-center h-11 text-zam-muted hover:text-zam-red rounded-xl hover:bg-red-50"
                  aria-label="Remove creator"
                >
                  <Trash2Icon className="h-4 w-4" />
                </button>
              </div>

              {known ? (
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-zam-green">
                  <CheckCircle2Icon className="h-3.5 w-3.5" />
                  {s.memberNumber
                    ? `On file as ${s.memberNumber} — NRC already held by ZAMCOPS.`
                    : "This is you — your NRC is already on file."}
                </p>
              ) : (
                <div className="space-y-3 rounded-xl border border-zam-line bg-white p-3">
                  <p className="text-xs font-semibold text-zam-ink">Identity for this creator</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      className="flex-1"
                      placeholder="ZAMCOPS member number or name on file"
                      value={row.q}
                      onChange={(e) =>
                        setLookup((prev) => ({
                          ...prev,
                          [i]: { ...(prev[i] || { hits: [], busy: false, error: "" }), q: e.target.value },
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          search(i);
                        }
                      }}
                    />
                    <Button type="button" variant="secondary" size="sm" icon={<Search className="h-4 w-4" />} onClick={() => search(i)}>
                      {row.busy ? "Looking…" : "Look up"}
                    </Button>
                  </div>
                  {row.error && <p className="text-xs text-zam-muted">{row.error}</p>}
                  {row.hits.length > 0 && (
                    <ul className="space-y-1">
                      {row.hits.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => applyHit(i, m)}
                            className="w-full rounded-xl border border-zam-line px-3 py-2 text-left text-sm hover:border-zam-orange hover:bg-zam-orange-soft/40"
                          >
                            <span className="font-semibold text-zam-ink">{m.fullName}</span>
                            <span className="ml-2 text-xs text-zam-muted">
                              {m.memberNumber} · {m.role}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Input
                    placeholder="NRC (required if they are not a member)"
                    value={s.nrc || ""}
                    onChange={(e) => update(i, { nrc: e.target.value })}
                  />
                  <DocumentUpload
                    label="Affirmation letter"
                    hint="Letter that they composed, wrote, arranged or took part in creating this work"
                    value={s.affirmationLetter || ""}
                    onChange={(name) => update(i, { affirmationLetter: name })}
                    linkedTo={`${workTitle || "Work"} — affirmation · ${s.party || "creator"}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button type="button" variant="ghost" size="sm" icon={<PlusIcon className="h-4 w-4" />} onClick={add}>
        Add a composer, author, arranger or publisher
      </Button>
      <MandateNote />

      <div
        className={`rounded-xl border p-3 ${valid ? "border-zam-green/30 bg-zam-green-soft" : "border-zam-amber/40 bg-zam-amber-soft"}`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${valid ? "text-zam-green" : "text-[#B8791A]"}`}>
            {valid ? <CheckCircle2Icon className="h-4 w-4" /> : <AlertTriangleIcon className="h-4 w-4" />}
            {valid ? "Splits total 100%" : "Splits must total 100%"}
          </span>
          <span className={`font-display font-bold ${valid ? "text-zam-green" : "text-[#B8791A]"}`}>{total}%</span>
        </div>
        <Progress value={total} tone={valid ? "green" : "orange"} />
      </div>
    </div>
  );
}
