"use client";

import { useEffect, useState, useCallback } from "react";
import type {
  Member,
  WorkDeclaration,
  SongSubmission,
  AlbumSubmission,
  UploadFile,
  RoyaltySummary,
  Distribution,
  DistributionEntry,
  LicensableWork,
  LicenseRequest,
  LicenseRequestStatus,
  MemberDocument,
  SupportTicket,
} from "@/types";

// A distribution period as seen by admin staff — includes every member's entry,
// published or not (members themselves only ever see published entries).
export interface AdminDistribution extends Distribution {
  entries: DistributionEntry[];
}

interface Overview {
  members: Member[];
  works: WorkDeclaration[];
  singles: SongSubmission[];
  albums: AlbumSubmission[];
  uploads: UploadFile[];
  royalty: RoyaltySummary[];
  distributions: AdminDistribution[];
  licensableWorks: LicensableWork[];
  licenseRequests: LicenseRequest[];
  memberDocuments: MemberDocument[];
  supportTickets: SupportTicket[];
}

const emptyOverview: Overview = {
  members: [],
  works: [],
  singles: [],
  albums: [],
  uploads: [],
  royalty: [],
  distributions: [],
  licensableWorks: [],
  licenseRequests: [],
  memberDocuments: [],
  supportTickets: [],
};

async function postJSON(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

// Fetches the admin overview and exposes a review-status mutator.
export function useAdminData() {
  const [data, setData] = useState<Overview>(emptyOverview);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/overview");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setReviewStatus = useCallback(
    async (kind: "work" | "single" | "album", id: string, status: string, reason?: string) => {
      await fetch("/api/admin/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, status, reason }),
      });
      await load();
    },
    [load]
  );

  // Permanently delete a submission (admin-only — including registered ones).
  const deleteSubmission = useCallback(
    async (kind: "work" | "single" | "album", id: string) => {
      await postJSON("/api/admin/review", { kind, id }, "DELETE");
      await load();
    },
    [load]
  );

  // Approve / reject an uploaded file and notify the owner.
  const setFileStatus = useCallback(
    async (id: string, status: string, reason?: string) => {
      await postJSON("/api/admin/files", { id, status, reason }, "PATCH");
      await load();
    },
    [load]
  );

  // Approve / reject / suspend a member's application and notify them.
  const setMemberStatus = useCallback(
    async (id: string, status: string) => {
      await postJSON("/api/admin/members", { id, status }, "PATCH");
      await load();
    },
    [load]
  );

  // Attach an official document (clearance letter, deed of assignment, etc.).
  const attachDocument = useCallback(
    async (payload: { ownerId: string; docType: string; fileName: string; reference?: string; note?: string }) => {
      const { res, data: d } = await postJSON("/api/admin/member-documents", payload);
      if (!res.ok) return { ok: false as const, error: d.error || "Could not attach document." };
      await load();
      return { ok: true as const };
    },
    [load]
  );

  const removeDocument = useCallback(
    async (id: string) => {
      await postJSON("/api/admin/member-documents", { id }, "DELETE");
      await load();
    },
    [load]
  );

  // Opens a new (draft) distribution period.
  const createDistribution = useCallback(
    async (payload: { periodLabel: string; notes?: string }) => {
      const { res, data: d } = await postJSON("/api/admin/distributions", payload);
      if (!res.ok) return { ok: false as const, error: d.error || "Could not create distribution period." };
      await load();
      return { ok: true as const, item: d.distribution as Distribution };
    },
    [load]
  );

  // Publishes (or reverts) a distribution — the gate that reveals payouts to members.
  const setDistributionStatus = useCallback(
    async (id: string, status: "Draft" | "Published") => {
      await postJSON("/api/admin/distributions", { id, status }, "PATCH");
      await load();
    },
    [load]
  );

  // Creates or updates a member's confirmed payout within a distribution period.
  const saveDistributionEntry = useCallback(
    async (payload: { distributionId: string; ownerId: string; amount: number; currency?: string }) => {
      const { res, data: d } = await postJSON("/api/admin/distributions/entries", payload);
      if (!res.ok) return { ok: false as const, error: d.error || "Could not save entry." };
      await load();
      return { ok: true as const };
    },
    [load]
  );

  // Issues a temporary password for a member (staff-assisted reset). The
  // password is returned exactly once for staff to hand to the verified member.
  const resetMemberPassword = useCallback(async (id: string) => {
    const { res, data: d } = await postJSON("/api/admin/members/reset-password", { id });
    if (!res.ok) return { ok: false as const, error: d.error || "Could not reset password." };
    return { ok: true as const, tempPassword: d.tempPassword as string };
  }, []);

  // Replies to / resolves / reopens a support ticket.
  const setTicketStatus = useCallback(
    async (id: string, status: "Open" | "Resolved", reply?: string) => {
      await postJSON("/api/admin/support", { id, status, reply }, "PATCH");
      await load();
    },
    [load]
  );

  // Logs an inbound licensing enquiry from a business against a listed work.
  const logLicenseEnquiry = useCallback(
    async (payload: {
      workId: string;
      requesterName: string;
      requesterCompany?: string;
      requesterEmail: string;
      usageType: string;
      description?: string;
      proposedFee?: number;
    }) => {
      const { res, data: d } = await postJSON("/api/admin/licensing", payload);
      if (!res.ok) return { ok: false as const, error: d.error || "Could not log enquiry." };
      await load();
      return { ok: true as const };
    },
    [load]
  );

  // Moves an inbound licensing enquiry through the desk's pipeline, optionally
  // attaching the negotiated fee figures.
  const setLicenseRequestStatus = useCallback(
    async (id: string, status: LicenseRequestStatus, fees?: { proposedFee?: number; facilitationFee?: number }) => {
      await postJSON("/api/admin/licensing", { id, status, ...fees }, "PATCH");
      await load();
    },
    [load]
  );

  return {
    ...data,
    loading,
    setReviewStatus,
    deleteSubmission,
    setFileStatus,
    setMemberStatus,
    attachDocument,
    removeDocument,
    createDistribution,
    setDistributionStatus,
    saveDistributionEntry,
    setLicenseRequestStatus,
    resetMemberPassword,
    setTicketStatus,
    logLicenseEnquiry,
    reload: load,
  };
}
