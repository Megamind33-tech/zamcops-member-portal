"use client";

// My Documents — the member's official file: the PDFs generated at approval
// (application form, signed Deed of Assignment, admission letter) plus any
// documents staff attach. Downloads unlock once membership is approved.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, FileDown, Lock, ScrollText, BadgeCheck, ClipboardList } from "lucide-react";
import { PageHeader } from "../layout";
import { Card } from "@/components/zam/Card";
import { Button } from "@/components/zam/Button";
import { formatDate } from "@/lib/format";
import type { MemberDocument } from "@/types";

const DOC_ICON: Record<string, React.ReactNode> = {
  "Membership Application": <ClipboardList size={18} />,
  "Deed of Assignment": <ScrollText size={18} />,
  "Admission Letter": <BadgeCheck size={18} />,
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [canDownload, setCanDownload] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/member/documents");
      if (res.ok) {
        const d = await res.json();
        setDocuments(d.documents);
        setCanDownload(d.canDownload);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <PageHeader
        title="My Documents"
        subtitle="Your official ZAMCOPS documents — application form, Deed of Assignment, admission letter and anything staff add to your file."
      />

      {!loading && !canDownload && (
        <Card className="mb-4 flex items-center gap-4 border-zam-amber/40 bg-zam-amber/5 p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-zam-amber shadow-sm">
            <Lock size={20} />
          </span>
          <div>
            <p className="font-display text-sm font-bold text-zam-ink">Downloads unlock after approval</p>
            <p className="mt-0.5 text-sm text-zam-muted">
              Your documents become downloadable once ZAMCOPS approves your membership.{" "}
              <Link href="/application" className="font-semibold text-zam-orange hover:underline">
                Check your application status
              </Link>
              .
            </p>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="grid h-48 place-items-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-zam-line border-t-zam-orange" />
        </div>
      ) : documents.length === 0 ? (
        <Card className="p-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-zam-canvas text-zam-muted">
            <FileText size={24} />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold text-zam-ink">No documents yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-zam-muted">
            Complete and submit your membership application — once it is approved, your signed application form, Deed
            of Assignment and admission letter will appear here.
          </p>
          <Link href="/application" className="mt-5 inline-block">
            <Button>Go to Membership Application</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {documents.map((d) => (
            <Card key={d.id} className="flex items-center gap-4 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-zam-orange-soft text-zam-orange">
                {DOC_ICON[d.docType] ?? <FileText size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-zam-ink">{d.docType}</p>
                <p className="truncate text-xs text-zam-muted">
                  {d.reference ? `${d.reference} · ` : ""}
                  {formatDate(d.uploadedAt)}
                </p>
                {d.note && <p className="mt-0.5 truncate text-xs text-zam-muted">{d.note}</p>}
              </div>
              {d.hasFile ? (
                canDownload ? (
                  <a href={`/api/member/documents/${d.id}`} download>
                    <Button variant="secondary" size="sm" icon={<FileDown size={15} />}>
                      Download
                    </Button>
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-zam-canvas px-3 py-2 text-xs font-semibold text-zam-muted">
                    <Lock size={13} /> Locked
                  </span>
                )
              ) : (
                <span className="text-xs text-zam-muted">On file</span>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
