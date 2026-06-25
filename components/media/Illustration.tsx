import React from "react";
import { Disc3, AudioWaveform, Coins, Inbox, UploadCloud, FileText } from "lucide-react";

// Real-icon spot marker for empty states (replaces the previous hand-drawn SVG
// illustrations). Keeps the same `name`/`size` API so call sites are unchanged.
type Name = "vinyl" | "waveform" | "royalty" | "inbox" | "upload" | "works";

const icons: Record<Name, React.ComponentType<{ size?: number }>> = {
  vinyl: Disc3,
  waveform: AudioWaveform,
  royalty: Coins,
  inbox: Inbox,
  upload: UploadCloud,
  works: FileText,
};

export function Illustration({ name, size = 132 }: { name: Name; size?: number }) {
  const Icon = icons[name] ?? Inbox;
  const tile = Math.round(size * 0.62);
  return (
    <span
      className="inline-grid place-items-center rounded-2xl bg-zam-orange-soft text-zam-orange"
      style={{ width: tile, height: tile }}
      aria-hidden
    >
      <Icon size={Math.round(tile * 0.5)} />
    </span>
  );
}
