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

  // snapshots from your Prisma model:
  serviceId?: number | null;
  serviceName: string;
  priceCents: number; // base service price snapshot

  hasDesign: boolean;
  designPriceCents?: number | null;
  designNotes?: string | null;

  // optional derived for convenience (not required):
  serviceDurationMin?: number | null;
};

export const qk = {
  appts: (scope?: string | number | undefined) =>
    ["appointments", scope ?? "all"] as const,
};

async function getJSON<T>(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(await r.text().catch(() => "Request failed"));
  return r.json() as Promise<T>;
}

/** Scope can be a date string like YYYY-MM-DD, or undefined for "all". */
export function useAppointments(scope?: string) {
  const url = scope ? `/api/appointments?date=${scope}` : "/api/appointments";
  return useQuery({
    queryKey: qk.appts(scope),
    queryFn: async () =>
      (await getJSON<{ appointments: Appointment[] }>(url)).appointments ?? [],
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

export function useUpdateAppointmentStatus(scope?: string) {
  const qc = useQueryClient();
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
      await qc.cancelQueries({ queryKey: qk.appts(scope) });
      const prev = qc.getQueryData<Appointment[]>(qk.appts(scope));

      if (prev) {
        qc.setQueryData<Appointment[]>(
          qk.appts(scope),
          prev.map((a) => (a.id === id ? { ...a, status } : a))
        );
      }
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.appts(scope), ctx.prev);
      toast.error("Error updating status");
    },
    onSuccess: () => {
      toast.success("Status updated");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.appts(scope) });
    },
  });
}
