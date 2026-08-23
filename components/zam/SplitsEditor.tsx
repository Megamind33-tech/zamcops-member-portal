"use client";

import React from "react";
import {
  Plus as PlusIcon,
  Trash2 as Trash2Icon,
  CheckCircle2 as CheckCircle2Icon,
  AlertTriangle as AlertTriangleIcon,
} from "lucide-react";
import { Input, Select } from "./Input";
import { Button } from "./Button";
import { Progress } from "./Misc";
import { CONTRIBUTOR_ROLES, normalizeContributorRole, type ContributorRole } from "@/lib/roles";

export interface OwnershipSplit {
  party: string;
  role: ContributorRole | string;
  percentage: number;
}

export function SplitsEditor({
  splits,
  onChange,
}: {
  splits: OwnershipSplit[];
  onChange: (s: OwnershipSplit[]) => void;
}) {
  const total = splits.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0);
  const valid = total === 100;

  function update(i: number, patch: Partial<OwnershipSplit>) {
    onChange(splits.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function add() {
    onChange([...splits, { party: "", role: "Composer", percentage: 0 }]);
  }
  function remove(i: number) {
    onChange(splits.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {splits.map((s, i) => {
          const role = normalizeContributorRole(String(s.role || "Composer"));
          return (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <Input
                className="col-span-5"
                placeholder="Name"
                value={s.party}
                onChange={(e) => update(i, { party: e.target.value })}
              />
              <Select className="col-span-4" value={role} onChange={(e) => update(i, { role: e.target.value })}>
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
                aria-label="Remove split"
              >
                <Trash2Icon className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <Button type="button" variant="ghost" size="sm" icon={<PlusIcon className="h-4 w-4" />} onClick={add}>
        Add a composer, author or publisher
      </Button>

      <div
        className={`rounded-xl border p-3 ${valid ? "border-zam-green/30 bg-zam-green-soft" : "border-zam-amber/40 bg-zam-amber-soft"}`}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-semibold ${valid ? "text-zam-green" : "text-[#B8791A]"}`}
          >
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
