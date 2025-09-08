// app/api/appointments/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { fromZonedTime } from "date-fns-tz";

const APP_TZ = "America/Los_Angeles";

export async function POST(req: Request) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    date, // should be a UTC ISO string from your client (localSlotToUtcISO)
    customerName,
    phoneNumber,
    nailTechId,
    nailTechName,
    serviceId,
    addDesign,
    designPrice,
    designNotes,
  } = body as {
    date: string;
    customerName: string;
    phoneNumber: string;
    nailTechId?: number;
    nailTechName?: string;
    serviceId: number | string;
    addDesign?: boolean;
    designPrice?: number;
    designNotes?: string;
  };

  if (!serviceId) {
    return NextResponse.json(
      { error: "Please select a service." },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const svc = await prisma.service.findUnique({
      where: { id: Number(serviceId) },
      select: {
        id: true,
        name: true,
        active: true,
        priceCents: true,
        designMode: true,
        designPriceCents: true,
        durationMin: true,
      },
    });
    if (!svc || !svc.active) {
      return NextResponse.json({ error: "Invalid service." }, { status: 400 });
    }

    // Resolve/create tech if needed
    let finalNailTechId = nailTechId;
    if (!finalNailTechId && nailTechName) {
      const created = await prisma.nailTech.upsert({
        where: { name: nailTechName },
        update: {},
        create: { name: nailTechName },
        select: { id: true },
      });
      finalNailTechId = created.id;
    }

    // date should be a valid UTC ISO (e.g. "2025-09-07T21:30:00.000Z")
    const appointmentDate = new Date(date);
    if (Number.isNaN(appointmentDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    // simple same-minute guard
    if (finalNailTechId) {
      const conflict = await prisma.appointment.findFirst({
        where: { nailTechId: finalNailTechId, date: appointmentDate },
        select: { id: true },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "This nail tech already has an appointment at that time." },
          { status: 409 }
        );
      }
    }

    // design snapshot
    const wantsDesign = Boolean(addDesign);
    let hasDesign = false;
    let designPriceCentsSnapshot: number | null = null;
    const designNotesSanitized =
      typeof designNotes === "string" && designNotes.trim()
        ? designNotes.trim().slice(0, 200)
        : null;

    if (wantsDesign) {
      if (svc.designMode === "none") {
        return NextResponse.json(
          { error: "Design is not available for this service." },
          { status: 400 }
        );
      }
      if (svc.designMode === "fixed") {
        if (svc.designPriceCents == null) {
          return NextResponse.json(
            { error: "Design price is not configured for this service." },
            { status: 400 }
          );
        }
        hasDesign = true;
        designPriceCentsSnapshot = svc.designPriceCents;
      }
      if (svc.designMode === "custom") {
        if (typeof designPrice !== "number" || !(designPrice > 0)) {
          return NextResponse.json(
            {
              error: "Design price is required and must be > 0.",
              field: "designPrice",
            },
            { status: 400 }
          );
        }
        hasDesign = true;
        designPriceCentsSnapshot = Math.round(designPrice * 100);
      }
    }

    const created = await prisma.appointment.create({
      data: {
        date: appointmentDate,
        userId: user.id,
        status: "confirmed",
        customerName,
        phoneNumber,
        nailTechId: finalNailTechId ?? null,

        serviceId: svc.id,
        serviceName: svc.name,
        priceCents: svc.priceCents,

        hasDesign,
        designPriceCents: hasDesign ? designPriceCentsSnapshot : null,
        designNotes: hasDesign ? designNotesSanitized : null,
      },
      select: {
        id: true,
        date: true,
        customerName: true,
        phoneNumber: true,
        status: true,
        nailTech: { select: { id: true, name: true } },
        serviceId: true,
        serviceName: true,
        priceCents: true,
        hasDesign: true,
        designPriceCents: true,
        designNotes: true,
      },
    });

    // return date as ISO so client typing is consistent
    return NextResponse.json(
      {
        success: true,
        appointment: { ...created, date: created.date.toISOString() },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create appointment error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const url = new URL(req.url);
  const ymd = url.searchParams.get("date"); // "YYYY-MM-DD"

  // LA-local day window -> UTC instants
  const whereDate = ymd
    ? (() => {
        const start = fromZonedTime(`${ymd}T00:00:00`, APP_TZ); // LA midnight -> UTC
        const end = new Date(start); // next LA midnight -> UTC
        end.setUTCDate(end.getUTCDate() + 1);
        return { date: { gte: start, lt: end } };
      })()
    : {};

  const rows = await prisma.appointment.findMany({
    where: whereDate,
    orderBy: { date: "asc" },
    select: {
      id: true,
      date: true,
      customerName: true,
      phoneNumber: true,
      status: true,
      nailTech: { select: { id: true, name: true } },
      serviceId: true,
      serviceName: true,
      priceCents: true,
      hasDesign: true,
      designPriceCents: true,
      designNotes: true,
      service: { select: { durationMin: true } },
    },
  });

  return NextResponse.json({
    appointments: rows.map((a) => ({
      id: a.id,
      date: a.date.toISOString(), // normalize to ISO string
      customerName: a.customerName,
      phoneNumber: a.phoneNumber,
      status: a.status,
      nailTech: a.nailTech, // { id, name } | null
      serviceId: a.serviceId,
      serviceName: a.serviceName,
      priceCents: a.priceCents,
      hasDesign: a.hasDesign,
      designPriceCents: a.designPriceCents,
      designNotes: a.designNotes,
      serviceDurationMin: a.service?.durationMin ?? null,
    })),
  });
}
