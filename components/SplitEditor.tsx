"use client";

import React from "react";
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { TextInput, Select } from "@/components/ui/Field";
import type { OwnershipSplit, ContributorRole, RightsType } from "@/types";
import { uid } from "@/lib/format";

const ROLES: ContributorRole[] = [
  "Composer",
  "Author/Lyricist",
  "Producer",
  "Performer",
  "Publisher",
  "Arranger",
];

const RIGHTS_TYPES: RightsType[] = ["Performing", "Mechanical", "Both"];

// Editable list of ownership splits with a live total / 100% validity check.
export function SplitEditor({
  splits,
  onChange,
  compact,
}: {
  splits: OwnershipSplit[];
  onChange: (next: OwnershipSplit[]) => void;
  compact?: boolean;
}) {
  const total = splits.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0);
  const valid = total === 100;

  const update = (id: string, patch: Partial<OwnershipSplit>) =>
    onChange(splits.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const add = () =>
    onChange([...splits, { id: uid("split"), party: "", role: "Composer", percentage: 0 }]);
  const remove = (id: string) => onChange(splits.filter((s) => s.id !== id));

  return (
    <div className="space-y-2.5">
      {splits.map((s) => (
        <div key={s.id} className="card-raised p-2.5">
          <div className="flex items-center gap-2">
            <TextInput
              className="flex-1 px-3 py-2 text-sm"
              placeholder="Rights holder name"
              value={s.party}
              onChange={(e) => update(s.id, { party: e.target.value })}
            />
            <button
              type="button"
              onClick={() => remove(s.id)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-night-400 hover:bg-red-500/10 hover:text-red-300"
              aria-label="Remove split"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Select
              className="px-3 py-2 text-sm"
              value={s.role}
              onChange={(e) => update(s.id, { role: e.target.value as ContributorRole })}
            >
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
            <div className="relative">
              <TextInput
                className="px-3 py-2 pr-8 text-sm"
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={s.percentage || ""}
                onChange={(e) => update(s.id, { percentage: Number(e.target.value) })}
              />
              <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-night-400">%</span>
            </div>
          </div>
          {/* Reciprocal-society registration fields — IPI cross-references this rights holder
              across CISAC societies; rights type tells the society which royalty stream the share covers. */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <TextInput
              className="px-3 py-2 text-sm"
              placeholder="IPI / CAE number"
              value={s.ipiNumber ?? ""}
              onChange={(e) => update(s.id, { ipiNumber: e.target.value })}
            />
            <Select
              className="px-3 py-2 text-sm"
              value={s.rightsType ?? "Both"}
              onChange={(e) => update(s.id, { rightsType: e.target.value as RightsType })}
            >
              {RIGHTS_TYPES.map((r) => (
                <option key={r} value={r}>
                  {r} rights
                </option>
              ))}
            </Select>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 hover:text-brand-200"
        >
          <Plus size={15} /> Add split
        </button>
        <span
          className={
            "inline-flex items-center gap-1 text-xs font-semibold " +
            (valid ? "text-emerald-300" : "text-gold-300")
          }
        >
          {valid ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          Total: {total}%
        </span>
      </div>
      {!compact && !valid && (
        <p className="text-[11px] text-gold-300">Ownership splits must add up to exactly 100%.</p>
      )}
      {!compact && (
        <p className="text-[11px] text-night-400">
          IPI/CAE numbers cross-reference a rights holder across reciprocal societies; rights type tells ZAMCOPS which royalty stream (performing or mechanical) the share applies to — both are optional but speed up international registration.
        </p>
      )}
    </div>
  );
}

export function splitsValid(splits: OwnershipSplit[]): boolean {
  return splits.reduce((s, x) => s + (Number(x.percentage) || 0), 0) === 100;
}
