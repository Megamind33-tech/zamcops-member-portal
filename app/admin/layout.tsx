"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminAuthProvider, useAdminAuth } from "@/lib/adminAuth";

function AdminGuard({ children }: { children: React.ReactNode }) {
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
      <div className="grid min-h-[100dvh] place-items-center bg-night-950">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-brand-400" />
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // The provider wraps both the login page and the guard so a successful login
  // updates the same auth state the guard reads — no stale bounce.
  return (
    <AdminAuthProvider>
      <AdminGuard>{children}</AdminGuard>
    </AdminAuthProvider>
  );
}
