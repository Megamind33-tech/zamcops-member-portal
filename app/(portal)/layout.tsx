import React from "react";

// The portal renders full-bleed, responsive surfaces. Auth, splash, onboarding
// and the member app each own their own layout, so this is a pass-through.
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh] bg-zam-canvas">{children}</div>;
}
