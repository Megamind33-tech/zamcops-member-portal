import React from "react";

// Auth, splash and onboarding own their own full-bleed backgrounds.
// Do not paint the cream canvas here — it flashes under the photo on load.
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
