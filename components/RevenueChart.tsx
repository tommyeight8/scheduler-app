// components/RevenueChart.tsx
"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useRevenue } from "@/hooks/useRevenue";
import { formatInTimeZone } from "date-fns-tz";
import { addDays } from "date-fns";
import { APP_TZ } from "@/utils/datetime";
import LoadingSpinner from "./LoadingSpinner";

const nf = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function RevenueChart({
  defaultGranularity = "day",
  from,
  to,
  tz = APP_TZ, // 👈 default to LA
}: {
  defaultGranularity?: "day" | "week" | "month";
  from?: string;
  to?: string;
  tz?: string;
}) {
  const [gran, setGran] = useState<"day" | "week" | "month">(
    defaultGranularity
  );

  // If you pass from/to, they’ll be sent to the hook as-is.
  // The API should bucket using the provided `tz` (LA) on the server.
  const { data = [], isLoading } = useRevenue({
    granularity: gran,
    from,
    to,
    tz, // 👈 ensure server groups by LA-local boundaries
  });

  const chartData = useMemo(() => {
    return (data ?? []).map((d) => {
      // d.bucketStart should be an ISO timestamp at the *start* of the bucket in UTC.
      const start = new Date(d.bucketStart);

      // Labels rendered in LA time
      let label: string;
      if (gran === "month") {
        label = formatInTimeZone(start, tz, "LLL yyyy");
      } else if (gran === "week") {
        // Show LA-local week range like "Sep 8–Sep 14"
        const end = addDays(start, 6);
        const s = formatInTimeZone(start, tz, "LLL d");
        const e = formatInTimeZone(end, tz, "LLL d");
        label = `${s}–${e}`;
      } else {
        // day
        label = formatInTimeZone(start, tz, "LLL d");
      }

      return {
        x: label,
        revenue: d.revenueCents / 100,
        count: d.count,
      };
    });
  }, [data, gran, tz]);

  return (
    <div className="bg-white rounded-xl p-4 shadow-lg/5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2">
          <span className="font-semibold">Revenue</span>
          <span className="text-gray-600 bg-gray-200 px-3 py-1 rounded-3xl text-sm hidden md:inline-block">
            Finished Appointments
          </span>
        </h3>

        <div className="inline-flex rounded-lg overflow-hidden border border-gray-300">
          {(["day", "week", "month"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGran(g)}
              className={`px-3 py-1 text-sm ${
                gran === g
                  ? "bg-violet-600 text-white"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              {g[0].toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 grid place-items-center text-gray-500">
          <LoadingSpinner />
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-40 grid place-items-center text-gray-500">
          No data
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" />
              <YAxis
                yAxisId="left"
                tickFormatter={(v) => nf.format(v)}
                width={60}
              />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                // revenue in USD, count as plain int
                formatter={(value: any, name: string) =>
                  name === "revenue" ? nf.format(value) : value
                }
                labelFormatter={(label) => label}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                name="Revenue"
                fill="#8b5cf6"
              />
              <Bar
                yAxisId="right"
                dataKey="count"
                name="Appointments"
                fill="#afafaf"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-2 text-sm text-gray-500 flex gap-4">
        <span>
          Total: {nf.format(chartData.reduce((s, d) => s + d.revenue, 0))}
        </span>
        <span>Count: {chartData.reduce((s, d) => s + d.count, 0)}</span>
      </div>
    </div>
  );
}
