"use client";

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export type PickedHolder = { id: string | null; name: string };

// Search the right-owner register and pick one (WIPO's Assignor / Assignee search).
export function HolderPick({ value, onPick, disabled }: { value: PickedHolder; onPick: (h: PickedHolder) => void; disabled?: boolean }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: string; wipoId: string; displayName: string }[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/admin/register/holders?q=${encodeURIComponent(q.trim())}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((b) => setHits((b.holders ?? []).slice(0, 8)))
        .catch(() => setHits([]));
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

  if (value.name && !open)
    return (
      <div className="flex h-8 items-center justify-between gap-2 rounded-sm border border-[#bfc5ce] bg-white px-2 text-[13px]">
        <span className="min-w-0 truncate">{value.name}</span>
        {!disabled && (
          <button type="button" aria-label="Change" onClick={() => { onPick({ id: null, name: "" }); setQ(""); setOpen(true); }} className="text-zam-muted hover:text-zam-red">
            <X size={13} />
          </button>
        )}
      </div>
    );

  return (
    <div ref={box} className="relative">
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search right owners by name or id…" className="field-input h-8 w-full" />
      {open && hits.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-sm border border-[#bfc5ce] bg-white shadow">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => { onPick({ id: h.id, name: h.displayName }); setOpen(false); }} className="block w-full px-2 py-1.5 text-left text-[13px] hover:bg-[#eef3f8]">
                {h.displayName} <span className="text-zam-muted">{h.wipoId}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
