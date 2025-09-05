// components/AppointmentTable.tsx
"use client";

import { useState } from "react";
import { AppointmentStatus } from "@/app/generated/prisma";
import StatusBadge from "./StatusBadge";
import StatusModal from "./StatusModal";
import { BsThreeDotsVertical } from "react-icons/bs";
import getColorForId from "@/utils/getColorForId";
import AppointmentDetailsModal from "./AppointmentDetailsModal";
import {
  useAppointments,
  useUpdateAppointmentStatus,
  type Appointment,
} from "@/hooks/useAppointments";
import Skeleton from "./Skeleton";

export default function AppointmentTable({
  /** Optional: pass a date scope like '2025-09-05' to only fetch that day */
  scope,
  /** Optional: SSR prefetch/hydration can pass initial data to avoid first-load spinner */
  initialAppointments,
}: {
  scope?: string;
  initialAppointments?: Appointment[];
}) {
  const { data = initialAppointments ?? [], isLoading } =
    useAppointments(scope);
  const updateStatus = useUpdateAppointmentStatus(scope);

  // Row click opens details modal
  const [detailsAppt, setDetailsAppt] = useState<Appointment | null>(null);

  // Status modal state
  const [statusModal, setStatusModal] = useState<{
    show: boolean;
    id: number | null;
    current: AppointmentStatus | null;
  }>({ show: false, id: null, current: null });

  const openStatusModal = (id: number, current: AppointmentStatus) =>
    setStatusModal({ show: true, id, current });
  const closeStatusModal = () =>
    setStatusModal({ show: false, id: null, current: null });

  const handleUpdate = async (newStatus: AppointmentStatus) => {
    if (!statusModal.id) return;
    await updateStatus.mutateAsync({ id: statusModal.id, status: newStatus });
    closeStatusModal();
  };

  const placeholderRows = Array.from({ length: 5 }).map((_, i) => (
    <tr key={`sk-${i}`} className="border-b border-gray-200">
      <td className="p-2">
        <Skeleton className="h-6 skeleton-shimmer" />
      </td>
      <td className="p-2">
        <Skeleton className="h-6 skeleton-shimmer" />
      </td>
      <td className="p-2">
        <Skeleton className="h-6 skeleton-shimmer" />
      </td>
      <td className="p-2">
        <Skeleton className="h-6 skeleton-shimmer" />
      </td>
      <td className="p-2">
        <Skeleton className="h-6 skeleton-shimmer" />
      </td>
      <td className="p-2">
        <Skeleton className="h-8 w-8 rounded-full skeleton-shimmer" />
      </td>
    </tr>
  ));

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
            {isLoading ? (
              placeholderRows
            ) : // <tr>
            //   <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
            //     Loading…
            //   </td>
            // </tr>
            data.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                  No appointments.
                </td>
              </tr>
            ) : (
              data.map((appt) => (
                <tr
                  key={appt.id}
                  onClick={() => setDetailsAppt(appt)}
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
                        openStatusModal(appt.id, appt.status);
                      }}
                      className="cursor-pointer h-7 w-7 bg-gray-100 hover:bg-gray-200 transition rounded-4xl flex items-center justify-center"
                    >
                      <BsThreeDotsVertical />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details modal */}
      {detailsAppt && (
        <AppointmentDetailsModal
          isOpen={!!detailsAppt}
          appt={detailsAppt}
          onClose={() => setDetailsAppt(null)}
          onChangeStatusClick={() => {
            setDetailsAppt(null);
            openStatusModal(detailsAppt.id, detailsAppt.status);
          }}
        />
      )}

      {detailsAppt && (
        <AppointmentDetailsModal
          isOpen={!!detailsAppt}
          appt={detailsAppt}
          onClose={() => setDetailsAppt(null)}
          onChangeStatusClick={() => {
            setDetailsAppt(null);
          }}
        />
      )}

      {/* Status modal */}
      {statusModal.show && statusModal.current !== null && (
        <StatusModal
          isOpen={statusModal.show}
          onClose={closeStatusModal}
          currentStatus={statusModal.current}
          onSubmit={handleUpdate}
          submitting={updateStatus.isPending} // ✅ now supported
        />
      )}
    </>
  );
}
