import React from "react";
import { twMerge } from "tailwind-merge";

export function TableShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={twMerge(
        "overflow-auto zam-scroll max-h-[640px] rounded-2xl border border-zam-line bg-white",
        className
      )}
    >
      <table className="w-full text-sm border-collapse sticky-head">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={twMerge(
        "bg-zam-canvas text-left text-xs font-semibold uppercase tracking-wide text-zam-muted px-4 py-3 border-b border-zam-line whitespace-nowrap",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={twMerge("px-4 py-3 border-b border-zam-line text-zam-ink align-middle", className)}>{children}</td>
  );
}

export function Tr({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={twMerge("hover:bg-zam-canvas/60 transition-colors", onClick && "cursor-pointer", className)}
    >
      {children}
    </tr>
  );
}
