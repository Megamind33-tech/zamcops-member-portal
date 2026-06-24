"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X as XIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "modal" | "drawer";
}

const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  variant = "modal",
}: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const isDrawer = variant === "drawer";
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-zam-ink/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={twMerge(
              "relative bg-white shadow-card-lg flex flex-col max-h-[92vh] w-full",
              isDrawer
                ? "sm:ml-auto sm:h-full sm:max-h-full sm:rounded-none sm:w-[440px] rounded-t-3xl sm:rounded-l-3xl"
                : twMerge("rounded-t-3xl sm:rounded-3xl mt-auto sm:mt-0", sizes[size])
            )}
            initial={isDrawer ? { x: "100%" } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={isDrawer ? { x: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isDrawer ? { x: "100%" } : { opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-zam-line">
                <div>
                  {title && <h2 className="font-display font-semibold text-lg text-zam-ink">{title}</h2>}
                  {description && <p className="text-sm text-zam-muted mt-0.5">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="text-zam-muted hover:text-zam-ink p-1 -mr-1 rounded-lg hover:bg-zam-canvas"
                  aria-label="Close"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="px-6 py-5 overflow-y-auto zam-scroll flex-1">{children}</div>
            {footer && (
              <div className="px-6 py-4 border-t border-zam-line flex items-center justify-end gap-3">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
