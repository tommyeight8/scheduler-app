// app/dashboard/history/page.tsx
"use client";

import { useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { formatInTimeZone } from "date-fns-tz";
import { APP_TZ, laDateParam } from "@/utils/datetime";
import AppointmentTable from "@/components/AppointmentTable";

function todayLA(): Date {
  const ymd = formatInTimeZone(new Date(), APP_TZ, "yyyy-MM-dd");
  // midnight UTC that corresponds to LA “today” start
  return new Date(`${ymd}T00:00:00.000Z`);
}

export default function HistoryPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(todayLA());

  // yyyy-MM-dd to feed AppointmentTable
  const scope = useMemo(() => laDateParam(selectedDate), [selectedDate]);

  // allow up to “today” (no future)
  const maxDate = useMemo(() => new Date(), []);

  console.log(selectedDate, scope);

  return (
    <div className="grid gap-6 md:grid-cols-[320px_1fr] max-w-[1100px] mx-auto p-6">
      <div className="bg-white p-3 rounded shadow">
        <Calendar
          value={selectedDate}
          onChange={(d) => setSelectedDate(d as Date)}
          maxDate={maxDate}
          tileDisabled={({ date }) => date > maxDate}
          showNeighboringMonth={false}
          minDetail="month"
          maxDetail="month"
        />
      </div>

      <div className="bg-white p-3 rounded shadow">
        <h2 className="text-lg font-semibold mb-3">
          {formatInTimeZone(selectedDate, APP_TZ, "PPPP")}
        </h2>

        {/* Drive the same data shape as the date page via scope */}
        <AppointmentTable scope={laDateParam(selectedDate)} />
      </div>
    </div>
  );
}
