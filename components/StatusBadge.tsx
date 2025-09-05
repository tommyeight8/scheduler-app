import React from "react";

type AppointmentStatus = "confirmed" | "cancelled" | "done";

interface Props {
  status: AppointmentStatus;
}

const statusStyles: Record<AppointmentStatus, string> = {
  confirmed: "bg-blue-100 text-blue-600",
  cancelled: "bg-rose-100 text-rose-600",
  done: "bg-green-100 text-green-600",
};

export default function StatusBadge({ status }: Props) {
  return (
    <span
      className={`text-xs font-semibold px-2 py-1 rounded-full ${statusStyles[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
