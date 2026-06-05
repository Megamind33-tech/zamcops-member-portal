"use client";

import React from "react";
import { Download, PieChart, BarChart3 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel } from "@/components/admin/widgets";
import { useAdminData } from "@/lib/adminClient";
import { formatKwacha } from "@/lib/format";

export default function AdminReportsPage() {
  const { works, singles, albums, members, royalty } = useAdminData();

  const reviewBreakdown = (items: { status: string }[]) => {
    const b = { Approved: 0, Pending: 0, Rejected: 0, "Under Review": 0 } as Record<string, number>;
    items.forEach((i) => (b[i.status] = (b[i.status] ?? 0) + 1));
    return b;
  };

  const works$ = reviewBreakdown(works);
  const songs$ = reviewBreakdown(singles);
  const albums$ = reviewBreakdown(albums);
  const totalEstimated = royalty.reduce((s, r) => s + r.totalEstimated, 0);

  const reports = [
    { title: "Membership Register", desc: `${members.length} members`, ref: "RPT-MEM-2026" },
    { title: "Repertoire Report", desc: `${works.length} works · ${singles.length} singles · ${albums.length} albums`, ref: "RPT-REP-2026" },
    { title: "Royalty Distribution Report", desc: `${formatKwacha(totalEstimated)} estimated`, ref: "RPT-ROY-2026-Q1" },
  ];

  const download = (title: string, ref: string, body: string) => {
    const blob = new Blob([`ZAMCOPS Staff Report\n${title}\nReference: ${ref}\n\n${body}`], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ref}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <AdminHeader title="Reports" subtitle="Generate and download operational reports" />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Breakdown title="Work declarations" data={works$} icon={<PieChart size={16} />} />
        <Breakdown title="Song submissions" data={songs$} icon={<BarChart3 size={16} />} />
        <Breakdown title="Album submissions" data={albums$} icon={<PieChart size={16} />} />
      </div>

      <Panel title="Downloadable reports">
        <div className="divide-y divide-slate-100">
          {reports.map((r) => (
            <div key={r.ref} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                <p className="text-xs text-slate-500">
                  {r.desc} · <span className="font-mono">{r.ref}</span>
                </p>
              </div>
              <button
                onClick={() => download(r.title, r.ref, r.desc)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
              >
                <Download size={14} /> Download
              </button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Breakdown({
  title,
  data,
  icon,
}: {
  title: string;
  data: Record<string, number>;
  icon: React.ReactNode;
}) {
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
  const colors: Record<string, string> = {
    Approved: "bg-emerald-500",
    Pending: "bg-amber-500",
    "Under Review": "bg-blue-500",
    Rejected: "bg-red-500",
  };
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-800">
        {icon} {title}
      </h3>
      <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        {Object.entries(data).map(([k, v]) =>
          v > 0 ? <span key={k} className={colors[k]} style={{ width: `${(v / total) * 100}%` }} /> : null
        )}
      </div>
      <div className="space-y-1.5">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className={"h-2 w-2 rounded-full " + (colors[k] ?? "bg-slate-300")} /> {k}
            </span>
            <span className="font-semibold text-slate-900">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
