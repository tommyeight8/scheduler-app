import { AppointmentStatus } from "@/app/generated/prisma";
import { useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (selected: AppointmentStatus) => void;
  currentStatus: AppointmentStatus;
};

export default function StatusModal({
  isOpen,
  onClose,
  onSubmit,
  currentStatus,
}: Props) {
  const [selected, setSelected] = useState(currentStatus);

  const handleSubmit = () => {
    onSubmit(selected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-96">
        <h2 className="text-lg font-semibold mb-4">Update Status</h2>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value as AppointmentStatus)}
          className="w-full p-2 border rounded mb-4"
        >
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="done">Done</option>
        </select>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded cursor-pointer transition hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-violet-500 text-white rounded cursor-pointer transition hover:bg-violet-400"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
