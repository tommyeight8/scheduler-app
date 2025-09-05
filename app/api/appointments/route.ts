import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    date,
    customerName,
    phoneNumber,
    nailTechId,
    nailTechName,
    serviceId,
    // NEW (optional inputs for design)
    addDesign,
    designPrice, // USD (number) only when service.designMode === "custom"
    designNotes, // optional string
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
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Ensure service exists and is active
    const svc = await prisma.service.findUnique({
      where: { id: Number(serviceId) },
      select: {
        id: true,
        name: true,
        active: true,
        priceCents: true,
        designMode: true, // "none" | "fixed" | "custom"
        designPriceCents: true, // when fixed
      },
    });
    if (!svc || !svc.active) {
      return NextResponse.json({ error: "Invalid service." }, { status: 400 });
    }

    // Create nail tech if only a name was passed
    let finalNailTechId = nailTechId as number | undefined;
    if (!finalNailTechId && nailTechName) {
      const newTech = await prisma.nailTech.create({
        data: { name: nailTechName },
      });
      finalNailTechId = newTech.id;
    }

    const appointmentDate = new Date(date);

    // Conflict: same tech, same minute
    if (finalNailTechId) {
      const conflict = await prisma.appointment.findFirst({
        where: { nailTechId: finalNailTechId, date: appointmentDate },
        select: { id: true },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "This nail tech already has an appointment at that time." },
          { status: 400 }
        );
      }
    }

    // ---- Design add-on logic (server-enforced) ----
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

    // Create appointment with snapshots (service + design)
    const appointment = await prisma.appointment.create({
      data: {
        date: appointmentDate,
        userId: user.id,
        status: "confirmed",
        customerName,
        phoneNumber,
        nailTechId: finalNailTechId,

        serviceId: svc.id,
        serviceName: svc.name, // snapshot
        priceCents: svc.priceCents, // snapshot (base)

        hasDesign,
        designPriceCents: hasDesign ? designPriceCentsSnapshot : null,
        designNotes: hasDesign ? designNotesSanitized : null,
      },
      include: { nailTech: true, service: true },
    });

    return NextResponse.json({ success: true, appointment });
  } catch (err) {
    console.error("Create appointment error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const appointments = await prisma.appointment.findMany({
    include: { nailTech: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ appointments });
}

// import { NextResponse } from "next/server";
// import { auth } from "@clerk/nextjs/server";

// import { prisma } from "@/lib/prisma";

// export async function POST(req: Request) {
//   const { userId: clerkUserId } = await auth();
//   if (!clerkUserId) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   const body = await req.json();
//   const { date, customerName, phoneNumber, nailTechId, nailTechName } = body;

//   try {
//     const user = await prisma.user.findUnique({ where: { clerkUserId } });
//     if (!user) {
//       return NextResponse.json({ error: "User not found" }, { status: 404 });
//     }

//     let finalNailTechId = nailTechId;

//     if (!nailTechId && nailTechName) {
//       const newTech = await prisma.nailTech.create({
//         data: { name: nailTechName },
//       });
//       finalNailTechId = newTech.id;
//     }

//     const appointment = await prisma.appointment.create({
//       data: {
//         date: new Date(date),
//         userId: user.id,
//         status: "confirmed",
//         customerName,
//         phoneNumber,
//         nailTechId: finalNailTechId,
//       },
//       include: {
//         nailTech: true, // ✅ include this
//       },
//     });

//     return NextResponse.json({ success: true, appointment });
//   } catch (err) {
//     console.error("Create appointment error:", err);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// export async function GET() {
//   const { userId: clerkUserId } = await auth();

//   if (!clerkUserId) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   const user = await prisma.user.findUnique({
//     where: { clerkUserId },
//   });

//   if (!user) {
//     return NextResponse.json({ error: "User not found" }, { status: 404 });
//   }

//   const appointments = await prisma.appointment.findMany({
//     include: { nailTech: true }, // ✅ Include nail tech relation
//     orderBy: { date: "desc" },
//   });

//   return NextResponse.json({ appointments });
// }
