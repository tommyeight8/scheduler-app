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
import { APP_TZ } from "@/utils/datetime";
import LoadingSpinner from "./LoadingSpinner";

const nf = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function RevenueChart({
  defaultGranularity = "day",
  from,
  to,
  tz = APP_TZ,
}: {
  defaultGranularity?: "day" | "week" | "month";
  from?: string;
  to?: string;
  tz?: string;
}) {
  const [gran, setGran] = useState<"day" | "week" | "month">(
    defaultGranularity
  );
  const { data = [], isLoading } = useRevenue({
    granularity: gran,
    from,
    to,
    tz,
  });

  const chartData = useMemo(() => {
    return (data ?? []).map((d) => {
      const dt = new Date(d.bucketStart);
      const label =
        gran === "month"
          ? formatInTimeZone(dt, tz, "LLL yyyy")
          : gran === "week"
          ? formatInTimeZone(dt, tz, "LLL d") + " wk"
          : formatInTimeZone(dt, tz, "LLL d");
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
        <h3>
          <span className="font-semibold">Revenue</span>
          <span className="text-gray-600 bg-gray-200 px-3 py-1 rounded-3xl text-sm hidden md:inline-block">
            Finised Appointments
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
