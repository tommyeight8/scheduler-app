// hooks/useBookingData.tsx  (your first file)
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { qk } from "@/lib/queryKeys";

// --- types (unchanged) ---
type Appointment = {
  id: number | string;
  date: string; // ISO UTC from API
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

/** Appointments looked up for a specific LA-local day (YYYY-MM-DD). */
// hooks/useBookingData.tsx
export function useAppointmentsForDay(ymd: string | null) {
  const enabled = !!ymd;
  const key = enabled ? qk.apptsByDate(ymd!) : qk.apptsByDate("pending");

  return useQuery({
    queryKey: key,
    enabled,
    queryFn: async () => {
      const r = await fetch(`/api/appointments?date=${ymd}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error("Failed to load appointments");
      const { appointments } = (await r.json()) as {
        appointments: Appointment[];
      };
      return appointments ?? [];
    },
    refetchOnWindowFocus: false,
    staleTime: 30_000,
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
      const day = vars._dayISO as string | undefined; // <-- LA yyyy-MM-dd
      if (day)
        qc.invalidateQueries({ queryKey: qk.apptsByDate(day), exact: true });
      if (vars.nailTechName && !vars.nailTechId) {
        qc.invalidateQueries({ queryKey: qk.nailTechs(), exact: true });
      }
      toast.success("Appointment booked successfully!");
    },
    onError: (e: any) =>
      toast.error(e?.message || "Failed to book appointment."),
  });
}
