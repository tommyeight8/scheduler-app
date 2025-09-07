// hooks/useAppointments.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { AppointmentStatus } from "@/app/generated/prisma";

export type Appointment = {
  id: number;
  date: string;
  customerName: string;
  phoneNumber: string;
  status: AppointmentStatus;
  nailTech: { name: string } | null;

  serviceId?: number | null;
  serviceName: string;
  priceCents: number;

  hasDesign: boolean;
  designPriceCents?: number | null;
  designNotes?: string | null;

  serviceDurationMin?: number | null;
};

async function getJSON<T>(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(await r.text().catch(() => "Request failed"));
  return r.json() as Promise<T>;
}

const isYMD = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Fetch appointments scoped to a YYYY-MM-DD date.
 *  You can pass `initial` from the server page to hydrate the first render.
 */
export function useAppointments(date?: string, initial?: Appointment[]) {
  const enabled = isYMD(date);
  const key = ["appointments", enabled ? date : "pending"] as const;

  return useQuery({
    queryKey: key,
    queryFn: async () =>
      (
        await getJSON<{ appointments: Appointment[] }>(
          `/api/appointments/date/${date}`
        )
      ).appointments ?? [],
    enabled, // don't run until date is valid
    ...(initial && enabled ? { initialData: initial } : {}),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

export function useUpdateAppointmentStatus(date?: string) {
  const qc = useQueryClient();
  const key = ["appointments", isYMD(date) ? date : "pending"] as const;

  return useMutation({
    mutationFn: async (vars: { id: number; status: AppointmentStatus }) => {
      const r = await fetch(`/api/appointments/${vars.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: vars.status }),
      });
      if (!r.ok) throw new Error("Failed to update status");
      return vars;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Appointment[]>(key);
      if (prev) {
        qc.setQueryData<Appointment[]>(
          key,
          prev.map((a) => (a.id === id ? { ...a, status } : a))
        );
      }
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Error updating status");
    },
    onSuccess: () => {
      toast.success("Status updated");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
