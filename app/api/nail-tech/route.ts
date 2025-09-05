import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";

const CreateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
});

export async function GET() {
  // existing implementation you already have
  const nailTechs = await prisma.nailTech.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ nailTechs });
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

  const name = parsed.data.name.trim();

  // Enforce unique names (you already have a unique constraint in Prisma)
  try {
    const nailTech = await prisma.nailTech.create({ data: { name } });
    return NextResponse.json({ nailTech }, { status: 201 });
  } catch (err: any) {
    // P2002 = unique constraint violation
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "A nail tech with that name already exists." },
        { status: 409 }
      );
    }
    console.error("Create nail tech error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
