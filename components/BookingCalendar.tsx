"use client";

import { useEffect, useState, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { FaX } from "react-icons/fa6";
import LoadingSpinner from "./LoadingSpinner";
import toast from "react-hot-toast";
import {
  APP_TZ,
  localSlotToUtcISO,
  laDateParam,
  isSameUtcMinute,
} from "@/utils/datetime";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import getColorForId from "@/utils/getColorForId";

import {
  useAppointmentsForDay,
  useCreateAppointment,
  useNailTechs,
  useServices,
} from "@/hooks/useBookingData";

function dayToISO(date: Date | null) {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

type Appointment = {
  id: number | string;
  date: string;
  status: string;
  nailTech?: { id: number | string; name: string };
};

type DesignPriceOption = {
  id: number;
  label?: string | null;
  priceCents: number;
};

type Service = {
  id: number;
  name: string;
  priceCents: number;
  durationMin?: number | null;
  designMode: "none" | "fixed" | "custom";
  designPriceCents?: number | null; // fixed
  designPriceOptions?: DesignPriceOption[]; // ← NEW
};

function generateTimeSlots(start = 11, end = 20) {
  const slots: string[] = [];
  for (let h = start; h < end; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour12 = h % 12 || 12;
      const ampm = h < 12 ? "AM" : "PM";
      slots.push(`${hour12}:${m.toString().padStart(2, "0")} ${ampm}`);
    }
  }
  return slots;
}

export default function BookingCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [isBooking, setIsBooking] = useState(false);
  const isoDay = dayToISO(selectedDate);

  // NEW: presets state
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);

  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    null
  );

  const [selectedTechId, setSelectedTechId] = useState<
    number | "add-new" | null
  >(null);
  const [newTechName, setNewTechName] = useState("");

  // queries
  const { data: services = [], isLoading: servicesLoading } = useServices();
  const { data: nailTechs = [], isLoading: techsLoading } = useNailTechs();
  const {
    data: appointments = [],
    isLoading: apptsLoading,
    refetch: refetchAppts,
  } = useAppointmentsForDay(isoDay);
  // mutation
  const createAppt = useCreateAppointment();

  // NEW: design add-on state
  const [addDesign, setAddDesign] = useState(false);
  const [designPrice, setDesignPrice] = useState(""); // USD string (custom mode)
  const [designNotes, setDesignNotes] = useState("");

  // derived helpers
  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) || null,
    [services, selectedServiceId]
  );

  const isCustomDesign = selectedService?.designMode === "custom";
  const isFixedDesign = selectedService?.designMode === "fixed";
  const designPriceCentsFromFixed = selectedService?.designPriceCents ?? null;
  // derive a price from selected preset
  const presetPriceCents = useMemo(() => {
    if (!selectedService?.designPriceOptions || selectedPresetId == null)
      return null;
    const opt = selectedService.designPriceOptions.find(
      (o) => o.id === selectedPresetId
    );
    return opt ? opt.priceCents : null;
  }, [selectedService, selectedPresetId]);

  const customNeedsPriceError =
    addDesign &&
    isCustomDesign && // using presets path and none selected while presets exist
    ((!useCustomInput &&
      (selectedService?.designPriceOptions?.length ?? 0) > 0 &&
      !selectedPresetId) ||
      // using custom input OR no presets exist -> need positive number
      ((useCustomInput ||
        (selectedService?.designPriceOptions?.length ?? 0) === 0) &&
        (!designPrice || !(Number(designPrice) > 0))));

  const needsDesignPrice =
    addDesign && isCustomDesign && (!designPrice || !(Number(designPrice) > 0));

  function getSlotAppointments(date: Date, time: string): Appointment[] {
    const slotUtcISO = localSlotToUtcISO(date, time);
    return appointments.filter((appt) =>
      isSameUtcMinute(appt.date, slotUtcISO)
    );
  }

  const techIdNum =
    typeof selectedTechId === "number" ? selectedTechId : undefined;

  function hasConflictForSelectedTech(
    date: Date | null,
    time: string,
    techId?: number
  ) {
    if (!date || !time || !techId) return false;
    const slotUtcISO = localSlotToUtcISO(date, time);
    return appointments.some(
      (a) =>
        isSameUtcMinute(a.date, slotUtcISO) && Number(a.nailTech?.id) === techId
    );
  }

  const hasConflict =
    techIdNum !== undefined &&
    hasConflictForSelectedTech(selectedDate, selectedTime, techIdNum);

  const noTechSelected = selectedTechId === null;
  const requiresNewTechName =
    selectedTechId === "add-new" && !newTechName.trim();

  function resetForm() {
    setCustomerName("");
    setPhoneNumber("");
    setSelectedTechId(null);
    setNewTechName("");
    setSelectedTime("");
    setSelectedServiceId(null);
    setAddDesign(false);
    setDesignPrice("");
    setDesignNotes("");
    setStatus("idle");
    setIsModalOpen(false);
    setUseCustomInput(false);
    setSelectedPresetId(null);
  }

  async function handleBooking() {
    if (!selectedDate || !selectedTime || !customerName || !phoneNumber) return;

    if (!selectedServiceId) return toast.error("Please select a service.");
    if (hasConflict)
      return toast.error(
        "This nail tech already has an appointment at that time."
      );
    if (addDesign && isCustomDesign && needsDesignPrice)
      return toast.error("Please enter a valid design price.");
    if (customNeedsPriceError)
      return toast.error(
        "Please choose a preset or enter a valid design price."
      );

    const dateISO = localSlotToUtcISO(selectedDate, selectedTime);
    const usdFromPreset =
      presetPriceCents != null ? presetPriceCents / 100 : undefined;
    const designPriceUsd =
      addDesign && isCustomDesign
        ? useCustomInput || usdFromPreset === undefined
          ? Number(designPrice)
          : usdFromPreset
        : undefined;

    try {
      setIsBooking(true);
      await createAppt.mutateAsync({
        date: dateISO,
        customerName,
        phoneNumber,
        nailTechId: techIdNum,
        nailTechName: selectedTechId === "add-new" ? newTechName : undefined,
        serviceId: selectedServiceId,
        addDesign,
        designPrice: designPriceUsd,
        designNotes:
          addDesign && designNotes.trim() ? designNotes.trim() : undefined,
        _dayISO: isoDay, // used in onSuccess to invalidate that specific day
      });
      setStatus("success");
      resetForm();
      // If your /api/appointments endpoint ignores the day param, you can refetch anyway:
      refetchAppts();
    } catch {
      setStatus("error");
    } finally {
      setIsBooking(false);
    }
  }

  const loadingAny =
    servicesLoading || techsLoading || (isoDay && apptsLoading);

  return (
    <div className="max-w-xl mx-auto p-6 rounded-lg shadow bg-white">
      <h1 className="text-xl text-gray-700 font-semibold mb-4">
        Book Appointment
      </h1>

      <Calendar
        onChange={(date) => {
          setSelectedDate(date as Date);
          setSelectedTime("");
          setStatus("idle");
        }}
        value={selectedDate}
        tileDisabled={({ date }) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isPast = date < today;
          const isTuesday = date.getDay() === 2;
          return isPast || isTuesday;
        }}
      />

      {selectedDate && (
        <div className="w-full flex justify-end py-2">
          <button
            onClick={() => {
              setSelectedDate(null);
              setSelectedTime("");
              setStatus("idle");
            }}
            className="text-sm text-white flex items-center justify-center p-2 cursor-pointer rounded-full bg-rose-400 hover:bg-rose-300 transition duration-150 gap-2"
          >
            <FaX />
          </button>
        </div>
      )}

      {selectedDate && (
        <div className="mt-6">
          <h2 className="mb-2 p-2 text-center bg-blue-100 text-blue-500 rounded-sm">
            Available Time Slots for{" "}
            <strong>{formatInTimeZone(selectedDate, APP_TZ, "PP")}</strong>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {generateTimeSlots().map((time) => {
              const slotAppointments = getSlotAppointments(selectedDate, time);
              const booked = slotAppointments.length > 0;
              return (
                <button
                  key={time}
                  onClick={() => {
                    setSelectedTime(time);
                    setIsModalOpen(true);
                  }}
                  className="px-2 py-1 rounded text-sm hover:text-white hover:bg-violet-600 transition duration-100 cursor-pointer"
                >
                  {booked ? (
                    <div className="flex flex-col items-center">
                      <span>{time}</span>
                      <div className="flex flex-wrap justify-center gap-1 mt-1">
                        {slotAppointments.map((appt) => {
                          const initial =
                            appt.nailTech?.name?.charAt(0).toUpperCase() || "?";
                          const bgColor = getColorForId(
                            appt.nailTech?.name || appt.id
                          );
                          return (
                            <span
                              key={appt.id}
                              className={`text-[10px] w-4 h-4 rounded-full flex items-center justify-center ${bgColor}`}
                            >
                              {initial}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    time
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 text-center">
            <Link
              href={`/dashboard/appointments/date/${laDateParam(selectedDate)}`}
              className="text-sm text-violet-600 hover:underline"
            >
              View all appointments for{" "}
              {formatInTimeZone(selectedDate, APP_TZ, "PP")}
            </Link>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-[90vw] text-gray-700 max-w-md shadow-lg relative">
            <button
              onClick={resetForm}
              className="absolute top-2 right-2 text-zinc-700 hover:text-zinc-400 cursor-pointer"
            >
              <FaX />
            </button>

            <h3 className="text-lg font-semibold mb-4">
              Confirm Appointment: {selectedTime}
            </h3>

            <input
              type="text"
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded"
            />

            <input
              type="tel"
              placeholder="Phone Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full mb-4 px-3 py-2 border border-gray-300 rounded"
            />

            {/* Service */}
            <select
              value={selectedServiceId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedServiceId(val ? Number(val) : null);

                // reset design state when switching service
                setAddDesign(false);
                setDesignPrice("");
                setDesignNotes("");
              }}
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">Select Service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — ${(s.priceCents / 100).toFixed(2)}
                </option>
              ))}
            </select>

            {/* Design add-on */}
            {/* Design add-on */}
            {selectedService && selectedService.designMode !== "none" && (
              <div className="mb-3 p-3 rounded border bg-gray-50">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={addDesign}
                    onChange={(e) => setAddDesign(e.target.checked)}
                  />
                  <span>Add Nail Art / Design</span>
                </label>

                {/* FIXED */}
                {addDesign && isFixedDesign && (
                  <p className="text-sm text-gray-600 mt-2">
                    Design price: $
                    {((designPriceCentsFromFixed ?? 0) / 100).toFixed(2)}{" "}
                    (fixed)
                  </p>
                )}

                {/* CUSTOM */}
                {addDesign && isCustomDesign && (
                  <div className="mt-2 space-y-2">
                    {/* If presets exist, allow choosing preset or switching to custom input */}
                    {(selectedService.designPriceOptions?.length ?? 0) > 0 && (
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name="designPriceSource"
                            checked={!useCustomInput}
                            onChange={() => {
                              setUseCustomInput(false);
                              setDesignPrice("");
                            }}
                          />
                          <span>Choose preset</span>
                        </label>

                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name="designPriceSource"
                            checked={useCustomInput}
                            onChange={() => {
                              setUseCustomInput(true);
                              setSelectedPresetId(null);
                            }}
                          />
                          <span>Add new price</span>
                        </label>
                      </div>
                    )}

                    {/* Preset list */}
                    {!useCustomInput &&
                      (selectedService.designPriceOptions?.length ?? 0) > 0 && (
                        <select
                          value={selectedPresetId ?? ""}
                          onChange={(e) =>
                            setSelectedPresetId(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          className="border rounded px-3 py-2 w-full"
                        >
                          <option value="">Select a preset</option>
                          {selectedService.designPriceOptions!.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {(opt.label ? `${opt.label} — ` : "") +
                                `$${(opt.priceCents / 100).toFixed(2)}`}
                            </option>
                          ))}
                        </select>
                      )}

                    {/* Custom price input (if toggled OR no presets exist) */}
                    {(useCustomInput ||
                      (selectedService.designPriceOptions?.length ?? 0) ===
                        0) && (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="border rounded px-3 py-2 w-full"
                        placeholder="Design price (USD)"
                        value={designPrice}
                        onChange={(e) => setDesignPrice(e.target.value)}
                      />
                    )}

                    {/* Optional notes */}
                    <input
                      type="text"
                      className="border rounded px-3 py-2 w-full"
                      placeholder="Design notes (optional)"
                      value={designNotes}
                      onChange={(e) => setDesignNotes(e.target.value)}
                    />

                    {/* Validation */}
                    {customNeedsPriceError && (
                      <p className="text-xs text-red-500">
                        Please choose a preset or enter a valid design price.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Nail tech */}
            <select
              value={selectedTechId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") setSelectedTechId(null);
                else if (val === "add-new") setSelectedTechId("add-new");
                else setSelectedTechId(Number(val));
              }}
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">Select Nail Tech</option>
              {nailTechs.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
              <option value="add-new">+ Add New</option>
            </select>

            {selectedTechId === "add-new" && (
              <input
                type="text"
                placeholder="New Nail Tech Name"
                value={newTechName}
                onChange={(e) => setNewTechName(e.target.value)}
                className="w-full mb-3 px-3 py-2 border border-gray-300 rounded"
              />
            )}

            {/* conflict message */}
            {hasConflict && (
              <p className="text-sm text-red-500 mb-3">
                {nailTechs.find((t) => t.id === techIdNum)?.name} is already
                booked for {selectedTime}.
              </p>
            )}

            {/* Price preview */}
            {selectedService && (
              <p className="text-sm text-gray-500 mb-2">
                Total price: $
                {(
                  (selectedService.priceCents +
                    // add fixed add-on
                    (addDesign && isFixedDesign
                      ? designPriceCentsFromFixed ?? 0
                      : 0) +
                    // add custom add-on (preset or manual input)
                    (addDesign && isCustomDesign
                      ? presetPriceCents ??
                        (designPrice
                          ? Math.round(Number(designPrice) * 100)
                          : 0)
                      : 0)) /
                  100
                ).toFixed(2)}
                {selectedService.durationMin
                  ? ` • ${selectedService.durationMin} min`
                  : ""}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={resetForm}
                className="rounded px-4 py-2 text-sm bg-zinc-200 text-zinc-500 hover:bg-zinc-300 transition duration-150 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBooking}
                className="bg-violet-500 text-white px-4 py-2 rounded hover:bg-violet-400 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={
                  isBooking ||
                  !selectedDate ||
                  !selectedTime ||
                  !customerName ||
                  !phoneNumber ||
                  !selectedServiceId ||
                  noTechSelected ||
                  requiresNewTechName ||
                  hasConflict ||
                  (addDesign && isCustomDesign && needsDesignPrice)
                }
              >
                {isBooking ? <LoadingSpinner text="Booking" /> : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
