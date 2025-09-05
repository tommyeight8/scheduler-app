"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { qk } from "@/lib/queryKeys";

type Appointment = {
  id: number | string;
  date: string;
  status: string;
  nailTech?: { id: number | string; name: string };
};
type NailTech = { id: number; name: string };
type DesignPriceOption = {
  id: number;
  label?: string | null;
  priceCents: number;
};
type Service = {
  id: number;
  name: string;
  priceCents: number;
  durationMin?: number | null;
  designMode: "none" | "fixed" | "custom";
  designPriceCents?: number | null;
  designPriceOptions?: DesignPriceOption[];
};

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(await r.text().catch(() => "Request failed"));
  return r.json();
}

export function useServices() {
  return useQuery({
    queryKey: qk.services(),
    queryFn: async () =>
      (await getJSON<{ services: Service[] }>("/api/services")).services ?? [],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useNailTechs() {
  return useQuery({
    queryKey: qk.nailTechs(),
    queryFn: async () =>
      (await getJSON<{ nailTechs: NailTech[] }>("/api/nail-tech")).nailTechs ??
      [],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/** Appointments are looked up for the selected day. Pass an ISO for the day (e.g., 2025-09-05). */
export function useAppointmentsForDay(isoDate: string | null) {
  return useQuery({
    enabled: !!isoDate,
    queryKey: isoDate ? qk.apptsByDate(isoDate) : ["appointments", "disabled"],
    queryFn: async () =>
      (await getJSON<{ appointments: Appointment[] }>("/api/appointments"))
        .appointments ?? [],
    // If your /api/appointments accepts a date filter, switch to `/api/appointments?date=...`
    // and you’ll fetch only the day you need (faster).
    refetchOnWindowFocus: false,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed to book appointment.");
      return data;
    },
    onSuccess: (_data, vars) => {
      toast.success("Appointment booked successfully!");
      // Invalidate the specific day so the grid updates
      const isoDay = vars._dayISO as string | undefined;
      if (isoDay) qc.invalidateQueries({ queryKey: qk.apptsByDate(isoDay) });
      // If a new tech was added as part of booking, refresh techs
      if (vars.nailTechName && !vars.nailTechId) {
        qc.invalidateQueries({ queryKey: qk.nailTechs() });
      }
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to book appointment.");
    },
  });
}

export function useCreateNailTech() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const r = await fetch("/api/nail-tech", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error ?? "Failed to create nail tech.");
      return data.nailTech as NailTech;
    },
    onSuccess: () => {
      toast.success("Nail tech created");
      qc.invalidateQueries({ queryKey: qk.nailTechs() });
    },
    onError: (e: any) =>
      toast.error(e?.message || "Failed to create nail tech."),
  });
}
