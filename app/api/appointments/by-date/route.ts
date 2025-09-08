import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { fromZonedTime } from "date-fns-tz";

const APP_TZ = "America/Los_Angeles";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const ymd = url.searchParams.get("date"); // "YYYY-MM-DD" in LA
  if (!ymd)
    return NextResponse.json({ error: "Date is required" }, { status: 400 });

  // LA 00:00 → UTC, then next day
  const start = fromZonedTime(`${ymd}T00:00:00`, APP_TZ);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const rows = await prisma.appointment.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
    include: { nailTech: true },
  });

  return NextResponse.json({
    appointments: rows.map((a) => ({
      ...a,
      date: a.date.toISOString(), // client-friendly
    })),
  });
}
