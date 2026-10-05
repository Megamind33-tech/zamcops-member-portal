"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export type PickedWork = { id: string; title: string; iswc: string };

// Search the society register for a work and pick one — used where staff match
// an allocation line to the work it paid.
export function WorkPicker({
  value,
  onPick,
  placeholder = "Search the register by title or ISWC…",
}: {
  value: { id: string | null; title: string } | null;
  onPick: (w: PickedWork | null) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PickedWork[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      setBusy(true);
      fetch(`/api/admin/registry/works?q=${encodeURIComponent(q.trim())}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((b) => setHits((b.works ?? []).slice(0, 8).map((w: PickedWork) => ({ id: w.id, title: w.title, iswc: w.iswc }))))
        .catch(() => setHits([]))
        .finally(() => setBusy(false));
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  if (value && value.id && !open) {
    return (
      <div className="flex h-8 items-center justify-between gap-2 rounded-sm border border-[#bfc5ce] bg-white px-2 text-[13px]">
        <span className="min-w-0 truncate font-medium text-zam-ink">{value.title || "Untitled"}</span>
        <button type="button" onClick={() => { onPick(null); setQ(""); setOpen(true); }} aria-label="Change work" className="text-zam-muted hover:text-zam-red">
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div ref={box} className="relative">
      <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-zam-muted" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="field-input h-8 w-full pl-7"
      />
      {open && q.trim().length >= 2 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full min-w-[240px] overflow-auto rounded-sm border border-[#bfc5ce] bg-white p-1 shadow-lg">
          {busy && <li className="px-3 py-2 text-xs text-zam-muted">Searching…</li>}
          {!busy && hits.length === 0 && <li className="px-3 py-2 text-xs text-zam-muted">No work on the register matches.</li>}
          {hits.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(w);
                  setQ("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-left text-[13px] hover:bg-[#eaf1f8]"
              >
                <span className="truncate font-medium text-zam-ink">{w.title}</span>
                <span className="shrink-0 font-mono text-[11px] text-zam-muted">{w.iswc || "no ISWC"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
