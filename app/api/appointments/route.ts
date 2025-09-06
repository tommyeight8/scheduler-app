import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    date,
    customerName,
    phoneNumber,
    nailTechId,
    nailTechName,
    serviceId,
    addDesign,
    designPrice, // USD number when custom
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

    // Resolve or create nail tech
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

    const appointmentDate = new Date(date);

    // Same-minute guard (you should also have a duration-overlap check server-side)
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

    // Design snapshot
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

    // Create with snapshots
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
        // ✅ include id here
        nailTech: { select: { id: true, name: true } },
        serviceId: true,
        serviceName: true,
        priceCents: true,
        hasDesign: true,
        designPriceCents: true,
        designNotes: true,
      },
    });

    return NextResponse.json(
      { success: true, appointment: created },
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
  const date = url.searchParams.get("date");

  const whereDate = date
    ? {
        date: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lt: new Date(`${date}T23:59:59.999Z`),
        },
      }
    : {};

  const appointments = await prisma.appointment.findMany({
    where: whereDate,
    orderBy: { date: "asc" },
    select: {
      id: true,
      date: true,
      customerName: true,
      phoneNumber: true,
      status: true,
      // ✅ include id here too
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

  const shaped = appointments.map((a) => ({
    id: a.id,
    date: a.date,
    customerName: a.customerName,
    phoneNumber: a.phoneNumber,
    status: a.status,
    // ✅ pass through id + name so the client can compare tech ids
    nailTech: a.nailTech, // { id, name } | null

    serviceId: a.serviceId,
    serviceName: a.serviceName,
    priceCents: a.priceCents,

    hasDesign: a.hasDesign,
    designPriceCents: a.designPriceCents,
    designNotes: a.designNotes,

    serviceDurationMin: a.service?.durationMin ?? null,
  }));

  return NextResponse.json({ appointments: shaped });
}
