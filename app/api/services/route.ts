import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";

const DesignPricingModeSchema = z.enum(["none", "fixed", "custom"]);

const DesignPriceOptionSchema = z.object({
  label: z.string().trim().min(1).max(40).optional(),
  priceCents: z.number().int().positive(),
});
const CreateSchema = z
  .object({
    name: z.string().min(2),
    priceCents: z.number().int().positive(),
    durationMin: z.number().int().positive().optional(),
    active: z.boolean().optional().default(true),

    // design config
    designMode: DesignPricingModeSchema.optional().default("none"),
    designPriceCents: z.number().int().positive().nullable().optional(),

    // NEW: preset options (optional)
    designPriceOptions: z.array(DesignPriceOptionSchema).optional().default([]),
  })
  .superRefine((val, ctx) => {
    // Invariant: fixed requires a price; others must have null designPriceCents
    if (val.designMode === "fixed") {
      if (val.designPriceCents == null || val.designPriceCents <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["designPriceCents"],
          message:
            "designPriceCents is required and must be > 0 when designMode is 'fixed'.",
        });
      }
    } else if (val.designPriceCents != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["designPriceCents"],
        message: "designPriceCents must be null unless designMode is 'fixed'.",
      });
    }
  });

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const services = await prisma.service.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      // ✅ include presets so the booking modal can show them
      designPriceOptions: true,
    },
  });
  return NextResponse.json({ services });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json();
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Normalize: designPriceCents only when fixed
  const { designPriceOptions, ...rest } = parsed.data;
  const data = {
    ...rest,
    designPriceCents:
      rest.designMode === "fixed" ? rest.designPriceCents! : null,
    // Create any preset options alongside the service
    ...(designPriceOptions.length
      ? { designPriceOptions: { create: designPriceOptions } }
      : {}),
  };

  const svc = await prisma.service.create({
    data,
    include: { designPriceOptions: true }, // return presets too
  });

  return NextResponse.json({ service: svc }, { status: 201 });
}
