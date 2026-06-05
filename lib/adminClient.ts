"use client";

import { useEffect, useState, useCallback } from "react";
import type {
  Member,
  WorkDeclaration,
  SongSubmission,
  AlbumSubmission,
  UploadFile,
  RoyaltySummary,
} from "@/types";

interface Overview {
  members: Member[];
  works: WorkDeclaration[];
  singles: SongSubmission[];
  albums: AlbumSubmission[];
  uploads: UploadFile[];
  royalty: RoyaltySummary[];
}

const emptyOverview: Overview = {
  members: [],
  works: [],
  singles: [],
  albums: [],
  uploads: [],
  royalty: [],
};

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
    async (kind: "work" | "single" | "album", id: string, status: string) => {
      await fetch("/api/admin/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, status }),
      });
      await load();
    },
    [load]
  );

  return { ...data, loading, setReviewStatus, reload: load };
}
