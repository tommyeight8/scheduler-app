import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";

const DesignPricingModeSchema = z.enum(["none", "fixed", "custom"]);

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  priceCents: z.number().int().positive().optional(),
  durationMin: z.number().int().positive().optional().nullable(),
  active: z.boolean().optional(),

  // NEW
  designMode: DesignPricingModeSchema.optional(),
  designPriceCents: z.number().int().positive().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // We need the current values to validate cross-field invariants.
  const current = await prisma.service.findUnique({
    where: { id },
    select: { designMode: true, designPriceCents: true },
  });
  if (!current)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Compute the *next* state after applying the patch
  const nextDesignMode = parsed.data.designMode ?? current.designMode;
  const nextDesignPriceCents = Object.prototype.hasOwnProperty.call(
    parsed.data,
    "designPriceCents"
  )
    ? parsed.data.designPriceCents ?? null
    : current.designPriceCents;

  // Invariants
  if (nextDesignMode === "fixed") {
    if (nextDesignPriceCents == null || nextDesignPriceCents <= 0) {
      return NextResponse.json(
        {
          error: {
            formErrors: [],
            fieldErrors: {
              designPriceCents: [
                "Required and must be > 0 when designMode is 'fixed'.",
              ],
            },
          },
        },
        { status: 400 }
      );
    }
  } else {
    // none/custom → must be null
    if (nextDesignPriceCents != null) {
      return NextResponse.json(
        {
          error: {
            formErrors: [],
            fieldErrors: {
              designPriceCents: ["Must be null unless designMode is 'fixed'."],
            },
          },
        },
        { status: 400 }
      );
    }
  }

  // Normalize outgoing data:
  const data = {
    ...parsed.data,
    designMode: nextDesignMode,
    designPriceCents: nextDesignMode === "fixed" ? nextDesignPriceCents : null,
  };

  const svc = await prisma.service.update({ where: { id }, data });
  return NextResponse.json({ service: svc });
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  // Safe-delete: if referenced by appointments, set inactive; else hard delete.
  const used = await prisma.appointment.count({ where: { serviceId: id } });
  if (used > 0) {
    const svc = await prisma.service.update({
      where: { id },
      data: { active: false },
    });
    return NextResponse.json({ service: svc, softDeleted: true });
  }

  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
