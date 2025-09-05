// hooks/useRevenue.ts
"use client";
import { useQuery } from "@tanstack/react-query";

export type RevenuePoint = {
  bucketStart: string; // ISO
  count: number; // # done appts
  revenueCents: number; // sum in cents
};

export function useRevenue(params: {
  granularity: "day" | "week" | "month";
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  tz: string; // IANA, e.g. "America/Los_Angeles"
}) {
  const qs = new URLSearchParams({
    granularity: params.granularity,
    tz: params.tz,
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
  }).toString();

  return useQuery({
    queryKey: ["analytics", "revenue", params],
    queryFn: async () => {
      const r = await fetch(`/api/analytics/revenue?${qs}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error("Failed to load revenue");
      return (await r.json()) as { data: RevenuePoint[] };
    },
    select: (res) => res.data,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
