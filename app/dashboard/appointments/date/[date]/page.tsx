// app/dashboard/appointments/date/[date]/page.tsx
import { format, parseISO } from "date-fns";
import AppointmentTable from "@/components/AppointmentTable";
import { prisma } from "@/lib/prisma";
import { laDayStartUtc, laNextDayStartUtc } from "@/utils/tz";

function isYMD(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function AppointmentsByDatePage(ctx: any) {
  const p = await ctx?.params;
  const raw = Array.isArray(p?.date) ? p.date[0] : p?.date;
  if (!isYMD(raw)) {
    return (
      <div className="max-w-[900px] mx-auto p-6">
        <h1 className="text-xl font-bold">Invalid date</h1>
        <p className="text-gray-600">Expected YYYY-MM-DD.</p>
      </div>
    );
  }

  const date = raw;
  const start = laDayStartUtc(date); // ✅ LA-local 00:00 → UTC
  const end = laNextDayStartUtc(date); // ✅ next LA-local 00:00 → UTC

  const rows = await prisma.appointment.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
    include: { nailTech: true, service: { select: { durationMin: true } } },
  });

  const initialAppointments = rows.map((a) => ({
    id: a.id,
    userId: a.userId,
    status: a.status,
    customerName: a.customerName,
    phoneNumber: a.phoneNumber,
    nailTechId: a.nailTechId,
    nailTech: a.nailTech ? { id: a.nailTech.id, name: a.nailTech.name } : null,
    serviceId: a.serviceId,
    serviceName: a.serviceName,
    priceCents: a.priceCents,
    serviceDurationMin: a.service?.durationMin ?? null,
    hasDesign: a.hasDesign,
    designPriceCents: a.designPriceCents,
    designNotes: a.designNotes,
    date: a.date.toISOString(),
    finishedAt: a.finishedAt ? a.finishedAt.toISOString() : null,
    totalCents: a.totalCents ?? null,
  }));

  return (
    <div className="max-w-[900px] mx-auto p-4 md:p-6 bg-white shadow rounded">
      <h1 className="text-xl font-bold mb-4">
        {format(parseISO(date), "MMM d, yyyy")}
      </h1>

      {initialAppointments.length === 0 ? (
        <p className="text-gray-500">No appointments booked for this day.</p>
      ) : (
        <AppointmentTable
          scope={date} // make the client query key line up
          initialAppointments={initialAppointments}
        />
      )}
    </div>
  );
}
