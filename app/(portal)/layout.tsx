import React from "react";

// Phone-width column shared by the splash, onboarding, auth and member screens.
// On wider viewports it presents as a centered app surface, keeping the
// experience mobile-first rather than stretching to a desktop layout.
export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-app flex-col app-frame">
      {children}
    </div>
  );
}
