// app/api/analytics/revenue/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs"; // Prisma must run on Node

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gran = (searchParams.get("granularity") ?? "day") as
      | "day"
      | "week"
      | "month";
    const from = searchParams.get("from"); // YYYY-MM-DD (optional)
    const to = searchParams.get("to"); // YYYY-MM-DD (optional)
    const tz = searchParams.get("tz") ?? "America/Los_Angeles";

    const g = gran === "week" ? "week" : gran === "month" ? "month" : "day";

    // Simple UTC-day bounds; if you need shop-TZ day bounds, we can adjust.
    const fromTs = from ? new Date(`${from}T00:00:00.000Z`) : null;
    const toTs = to ? new Date(`${to}T23:59:59.999Z`) : null;

    const rows = await prisma.$queryRaw<
      { bucket_start: Date; appt_count: bigint; revenue_cents: bigint }[]
    >`
      SELECT
        date_trunc(${g}, ("date" AT TIME ZONE ${tz})) AS bucket_start,
        COUNT(*) FILTER (WHERE "status" = 'done'::"AppointmentStatus") AS appt_count,
        COALESCE(SUM(
          CASE WHEN "status" = 'done'::"AppointmentStatus"
               THEN "priceCents" + COALESCE("designPriceCents", 0)
               ELSE 0
          END
        ), 0) AS revenue_cents
      FROM "Appointment"
      WHERE (${fromTs}::timestamptz IS NULL OR "date" >= ${fromTs})
        AND (${toTs}::timestamptz   IS NULL OR "date" <  ${toTs})
      GROUP BY 1
      ORDER BY 1 ASC;
    `;

    const data = rows.map((r) => ({
      bucketStart: r.bucket_start.toISOString(),
      count: Number(r.appt_count ?? 0),
      revenueCents: Number(r.revenue_cents ?? 0),
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("Revenue route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
