"use client";

import React, { useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

// Two ways into the same thing, because the browser's own invitation appears
// once and is then suppressed for months. The sidebar entry is permanent, so a
// member who missed or declined the invitation can always find it; the banner
// gives it the prominence the browser's bar used to, and can be dismissed
// without taking the permanent entry away with it.

const IOS_STEPS = "On iPhone: tap Share, then Add to Home Screen.";

/** Always present in the sidebar while the portal can still be installed. */
export function InstallAppButton() {
  const { canInstall, showIosSteps, install } = useInstallPrompt();
  const [busy, setBusy] = useState(false);

  if (showIosSteps) {
    return (
      <p className="flex items-start gap-2 px-3 py-2 text-xs text-zam-muted">
        <Share className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <span className="font-semibold text-zam-ink">Install the app</span>
          <br />
          Tap <Share className="inline h-3 w-3" /> Share, then{" "}
          <Plus className="inline h-3 w-3" /> Add to Home Screen.
        </span>
      </p>
    );
  }

  if (!canInstall) return null;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await install();
        setBusy(false);
      }}
      className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-zam-orange transition-colors hover:bg-zam-orange-soft disabled:opacity-60"
    >
      <Download className="h-[18px] w-[18px]" />
      <span className="flex-1 text-left">{busy ? "Installing…" : "Install the app"}</span>
    </button>
  );
}

/** A prominent, dismissible invitation at the top of the member area. */
export function InstallAppBanner() {
  const { canInstall, showIosSteps, install } = useInstallPrompt();
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);

  if (hidden || (!canInstall && !showIosSteps)) return null;

  return (
    <div className="mx-auto mt-4 w-full max-w-[1400px] px-4 lg:px-8">
      <div className="flex items-center gap-3 rounded-2xl border border-zam-orange/30 bg-zam-orange-soft px-4 py-3 text-sm text-zam-ink">
        <Download size={17} className="shrink-0 text-zam-orange" />
        <span className="flex-1">
          <strong>Install ZAMCOPS on your phone</strong> — open the portal from your home screen like any other app.
          {showIosSteps && <> {IOS_STEPS}</>}
        </span>
        {canInstall && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const outcome = await install();
              setBusy(false);
              if (outcome === "accepted") setHidden(true);
            }}
            className="shrink-0 rounded-xl bg-zam-orange px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zam-orange-dark disabled:opacity-60"
          >
            {busy ? "Installing…" : "Install"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label="Hide this for now"
          className="shrink-0 rounded-lg p-1 text-zam-muted transition hover:text-zam-ink"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
