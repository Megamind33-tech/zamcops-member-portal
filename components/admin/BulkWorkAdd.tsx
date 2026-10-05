"use client";

import React, { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Th, Td, StatusBadge } from "./widgets";
import { WorkPicker } from "./WorkPicker";

type WorkBrief = { id: string; title: string; iswc: string; wipoId: string; holders: string[] };
type MatchRow = { n: number; ref: string; weight: number; status: "matched" | "ambiguous" | "notfound" | "duplicate" | "already"; work?: WorkBrief; candidates?: WorkBrief[] };
type Check = { rows: MatchRow[]; summary: { lines: number; matched: number; ambiguous: number; notfound: number; duplicate: number; already: number } };

const SAMPLE = "133-507-W\nT-123.456.105-0\nBEAUTIFUL DAY 3, 12\n\"TITLE, WITH A COMMA\"\t4";

// Paste or upload a list of works (WIPO ids, ISWCs or exact titles, each with an
// optional play count), check it against the register, resolve the lines that
// match more than one work, then add the chosen works. `endpoint` is a route
// that understands { action: "check", text } and { action: "add", items }.
export function BulkWorkAdd({ endpoint, onAdded, extra }: { endpoint: string; onAdded: (info: { added: number; updated: number }) => void; extra?: React.ReactNode }) {
  const [text, setText] = useState("");
  const [check, setCheck] = useState<Check | null>(null);
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const call = async (body: unknown, fail: string) => {
    const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(b.error ?? fail);
    return b;
  };

  const runCheck = async () => {
    setBusy("check");
    try {
      setCheck(await call({ action: "check", text }, "Could not read the list."));
      setChoices({});
      setShowAll(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read the list.");
    } finally {
      setBusy("");
    }
  };

  const addable = (check?.rows ?? []).flatMap((r) => {
    if (r.status === "matched" && r.work) return [{ workId: r.work.id, weight: r.weight }];
    if (r.status === "ambiguous" && choices[r.n]) return [{ workId: choices[r.n], weight: r.weight }];
    return [];
  });

  const addChecked = async () => {
    if (!addable.length) return;
    setBusy("add");
    try {
      const b = await call({ action: "add", items: addable }, "Could not add the works.");
      setCheck(null);
      setText("");
      onAdded({ added: b.added ?? 0, updated: b.updated ?? 0 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add the works.");
    } finally {
      setBusy("");
    }
  };

  const addOne = async (w: { id: string } | null) => {
    if (!w) return;
    try {
      const b = await call({ action: "add", items: [{ workId: w.id, weight: 1 }] }, "Could not add the work.");
      onAdded({ added: b.added ?? 0, updated: b.updated ?? 0 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add the work.");
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 4_000_000) return toast.error("That file is too large. Keep it under 4 MB.");
    setText(await f.text());
    setCheck(null);
    if (file.current) file.current.value = "";
  };

  const problems = (check?.rows ?? []).filter((r) => r.status === "ambiguous" || r.status === "notfound");
  const shown = showAll ? (check?.rows ?? []) : problems;
  const badge = (s: MatchRow["status"]) => (s === "matched" ? <StatusBadge status="Approved" /> : s === "ambiguous" ? <StatusBadge status="Pending" /> : s === "notfound" ? <StatusBadge status="Rejected" /> : <StatusBadge status="Paused" />);
  const label = (s: MatchRow["status"]) => ({ matched: "Matched", ambiguous: "Pick one", notfound: "Not found", duplicate: "Repeated in list", already: "Already on the list" })[s];

  const downloadMissing = () => {
    const lines = (check?.rows ?? []).filter((r) => r.status === "notfound" || (r.status === "ambiguous" && !choices[r.n])).map((r) => `"${r.ref.replace(/"/g, '""')}",${r.weight},${r.status}`);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["work,weight,problem\n" + lines.join("\n")], { type: "text/csv" }));
    a.download = "works-not-matched.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-3 p-4">
      <p className="text-[13px] text-zam-muted">
        One work per line: its WIPO id (<code>133-507-W</code> or <code>507</code>), its ISWC, or its exact title. Add a number after a tab or comma for how many times it was played; without one every work counts equally. Paste the list or upload a <code>.csv</code> /{" "}
        <code>.txt</code> file, then check it against the register before anything is added.
      </p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setCheck(null);
        }}
        rows={7}
        placeholder={SAMPLE}
        className="field-input w-full font-mono text-xs"
        spellCheck={false}
        aria-label="List of works"
      />
      <div className="flex flex-wrap items-center gap-2">
        <input ref={file} type="file" accept=".csv,.txt,.tsv,text/plain,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <button type="button" onClick={() => file.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]">
          <Upload size={13} /> Upload a file
        </button>
        <button type="button" onClick={runCheck} disabled={!text.trim() || busy === "check"} className="inline-flex h-8 items-center rounded-sm bg-zam-orange px-4 text-[13px] font-semibold text-white disabled:opacity-40">
          {busy === "check" ? "Checking…" : "Check list"}
        </button>
        <span className="text-xs text-zam-muted">{text.trim() ? `${text.split("\n").filter((l) => l.trim()).length.toLocaleString()} lines` : ""}</span>
        {extra}
        <span className="ml-auto flex items-center gap-2">
          <span className="text-xs text-zam-muted">Or add one work:</span>
          <span className="w-64">
            <WorkPicker value={null} onPick={addOne} />
          </span>
        </span>
      </div>

      {check && (
        <div className="border border-[#d9dde3]">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 bg-[#f5f6f8] px-3 py-2 text-[13px]">
            <b>{check.summary.lines.toLocaleString()} lines read</b>
            <span className="text-zam-green">{check.summary.matched.toLocaleString()} matched</span>
            {check.summary.ambiguous > 0 && <span className="text-[#9a6a00]">{check.summary.ambiguous.toLocaleString()} need a choice</span>}
            {check.summary.notfound > 0 && <span className="text-zam-red">{check.summary.notfound.toLocaleString()} not found</span>}
            {check.summary.already > 0 && <span className="text-zam-muted">{check.summary.already.toLocaleString()} already on the list</span>}
            {check.summary.duplicate > 0 && <span className="text-zam-muted">{check.summary.duplicate.toLocaleString()} repeated</span>}
            <label className="ml-auto flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="h-3.5 w-3.5" /> Show every line
            </label>
          </div>
          {shown.length > 0 && (
            <div className="max-h-96 overflow-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr>
                    <Th>Line</Th>
                    <Th>You wrote</Th>
                    <Th>Result</Th>
                    <Th>Work on the register</Th>
                    <Th className="text-right">Weight</Th>
                  </tr>
                </thead>
                <tbody>
                  {shown.slice(0, 500).map((r) => (
                    <tr key={r.n}>
                      <Td className="text-xs text-zam-muted">{r.n}</Td>
                      <Td className="max-w-[260px] break-words">{r.ref}</Td>
                      <Td className="whitespace-nowrap">
                        {badge(r.status)} <span className="ml-1 text-[11px] text-zam-muted">{label(r.status)}</span>
                      </Td>
                      <Td>
                        {r.status === "ambiguous" ? (
                          <select value={choices[r.n] ?? ""} onChange={(e) => setChoices({ ...choices, [r.n]: e.target.value })} className="field-input h-8 w-full appearance-none bg-white text-xs">
                            <option value="">— choose which work —</option>
                            {r.candidates?.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.title} · {c.wipoId ? `133-${c.wipoId}-W` : ""} · {c.iswc || "no ISWC"} · {c.holders.join(", ") || "no holders"}
                              </option>
                            ))}
                          </select>
                        ) : r.work ? (
                          <span className="text-[13px]">
                            <b>{r.work.title}</b> <span className="text-zam-muted">· {r.work.holders.join(", ") || "no holders"}</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td className="text-right tabular-nums">{r.weight}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {shown.length > 500 && <p className="px-3 py-2 text-xs text-zam-muted">Showing the first 500 of {shown.length.toLocaleString()} lines.</p>}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-[#d9dde3] px-3 py-2">
            <button type="button" onClick={addChecked} disabled={!addable.length || busy === "add"} className="inline-flex h-8 items-center rounded-sm bg-zam-orange px-4 text-[13px] font-semibold text-white disabled:opacity-40">
              {busy === "add" ? "Adding…" : `Add ${addable.length.toLocaleString()} work${addable.length === 1 ? "" : "s"}`}
            </button>
            {problems.length > 0 && (
              <button type="button" onClick={downloadMissing} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]">
                <Download size={13} /> Download the lines that did not match
              </button>
            )}
            <span className="text-xs text-zam-muted">Lines not matched are left out; fix them in the file and check again.</span>
          </div>
        </div>
      )}
    </div>
  );
}
