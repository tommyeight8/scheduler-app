import { AppointmentStatus } from "@/app/generated/prisma";
import { useEffect, useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (selected: AppointmentStatus) => void;
  currentStatus: AppointmentStatus;
  submitting?: boolean; // ✅ new
};

const STATUS_OPTIONS: AppointmentStatus[] = [
  "confirmed",
  "cancelled",
  "done",
] as const; // ← keep in sync with your enum

export default function StatusModal({
  isOpen,
  onClose,
  onSubmit,
  currentStatus,
  submitting = false,
}: Props) {
  const [selected, setSelected] = useState<AppointmentStatus>(currentStatus);

  // Resync when opening on a different row
  useEffect(() => {
    if (isOpen) setSelected(currentStatus);
  }, [isOpen, currentStatus]);

  const handleSubmit = () => {
    if (submitting) return;
    onSubmit(selected);
    // Don't auto-close here; let the parent close after the mutation resolves.
    // onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 bg-opacity-30 flex justify-center items-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="bg-white p-6 rounded shadow-md w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="status-modal-title" className="text-lg font-semibold mb-4">
          Update Status
        </h2>

        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value as AppointmentStatus)}
          className="w-full p-2 border rounded mb-4"
          disabled={submitting}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded cursor-pointer transition hover:bg-gray-200 disabled:opacity-60"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-violet-500 text-white rounded cursor-pointer transition hover:bg-violet-400 disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? "Updating…" : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}
