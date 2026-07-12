"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { MemberSidebar } from "@/components/member/MemberSidebar";
import { MemberTopbar } from "@/components/member/MemberTopbar";
import { MemberBottomBar } from "@/components/member/MemberBottomBar";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/application": "Membership Application",
  "/documents": "My Documents",
  "/works": "My Works",
  "/submit": "Submit",
  "/uploads": "Music Uploads",
  "/royalties": "Royalties",
  "/statements": "Statements & Receipts",
  "/notifications": "Notifications",
  "/profile": "Profile & KYC",
  "/support": "Support",
  "/settings": "Settings",
  "/licensing": "Licensing",
};

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const { ready, currentMember } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (ready && !currentMember) router.replace("/login");
  }, [ready, currentMember, router]);

  // Close the drawer on navigation.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (!ready || !currentMember) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-zam-canvas">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-zam-line border-t-zam-orange" />
      </div>
    );
  }

  const base = "/" + (pathname.split("/")[1] || "");
  const breadcrumb = titles[base] || "Dashboard";

  return (
    <div className="flex min-h-[100dvh] bg-zam-canvas">
      <MemberSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MemberTopbar breadcrumb={breadcrumb} onMenu={() => setSidebarOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">{children}</main>
        <MemberBottomBar />
      </div>
    </div>
  );
}

// Reusable member page header (ported from the reference).
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-zam-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zam-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
