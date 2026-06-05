"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminAuth } from "@/lib/adminAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { authed } = useAdminAuth();
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (authed === false && !isLogin) router.replace("/admin/login");
  }, [authed, isLogin, router]);

  // The login page renders without the shell.
  if (isLogin) return <>{children}</>;

  if (authed === null || authed === false) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-slate-100">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
