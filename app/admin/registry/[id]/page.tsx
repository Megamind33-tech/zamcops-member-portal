"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";

type Ident = { code: string; label: string; value: string };
type Share = {
  id: string;
  workId: string;
  rightHolderId: string | null;
  roleCode: string;
  isPublisher: boolean;
  rightType: string;
  share: number;
  territoryFormula: string;
  rightHolder: { id: string; displayName: string; ipiNumber: string; memberId: string | null } | null;
};
type Detail = {
  work: {
    id: string;
    wipoId: string;
    title: string;
    alternativeTitles: string[];
    status: string;
    registeredAt: string;
    domestic: boolean;
    iswc: string;
    isrc: string;
    identifiers: Ident[];
    genre: string;
    dates: { code: string; value: string; territory: string }[];
    extra: Record<string, string>;
    notes: string;
    editedAt: string | null;
    declarationId: string | null;
  };
  shares: Share[];
  lines: {
    id: string;
    amount: number;
    total: number;
    adminFee: number;
    reserved: number;
    disputed: boolean;
    roleCode: string;
    rightType: string;
    distribution: { id: string; periodLabel: string; code: string; status: string };
    rightHolder: { id: string; displayName: string } | null;
  }[];
  history: { id: string; adminName: string; action: string; summary: string; createdAt: string }[];
  statuses: string[];
};

const TABS = ["Main", "Ownership", "Distributions", "History"] as const;
type Tab = (typeof TABS)[number];

const input = "field-input h-10 w-full";

async function send(url: string, method: string, body: unknown) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.error ?? "That did not work.");
  return b;
}

export default function WorkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<Tab>("Main");

  const load = useCallback(() => {
    fetch(`/api/admin/register/works/${id}`)
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error ?? "Could not load this work.");
        setD(b);
      })
      .catch((e) => setErr(e.message));
  }, [id]);
  useEffect(load, [load]);

  if (err) return <p className="rounded-xl bg-zam-red/10 px-4 py-3 text-sm text-zam-red">{err}</p>;
  if (!d) return <p className="text-sm text-zam-muted">Loading…</p>;
  const w = d.work;

  return (
    <div>
      <Link
        href="/admin/registry"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-zam-muted hover:text-zam-ink"
      >
        <ArrowLeft size={14} /> Works Registry
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zam-ink">{w.title}</h1>
          <p className="text-sm text-zam-muted">
            WIPO {w.wipoId}
            {w.iswc && ` · ${w.iswc}`}
            {w.editedAt && ` · edited ${new Date(w.editedAt).toLocaleDateString()}`}
          </p>
        </div>
        {w.status && <StatusBadge status={w.status === "REGISTERED" ? "Active" : w.status} />}
      </div>

      <div className="mb-5 inline-flex rounded-xl border border-zam-line bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "rounded-lg px-4 py-2 text-sm font-semibold transition-colors " +
              (tab === t ? "bg-zam-orange text-white" : "text-zam-muted hover:text-zam-ink")
            }
          >
            {t}
            {t === "Ownership" && ` (${d.shares.length})`}
            {t === "Distributions" && ` (${d.lines.length})`}
          </button>
        ))}
      </div>

      {tab === "Main" && <MainTab d={d} onSaved={load} />}
      {tab === "Ownership" && <OwnershipTab d={d} onSaved={load} />}
      {tab === "Distributions" && <DistributionsTab d={d} />}
      {tab === "History" && <HistoryTab d={d} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-zam-muted">{label}</span>
      {children}
    </label>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
function MainTab({ d, onSaved }: { d: Detail; onSaved: () => void }) {
  const w = d.work;
  const [title, setTitle] = useState(w.title);
  const [alts, setAlts] = useState<string[]>(w.alternativeTitles);
  const [status, setStatus] = useState(w.status);
  const [genre, setGenre] = useState(w.genre);
  const [registeredAt, setRegisteredAt] = useState(w.registeredAt);
  const [domestic, setDomestic] = useState(w.domestic);
  const [notes, setNotes] = useState(w.notes);
  const [ids, setIds] = useState<Ident[]>(w.identifiers);
  const [busy, setBusy] = useState(false);

  const dirty =
    title !== w.title ||
    status !== w.status ||
    genre !== w.genre ||
    registeredAt !== w.registeredAt ||
    domestic !== w.domestic ||
    notes !== w.notes ||
    JSON.stringify(alts.filter(Boolean)) !== JSON.stringify(w.alternativeTitles) ||
    JSON.stringify(ids) !== JSON.stringify(w.identifiers);

  const save = async () => {
    setBusy(true);
    try {
      const r = await send(`/api/admin/register/works/${w.id}`, "PATCH", {
        title,
        alternativeTitles: alts,
        status,
        genre,
        registeredAt,
        domestic,
        notes,
        identifiers: ids.filter((i) => i.code && i.value),
      });
      toast.success(r.changed?.length ? `Saved: ${r.changed.join(", ")}.` : "Nothing had changed.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const statuses = [...new Set([...d.statuses, w.status].filter(Boolean))];

  return (
    <div className="space-y-5">
      <Panel
        title="Work"
        right={
          <button
            onClick={save}
            disabled={!dirty || busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-zam-orange px-3.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Save size={14} /> {busy ? "Saving…" : "Save changes"}
          </button>
        }
      >
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Title">
              <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} />
            </Field>
          </div>
          <Field label="Status">
            <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Genre">
            <input className={input} value={genre} onChange={(e) => setGenre(e.target.value)} maxLength={80} />
          </Field>
          <Field label="Registration date">
            <input className={input} type="date" value={registeredAt} onChange={(e) => setRegisteredAt(e.target.value)} />
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm font-medium text-zam-ink">
            <input type="checkbox" checked={domestic} onChange={(e) => setDomestic(e.target.checked)} /> Domestic repertoire
          </label>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea
                className="field-input min-h-[80px] w-full py-2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
              />
            </Field>
          </div>
        </div>
      </Panel>

      <Panel
        title={`Other titles (${alts.length})`}
        right={
          <button onClick={() => setAlts([...alts, ""])} className="inline-flex items-center gap-1 text-xs font-semibold text-zam-orange">
            <Plus size={14} /> Add title
          </button>
        }
      >
        <ul className="divide-y divide-zam-line">
          {alts.map((t, i) => (
            <li key={i} className="flex items-center gap-2 px-5 py-2.5">
              <input
                className={input}
                value={t}
                onChange={(e) => setAlts(alts.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder="Alternative title"
              />
              <button
                onClick={() => setAlts(alts.filter((_, j) => j !== i))}
                className="text-zam-muted hover:text-zam-red"
                aria-label="Remove title"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
          {alts.length === 0 && <li className="px-5 py-3 text-sm text-zam-muted">No other titles.</li>}
        </ul>
      </Panel>

      <Panel
        title={`Identifiers (${ids.length})`}
        right={
          <button
            onClick={() => setIds([...ids, { code: "ISWC", label: "ISWC", value: "" }])}
            className="inline-flex items-center gap-1 text-xs font-semibold text-zam-orange"
          >
            <Plus size={14} /> Add identifier
          </button>
        }
      >
        <ul className="divide-y divide-zam-line">
          {ids.map((it, i) => (
            <li key={i} className="flex items-center gap-2 px-5 py-2.5">
              <input
                className="field-input h-10 w-36 uppercase"
                value={it.code}
                onChange={(e) => setIds(ids.map((x, j) => (j === i ? { ...x, code: e.target.value, label: e.target.value } : x)))}
                placeholder="Type"
              />
              <input
                className="field-input h-10 flex-1 font-mono text-sm"
                value={it.value}
                onChange={(e) => setIds(ids.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                placeholder={it.code === "ISWC" ? "T-123.456.789-0" : it.code === "ISRC" ? "ZMABC2400001" : "Value"}
              />
              <button
                onClick={() => setIds(ids.filter((_, j) => j !== i))}
                className="text-zam-muted hover:text-zam-red"
                aria-label="Remove identifier"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
          {ids.length === 0 && <li className="px-5 py-3 text-sm text-zam-muted">No identifiers.</li>}
        </ul>
        <p className="border-t border-zam-line px-5 py-2 text-[11px] text-zam-muted">
          ISWC and ISRC codes are checked for the right shape when you save.
        </p>
      </Panel>

      {(w.dates.length > 0 || Object.keys(w.extra).length > 0) && (
        <Panel title="Other details from WIPO Connect">
          <dl className="grid gap-x-8 px-5 py-3 sm:grid-cols-2">
            {w.dates.map((dt, i) => (
              <div key={i} className="flex justify-between gap-4 border-b border-zam-line/60 py-2 text-sm">
                <dt className="text-zam-muted">
                  Date {dt.code}
                  {dt.territory && ` (${dt.territory})`}
                </dt>
                <dd className="font-medium">{dt.value || "—"}</dd>
              </div>
            ))}
            {Object.entries(w.extra).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-zam-line/60 py-2 text-sm">
                <dt className="text-zam-muted">{k}</dt>
                <dd className="font-medium">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}
    </div>
  );
}

// ── Ownership ───────────────────────────────────────────────────────────────
type HolderHit = { id: string; displayName: string; ipiNumber: string };

function HolderPicker({ onPick }: { onPick: (h: HolderHit) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<HolderHit[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/admin/register/holders?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((b) => setHits((b.holders ?? []).slice(0, 8)))
        .catch(() => setHits([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="relative">
      <input className="field-input h-10 w-72" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a right-holder to add…" />
      {hits.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-96 overflow-auto rounded-xl border border-zam-line bg-white shadow-lg">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                className="flex w-full justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-zam-canvas"
                onClick={() => {
                  onPick(h);
                  setQ("");
                  setHits([]);
                }}
              >
                <span className="font-medium">{h.displayName}</span>
                <span className="font-mono text-xs text-zam-muted">{h.ipiNumber || "no IPI"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Draft = {
  key: string;
  id?: string;
  rightHolderId: string;
  name: string;
  ipi: string;
  roleCode: string;
  rightType: string;
  share: string;
  territoryFormula: string;
  isPublisher: boolean;
};

function OwnershipTab({ d, onSaved }: { d: Detail; onSaved: () => void }) {
  const fromServer = useCallback(
    (): Draft[] =>
      d.shares.map((s) => ({
        key: s.id,
        id: s.id,
        rightHolderId: s.rightHolderId ?? "",
        name: s.rightHolder?.displayName ?? "(not on the register)",
        ipi: s.rightHolder?.ipiNumber ?? "",
        roleCode: s.roleCode,
        rightType: s.rightType,
        share: String(s.share),
        territoryFormula: s.territoryFormula,
        isPublisher: s.isPublisher,
      })),
    [d.shares],
  );
  const [rows, setRows] = useState<Draft[]>(fromServer);
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setRows(fromServer());
    setRemoved([]);
  }, [fromServer]);

  const original = useMemo(() => JSON.stringify(fromServer()), [fromServer]);
  const dirty = removed.length > 0 || JSON.stringify(rows) !== original;

  const patch = (key: string, p: Partial<Draft>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  // sum of shares per territory view and right type — a quick check the key adds up
  const sums = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = `${r.territoryFormula || "all territories"} · ${r.rightType || "no right type"}`;
      m.set(k, (m.get(k) ?? 0) + (Number(r.share) || 0));
    }
    return [...m.entries()];
  }, [rows]);

  const save = async () => {
    setBusy(true);
    try {
      await send(`/api/admin/register/works/${d.work.id}/shares`, "POST", {
        remove: removed,
        upsert: rows.map((r) => ({
          id: r.id,
          rightHolderId: r.rightHolderId,
          roleCode: r.roleCode,
          rightType: r.rightType,
          share: Number(r.share),
          territoryFormula: r.territoryFormula,
          isPublisher: r.isPublisher,
        })),
      });
      toast.success("Ownership saved.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Panel
        title={`Ownership view (${rows.length})`}
        right={
          <div className="flex items-center gap-2">
            <HolderPicker
              onPick={(h) =>
                setRows((rs) => [
                  ...rs,
                  {
                    key: `new-${Date.now()}`,
                    rightHolderId: h.id,
                    name: h.displayName,
                    ipi: h.ipiNumber,
                    roleCode: "CA",
                    rightType: rs[0]?.rightType ?? "",
                    share: "0",
                    territoryFormula: rs[0]?.territoryFormula ?? "",
                    isPublisher: false,
                  },
                ])
              }
            />
            <button
              onClick={save}
              disabled={!dirty || busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-zam-orange px-3.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Save size={14} /> {busy ? "Saving…" : "Save ownership"}
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-zam-line bg-zam-canvas/60">
                <Th>Right owner</Th>
                <Th>IPI</Th>
                <Th>Role</Th>
                <Th>Right</Th>
                <Th>Territory</Th>
                <Th className="text-right">Share</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-zam-line">
              {rows.map((r) => (
                <tr key={r.key}>
                  <Td>
                    {r.rightHolderId ? (
                      <Link href={`/admin/register/${r.rightHolderId}`} className="font-semibold hover:text-zam-orange">
                        {r.name}
                      </Link>
                    ) : (
                      r.name
                    )}
                    {r.isPublisher && <span className="ml-2 text-[11px] text-zam-muted">publisher</span>}
                  </Td>
                  <Td className="font-mono text-xs">{r.ipi || "—"}</Td>
                  <Td>
                    <input
                      className="field-input h-9 w-20 uppercase"
                      value={r.roleCode}
                      onChange={(e) => patch(r.key, { roleCode: e.target.value })}
                    />
                  </Td>
                  <Td>
                    <input
                      className="field-input h-9 w-24"
                      value={r.rightType}
                      onChange={(e) => patch(r.key, { rightType: e.target.value })}
                    />
                  </Td>
                  <Td>
                    <input
                      className="field-input h-9 w-32"
                      value={r.territoryFormula}
                      onChange={(e) => patch(r.key, { territoryFormula: e.target.value })}
                    />
                  </Td>
                  <Td className="text-right">
                    <input
                      className="field-input h-9 w-24 text-right tabular-nums"
                      type="number"
                      min={0}
                      step="any"
                      value={r.share}
                      onChange={(e) => patch(r.key, { share: e.target.value })}
                    />
                  </Td>
                  <Td className="text-right">
                    <button
                      onClick={() => {
                        if (r.id) setRemoved((x) => [...x, r.id!]);
                        setRows((rs) => rs.filter((x) => x.key !== r.key));
                      }}
                      className="text-zam-muted hover:text-zam-red"
                      aria-label="Remove share"
                    >
                      <Trash2 size={15} />
                    </button>
                  </Td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <Td colSpan={7} className="py-8 text-center text-zam-muted">
                    No ownership on this work yet. Find a right-holder above to add one.
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {sums.length > 0 && (
          <div className="border-t border-zam-line px-5 py-3 text-xs text-zam-muted">
            <p className="mb-1 font-bold uppercase tracking-wider">Total share by territory and right</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-1">
              {sums.map(([k, v]) => (
                <li key={k}>
                  {k}:{" "}
                  <span className={"font-semibold tabular-nums " + (Math.abs(v - 100) < 0.01 ? "text-zam-green" : "text-zam-ink")}>
                    {Math.round(v * 1000) / 1000}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ── Distributions ───────────────────────────────────────────────────────────
function DistributionsTab({ d }: { d: Detail }) {
  const total = d.lines.reduce((s, l) => s + l.amount, 0);
  return (
    <Panel
      title={`Allocated in distributions (${d.lines.length})`}
      right={<span className="text-xs text-zam-muted">Total {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-zam-line bg-zam-canvas/60">
              <Th>Distribution</Th>
              <Th>Right owner</Th>
              <Th>Role</Th>
              <Th>Right</Th>
              <Th className="text-right">Amount</Th>
              <Th className="text-right">Fee</Th>
              <Th className="text-right">Reserved</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zam-line">
            {d.lines.map((l) => (
              <tr key={l.id}>
                <Td>
                  <Link href={`/admin/distributions/${l.distribution.id}`} className="font-semibold hover:text-zam-orange">
                    {l.distribution.periodLabel}
                  </Link>
                </Td>
                <Td>
                  {l.rightHolder ? (
                    <Link href={`/admin/register/${l.rightHolder.id}`} className="hover:text-zam-orange">
                      {l.rightHolder.displayName}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>{l.roleCode || "—"}</Td>
                <Td>{l.rightType || "—"}</Td>
                <Td className="text-right tabular-nums">{l.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Td>
                <Td className="text-right tabular-nums">{l.adminFee.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Td>
                <Td className="text-right tabular-nums">
                  {l.reserved.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  {l.disputed && " ⚠"}
                </Td>
              </tr>
            ))}
            {d.lines.length === 0 && (
              <tr>
                <Td colSpan={7} className="py-8 text-center text-zam-muted">
                  This work has not been allocated in any distribution.
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ── History ─────────────────────────────────────────────────────────────────
function HistoryTab({ d }: { d: Detail }) {
  return (
    <Panel title="Edits made in the portal">
      <ul className="divide-y divide-zam-line">
        {d.history.map((h) => (
          <li key={h.id} className="px-5 py-3 text-sm">
            <p className="font-medium text-zam-ink">{h.summary || h.action}</p>
            <p className="text-xs text-zam-muted">
              {h.adminName} · {new Date(h.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
        {d.history.length === 0 && (
          <li className="px-5 py-4 text-sm text-zam-muted">No edits have been made to this work in the portal.</li>
        )}
      </ul>
    </Panel>
  );
}
