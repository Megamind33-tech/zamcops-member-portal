"use client";

import { useCallback, useEffect, useState } from "react";

// Whether the portal can be installed to the home screen, and the means to ask.
//
// Chrome shows its own install bar once and then suppresses it for months, which
// is why members saw the invitation a single time and could never find it again.
// The bar is the browser's; the event behind it is ours to keep. Calling
// preventDefault() on `beforeinstallprompt` stops the one-shot bar and hands us
// the event, so the portal can offer installing wherever and whenever it likes.
//
// The event is single-use: once prompt() has been called it is spent. Chrome
// fires a fresh one on each load while the app is installable and not yet
// installed, so a member who declines is asked again next visit rather than
// never again.
//
// iOS has no such event at all — Safari installs only through its own Share
// menu — so there the portal explains the steps instead of offering a button
// that could not work.

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export interface InstallPrompt {
  /** A real prompt can be shown — Chrome, Edge, Samsung Internet, Android. */
  canInstall: boolean;
  /** iOS Safari: no prompt exists, so the Share-menu steps are shown instead. */
  showIosSteps: boolean;
  /** Already running as an installed app — nothing to offer. */
  installed: boolean;
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true;
}

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua);
  // Chrome and Firefox on iOS cannot install either, and say so in the UA.
  return ios && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function useInstallPrompt(): InstallPrompt {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIosSafari());

    const onPrompt = (e: Event) => {
      e.preventDefault(); // suppress the browser's own one-shot bar
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!event) return "unavailable" as const;
    await event.prompt();
    const { outcome } = await event.userChoice;
    // Spent either way — a fresh one arrives on the next load if still uninstalled.
    setEvent(null);
    return outcome;
  }, [event]);

  return {
    canInstall: !installed && !!event,
    showIosSteps: !installed && ios,
    installed,
    install,
  };
}
