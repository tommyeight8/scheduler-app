"use client";

import { useState } from "react";
import { AppointmentStatus } from "@/app/generated/prisma";
import StatusBadge from "./StatusBadge";
import StatusModal from "./StatusModal";
import { BsThreeDotsVertical } from "react-icons/bs";
import toast from "react-hot-toast";
import getColorForId from "@/utils/getColorForId";

interface Appointment {
  id: number;
  date: string;
  customerName: string;
  phoneNumber: string;
  status: AppointmentStatus;
  nailTech: { name: string } | null;
}

export default function AppointmentTable({
  appointments: initialAppointments,
}: {
  appointments: Appointment[];
}) {
  const [appointments, setAppointments] = useState(initialAppointments);

  const [modalState, setModalState] = useState<{
    show: boolean;
    id: number | null;
    current: AppointmentStatus | null;
  }>({
    show: false,
    id: null,
    current: null,
  });

  const openModal = (id: number, current: AppointmentStatus) =>
    setModalState({ show: true, id, current });

  const closeModal = () =>
    setModalState({ show: false, id: null, current: null });

  const handleUpdate = async (newStatus: AppointmentStatus) => {
    if (!modalState.id) return;

    try {
      const res = await fetch(`/api/appointments/${modalState.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      // ✅ Update local state for reactive UI
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === modalState.id ? { ...appt, status: newStatus } : appt
        )
      );

      toast.success("Status updated");
    } catch (err) {
      console.error(err);
      toast.error("Error updating status");
    } finally {
      closeModal();
    }
  };

  return (
    <>
      <div className="w-full overflow-x-auto">
        <table className="min-w-[600px] md:min-w-full text-sm text-left text-gray-700 border-collapse">
          <thead className="bg-gray-100 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2 border-b border-gray-200">Nail Tech</th>
              <th className="px-4 py-2 border-b border-gray-200">Customer</th>
              <th className="px-4 py-2 border-b border-gray-200">Time</th>
              <th className="px-4 py-2 border-b border-gray-200">Phone</th>
              <th className="px-4 py-2 border-b border-gray-200">Status</th>
              <th className="px-4 py-2 border-b border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt) => (
              <tr
                key={appt.id}
                onClick={() => openModal(appt.id, appt.status)}
                className="cursor-pointer transition hover:bg-gray-50"
              >
                <td className="px-4 py-2 border-b border-gray-200">
                  {appt.nailTech ? (
                    <span
                      className={`${getColorForId(
                        appt.nailTech.name
                      )} px-3 py-1 rounded-full text-xs font-medium`}
                    >
                      {appt.nailTech.name}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>

                <td className="px-4 py-2 border-b border-gray-200">
                  {appt.customerName}
                </td>
                <td className="px-4 py-2 border-b border-gray-200">
                  {new Date(appt.date).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-2 border-b border-gray-200">
                  {appt.phoneNumber}
                </td>
                <td className="px-4 py-2 border-b border-gray-200">
                  <StatusBadge status={appt.status} />
                </td>
                <td className="px-4 py-2 border-b border-gray-200 relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();

                      openModal(appt.id, appt.status);
                    }}
                    className="cursor-pointer h-7 w-7 bg-gray-100 hover:bg-gray-200 transition rounded-4xl flex items-center justify-center"
                  >
                    <BsThreeDotsVertical />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalState.show && modalState.current !== null && (
        <StatusModal
          isOpen={modalState.show}
          onClose={closeModal}
          currentStatus={modalState.current}
          onSubmit={handleUpdate}
        />
      )}
    </>
  );
}
