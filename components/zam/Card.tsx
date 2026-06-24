import React from "react";
import { twMerge } from "tailwind-merge";

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge("bg-white border border-zam-line rounded-2xl shadow-card", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={twMerge("flex items-start justify-between gap-4 px-5 py-4 border-b border-zam-line", className)}>
      <div>
        <h3 className="font-display font-semibold text-zam-ink text-base">{title}</h3>
        {description && <p className="text-sm text-zam-muted mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}
