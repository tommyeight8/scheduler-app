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

    // Postgres date_trunc unit
    const g = gran === "week" ? "week" : gran === "month" ? "month" : "day";

    // Leave these as text and handle nulls in SQL; comparisons are done in LA-local time.
    const fromStr: string | null = from ?? null;
    const toStr: string | null = to ?? null;

    const rows = await prisma.$queryRaw<
      { bucket_start_utc: Date; appt_count: bigint; revenue_cents: bigint }[]
    >`
      SELECT
        -- Truncate *in LA local time*, then convert that local midnight back to UTC.
        (date_trunc(${g}, ("date" AT TIME ZONE ${tz})) AT TIME ZONE ${tz}) AS bucket_start_utc,
        COUNT(*) FILTER (WHERE "status" = 'done'::"AppointmentStatus") AS appt_count,
        COALESCE(SUM(
          CASE WHEN "status" = 'done'::"AppointmentStatus"
               THEN "priceCents" + COALESCE("designPriceCents", 0)
               ELSE 0
          END
        ), 0) AS revenue_cents
      FROM "Appointment"
      WHERE
        -- Filter by *LA-local day* window: from <= local time < to+1day
        (${fromStr}::text IS NULL OR ("date" AT TIME ZONE ${tz}) >= (${fromStr}::date))
        AND
        (${toStr}::text   IS NULL OR ("date" AT TIME ZONE ${tz}) <  ((${toStr}::date) + INTERVAL '1 day'))
      GROUP BY 1
      ORDER BY 1 ASC;
    `;

    const data = rows.map((r) => ({
      bucketStart: r.bucket_start_utc.toISOString(), // UTC ISO—safe for client
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
