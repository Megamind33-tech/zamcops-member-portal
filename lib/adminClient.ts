"use client";

import { createContext, createElement, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { toast } from "sonner";
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
  lineCount?: number; // allocation lines carried by an imported WIPO run
  lineAmount?: number;
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

// A write whose failure the staff member must hear about — a silent failure
// looks exactly like success until the page is reloaded.
async function mutate(url: string, body: unknown, method: string, failure: string) {
  const { res, data } = await postJSON(url, body, method);
  if (!res.ok) toast.error((data as { error?: string }).error || failure);
  return res.ok;
}

// One shared copy of the admin overview for the whole staff console. Every
// page and the shell read the same state, so moving between pages doesn't
// download every member, upload and submission again (and twice over), and a
// change made on one screen shows on all of them.
function useAdminDataState() {
  const [data, setData] = useState<Overview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) throw new Error(`The server answered ${res.status}.`);
      setData(await res.json());
      setError("");
    } catch (e) {
      // keep whatever we already had on screen; just say the refresh failed
      setError(e instanceof Error ? e.message : "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setReviewStatus = useCallback(
    async (kind: "work" | "single" | "album", id: string, status: string, reason?: string) => {
      const { res, data } = await postJSON("/api/admin/review", { kind, id, status, reason }, "PATCH");
      if (!res.ok) toast.error(data.error || "Could not update this submission.");
      // Approving a work also issues the submission's clearance letter,
      // and admits the member if it is their first. If that
      // part failed the decision still stands, so staff are told what to fix
      // rather than left thinking the documents were filed.
      else if (data.warning) toast.warning(data.warning);
      await load();
    },
    [load]
  );

  // Re-issue a submission's clearance letter — after the member
  // adds a missing signature, after a new official signature is uploaded, or
  // after staff amend the particulars of the work.
  const reissueWorkDocuments = useCallback(
    async (id: string) => {
      const { res, data } = await postJSON("/api/admin/review", { kind: "work", id, action: "reissue" });
      if (res.ok) toast.success("Declaration and letter re-issued to the member's documents.");
      else toast.error(data.error || "Could not re-issue the documents.");
      await load();
    },
    [load]
  );

  // Complete a work's distribution key (shares per contributor) and its file
  // number / factor — the office's own boxes on the declaration.
  const updateWorkSplits = useCallback(
    async (id: string, payload: Record<string, unknown>) => {
      const { res, data: d } = await postJSON(`/api/admin/works/${id}`, payload, "PATCH");
      if (!res.ok) return { ok: false as const, error: d.error || "Could not save these particulars." };
      await load();
      return { ok: true as const };
    },
    [load]
  );

  // Permanently delete a submission (admin-only — including registered ones).
  const deleteSubmission = useCallback(
    async (kind: "work" | "single" | "album", id: string) => {
      await mutate("/api/admin/review", { kind, id }, "DELETE", "Could not delete this submission.");
      await load();
    },
    [load]
  );

  // Approve / reject an uploaded file and notify the owner.
  const setFileStatus = useCallback(
    async (id: string, status: string, reason?: string) => {
      await mutate("/api/admin/files", { id, status, reason }, "PATCH", "Could not update this file.");
      await load();
    },
    [load]
  );

  // Approve / reject / suspend a member's application and notify them.
  const setMemberStatus = useCallback(
    async (id: string, status: string) => {
      await mutate("/api/admin/members", { id, status }, "PATCH", "Could not update this member.");
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
      await mutate("/api/admin/member-documents", { id }, "DELETE", "Could not remove this document.");
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
      await mutate("/api/admin/distributions", { id, status }, "PATCH", "Could not change this distribution.");
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
      await mutate("/api/admin/support", { id, status, reply }, "PATCH", "Could not update this ticket.");
      await load();
    },
    [load]
  );

  // Staff-composed in-app notice to one member or a broadcast audience.
  const sendNotice = useCallback(
    async (payload: {
      title: string;
      message: string;
      href?: string;
      audience: "one" | "active" | "all";
      memberId?: string;
    }) => {
      const { res, data: d } = await postJSON("/api/admin/notices", payload);
      if (!res.ok) return { ok: false as const, error: (d.error as string) || "Could not send notice." };
      return { ok: true as const, sent: d.sent as number };
    },
    [],
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
      await mutate("/api/admin/licensing", { id, status, ...fees }, "PATCH", "Could not update this enquiry.");
      await load();
    },
    [load]
  );

  return {
    ...data,
    loading,
    error,
    setReviewStatus,
    reissueWorkDocuments,
    updateWorkSplits,
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
    sendNotice,
    logLicenseEnquiry,
    reload: load,
  };
}

type AdminData = ReturnType<typeof useAdminDataState>;
const AdminDataContext = createContext<AdminData | null>(null);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const value = useAdminDataState();
  return createElement(AdminDataContext.Provider, { value }, children);
}

export function useAdminData(): AdminData {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error("useAdminData must be used inside <AdminDataProvider>.");
  return ctx;
}
