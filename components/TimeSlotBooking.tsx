"use client";

import { useState, useEffect } from "react";

type Appointment = {
  id: number;
  date: string;
  status: string;
};

function generateTimeSlots(start = 11, end = 20) {
  const slots: string[] = [];
  for (let h = start; h < end; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
      );
    }
  }
  return slots;
}

export default function TimeSlotBooking() {
  const [selectedDate, setSelectedDate] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (selectedDate) fetchAppointments();
  }, [selectedDate]);

  async function fetchAppointments() {
    const res = await fetch("/api/appointments");
    if (res.ok) {
      const data = await res.json();
      setAppointments(data.appointments);
    }
  }

  function isSlotBooked(date: string, time: string) {
    const slotISO = new Date(`${date}T${time}:00`).toISOString();
    return appointments.some(
      (appt) => new Date(appt.date).toISOString() === slotISO
    );
  }

  async function handleSubmit() {
    if (!selectedDate || !selectedTime) return;
    setIsBooking(true);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: `${selectedDate}T${selectedTime}:00` }),
    });

    if (res.ok) {
      setStatus("success");
      setSelectedTime("");
      fetchAppointments();
    } else {
      setStatus("error");
    }

    setIsBooking(false);
  }

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow">
      <h1 className="text-xl font-semibold mb-4">Book Appointment</h1>

      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="w-full mb-4 px-3 py-2 border border-gray-300 rounded"
      />

      {selectedDate && (
        <div className="grid grid-cols-4 gap-2">
          {generateTimeSlots().map((time) => {
            const isBooked = isSlotBooked(selectedDate, time);
            const isSelected = time === selectedTime;
            const formattedTime = new Date(
              `2000-01-01T${time}:00`
            ).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });

            return (
              <button
                key={time}
                onClick={() => !isBooked && setSelectedTime(time)}
                disabled={isBooked}
                className={`px-2 py-1 rounded text-sm ${
                  isBooked
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : isSelected
                    ? "bg-[#d9b99b] text-white"
                    : "bg-[#fdf6ec] hover:bg-[#f0e1ce]"
                }`}
              >
                {formattedTime}
              </button>
            );
          })}
        </div>
      )}

      {selectedTime && (
        <div className="mt-4">
          <p>
            Selected:{" "}
            <strong>
              {selectedDate} at {selectedTime}
            </strong>
          </p>
          <button
            onClick={handleSubmit}
            className="mt-2 bg-[#d9b99b] text-white px-4 py-2 rounded hover:bg-[#c7a17a] transition"
            disabled={isBooking}
          >
            {isBooking ? "Booking..." : "Confirm Appointment"}
          </button>
        </div>
      )}

      {status === "success" && (
        <p className="text-green-600 mt-4">Appointment booked successfully!</p>
      )}
      {status === "error" && (
        <p className="text-red-600 mt-4">Failed to book appointment.</p>
      )}
    </div>
  );
}
