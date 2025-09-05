"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDelete({
  open,
  title = "Are you sure?",
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  danger = true,
  onCancel,
  onConfirm,
}: Props) {
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  // Close with Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm]);

  // Focus confirm button for accessibility
  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => confirmBtnRef.current?.focus());
      return () => cancelAnimationFrame(t);
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Overlay (click outside to cancel) */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px] animate-in fade-in"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="relative w-[92vw] max-w-md rounded-2xl border bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()} // prevent overlay click
      >
        <h3 id="confirm-title" className="text-lg font-semibold text-gray-900">
          {title}
        </h3>
        <p id="confirm-desc" className="mt-2 text-sm text-gray-600">
          {message}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md cursor-pointer transition duration-150 hover:bg-gray-100 bg-gray-200 text-gray-700"
          >
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className={`px-3 py-1.5 rounded-md text-white cursor-pointer transition duration-150 ${
              danger
                ? "bg-rose-400 hover:bg-rose-500 focus:ring-rose-300"
                : "bg-black hover:bg-gray-800 focus:ring-gray-400"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
