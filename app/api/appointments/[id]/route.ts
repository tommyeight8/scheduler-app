import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params; // 👈 Next 15: params is a Promise

  const body = await req.json();
  const { status } = body as { status?: string };

  if (!["confirmed", "cancelled", "done"].includes(status ?? "")) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const numericId = Number.parseInt(id, 10);
  if (Number.isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const updated = await prisma.appointment.update({
    where: { id: numericId },
    data: { status: status as "confirmed" | "cancelled" | "done" }, // tighten if you have a type/enum
    include: {
      nailTech: true, // ✅ this must be here
    },
  });

  return NextResponse.json({ appointment: updated });
}
