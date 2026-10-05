"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export type PickedHolder = { id: string; displayName: string; ipiNumber: string };

// Search the WIPO register for a right-holder and pick one. Used wherever staff
// attach a person to something (a work's shares, a group's members).
export function HolderPicker({
  value,
  onPick,
  placeholder = "Search the register by name or IPI…",
}: {
  value: { id: string | null; name: string } | null;
  onPick: (h: PickedHolder | null) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PickedHolder[]>([]);
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
      fetch(`/api/admin/register/holders?q=${encodeURIComponent(q.trim())}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((b) =>
          setHits(
            (b.holders ?? []).slice(0, 8).map((h: PickedHolder) => ({ id: h.id, displayName: h.displayName, ipiNumber: h.ipiNumber })),
          ),
        )
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

  if (value && (value.id || value.name) && !open) {
    return (
      <div className="flex h-10 items-center justify-between gap-2 rounded-xl border border-zam-line bg-white px-3 text-sm">
        <span className="min-w-0 truncate font-medium text-zam-ink">{value.name || "Unnamed"}</span>
        <button type="button" onClick={() => { onPick(null); setQ(""); setOpen(true); }} aria-label="Change right-holder" className="text-zam-muted hover:text-zam-red">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div ref={box} className="relative">
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zam-muted" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="field-input h-10 w-full pl-8"
      />
      {open && q.trim().length >= 2 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-zam-line bg-white p-1 shadow-lg">
          {busy && <li className="px-3 py-2 text-xs text-zam-muted">Searching…</li>}
          {!busy && hits.length === 0 && <li className="px-3 py-2 text-xs text-zam-muted">No one on the register matches.</li>}
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(h);
                  setQ("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-zam-canvas"
              >
                <span className="truncate font-medium text-zam-ink">{h.displayName}</span>
                <span className="shrink-0 font-mono text-[11px] text-zam-muted">{h.ipiNumber || "no IPI"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
