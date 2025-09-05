import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();

  if (body.type !== "user.created") {
    return NextResponse.json({ message: "Ignored" }, { status: 200 });
  }

  const user = body.data;

  await prisma.user.upsert({
    where: { clerkUserId: user.id },
    update: {},
    create: {
      clerkUserId: user.id,
      email: user.email_addresses?.[0]?.email_address || "",
      name: user.first_name || "",
    },
  });

  return NextResponse.json({ success: true });
}
