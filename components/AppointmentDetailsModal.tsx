"use client";

import { useEffect } from "react";
import { AppointmentStatus } from "@/app/generated/prisma";
import StatusBadge from "./StatusBadge";
import getColorForId from "@/utils/getColorForId";
import { formatInTimeZone } from "date-fns-tz";
import { APP_TZ } from "@/utils/datetime";
import { FaX } from "react-icons/fa6";

type Appt = {
  id: number;
  date: string;
  customerName: string;
  phoneNumber: string;
  status: AppointmentStatus;
  nailTech: { name: string } | null;

  serviceName?: string;
  serviceDurationMin?: number | null;

  // 🔁 rename to match snapshots returned by your API
  priceCents?: number | null; // base service price snapshot
  hasDesign?: boolean;
  designPriceCents?: number | null; // add-on snapshot (when hasDesign)
  designNotes?: string | null;
};

export default function AppointmentDetailsModal({
  isOpen,
  appt,
  onClose,
  onChangeStatusClick,
}: {
  isOpen: boolean;
  appt: Appt;
  onClose: () => void;
  onChangeStatusClick?: () => void;
}) {
  // Esc key close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const dateLabel = formatInTimeZone(new Date(appt.date), APP_TZ, "PP");
  const timeLabel = formatInTimeZone(new Date(appt.date), APP_TZ, "p");

  const techChip = appt.nailTech ? (
    <span
      className={`${getColorForId(
        appt.nailTech.name
      )} inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium`}
    >
      {appt.nailTech.name}
    </span>
  ) : (
    "—"
  );

  const money = (cents?: number | null) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(((cents ?? 0) as number) / 100);

  const baseCents = appt.priceCents ?? 0;
  const addOnCents = appt.hasDesign ? appt.designPriceCents ?? 0 : 0;
  const totalCents = baseCents + addOnCents;

  const basePriceLabel = money(baseCents);
  const designLabel = appt.hasDesign
    ? addOnCents
      ? `+${money(addOnCents)}`
      : "+$0.00"
    : "—";
  const totalLabel = money(totalCents);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white w-[92vw] max-w-lg rounded-xl shadow-xl p-5 text-gray-800 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-zinc-600 hover:text-zinc-400 cursor-pointer transition"
          aria-label="Close"
        >
          <FaX />
        </button>

        <h3 className="text-lg font-semibold mb-4">Appointment Details</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Date</span>
            <span className="font-medium">{dateLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Time</span>
            <span className="font-medium">
              {/* {timeLabel} ({APP_TZ}) */}
              {timeLabel} - Burbank, CA
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Nail Tech</span>
            <span className="font-medium">{techChip}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Customer</span>
            <span className="font-medium">{appt.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Phone</span>
            <a
              href={`tel:${appt.phoneNumber}`}
              className="text-violet-600 hover:underline"
            >
              {appt.phoneNumber}
            </a>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Status</span>
            <StatusBadge status={appt.status} />
          </div>

          <hr className="my-2" />

          <div className="flex justify-between">
            <span className="text-gray-500">Service</span>
            <span className="font-medium">
              {appt.serviceName ?? "—"}
              {appt.serviceDurationMin
                ? ` • ${appt.serviceDurationMin} min`
                : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Base Price</span>
            <span className="font-medium">{basePriceLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Design Add-on</span>
            <span className="font-medium">{designLabel}</span>
          </div>

          <hr className="my-2" />

          <div className="flex justify-between">
            <span className="text-gray-500">Total</span>
            <span className="font-semibold">{totalLabel}</span>
          </div>

          {appt.designNotes && (
            <div>
              <span className="text-gray-500 block">Design Notes</span>
              <p className="mt-1 text-gray-700">{appt.designNotes}</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-rose-400 text-white hover:bg-rose-500 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
