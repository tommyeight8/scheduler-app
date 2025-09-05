// lib/confirmToast.tsx
"use client";
import toast from "react-hot-toast";
import { useId } from "react";

export function confirmToast(
  message: string,
  {
    confirmText = "Delete",
    cancelText = "Cancel",
    danger = true,
    duration = 60000, // give people time
  }: {
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    duration?: number;
  } = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    const id = `confirm-${Math.random().toString(36).slice(2)}`;

    const dismiss = () => toast.dismiss(id);

    toast.custom(
      (t) => (
        <div
          role="dialog"
          aria-modal="true"
          className={`w-[22rem] rounded-xl shadow-md border bg-white p-4 ${
            t.visible
              ? "animate-in fade-in slide-in-from-top-1"
              : "animate-out fade-out"
          }`}
        >
          <div className="text-sm text-gray-800">{message}</div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => {
                dismiss();
                resolve(false);
              }}
              className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 text-gray-700"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                dismiss();
                resolve(true);
              }}
              className={`px-3 py-1.5 rounded text-white ${
                danger
                  ? "bg-rose-600 hover:bg-rose-500"
                  : "bg-black hover:bg-gray-800"
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      ),
      { id, duration }
    );
  });
}
