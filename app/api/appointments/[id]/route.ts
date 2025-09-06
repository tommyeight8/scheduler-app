// app/api/appointments/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// If your Prisma field names are `finished_at` and `total_cents` (snake_case),
// this file will work as-is. If you used camelCase in Prisma (e.g. finishedAt,
// totalCents), just rename those two properties below accordingly.

const StatusSchema = z.enum(["confirmed", "cancelled", "done"]);

// helper: get numeric id whether ctx.params is object or Promise
async function getNumericId(ctx: any): Promise<number | null> {
  const p = await ctx?.params;
  const raw = Array.isArray(p?.id) ? p.id[0] : p?.id;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function PATCH(req: NextRequest, ctx: any) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await getNumericId(ctx);
  if (id == null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = StatusSchema.safeParse(body?.status);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const nextStatus = parsed.data;

  // Read price snapshots so we can stamp total when marking done
  const snap = await prisma.appointment.findUnique({
    where: { id },
    select: {
      priceCents: true,
      designPriceCents: true,
      status: true,
    },
  });
  if (!snap) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Build update
  // NOTE: if your Prisma fields are camelCase (finishedAt/totalCents),
  // change the keys below accordingly.
  const updateData: any = {
    status: nextStatus,
  };

  if (nextStatus === "done") {
    const total = (snap.priceCents ?? 0) + (snap.designPriceCents ?? 0);
    updateData.finished_at = new Date(); // ← or finishedAt
    updateData.total_cents = total; // ← or totalCents
  } else {
    // If reverting from done, clear finish markers so revenue excludes it
    updateData.finished_at = null; // ← or finishedAt
    updateData.total_cents = null; // ← or totalCents
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: updateData,
    include: {
      nailTech: true,
    },
  });

  return NextResponse.json({ appointment: updated });
}
