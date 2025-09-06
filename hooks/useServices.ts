// hooks/useServices.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { Service } from "@/components/ServiceList";
import { qk } from "@/lib/queryKeys";

type NailTech = { id: number; name: string };

type ServiceWithDesign = Service & {
  designMode?: "none" | "fixed" | "custom";
  designPriceCents?: number | null;
};

// ---------- helpers ----------

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  // try to parse error JSON -> fallback to text
  if (!r.ok) {
    let msg = "Request failed";
    try {
      const j = await r.json();
      msg = j?.error ?? msg;
    } catch {
      try {
        msg = await r.text();
      } catch {}
    }
    throw new Error(msg);
  }

  // handle empty
  const text = await r.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);

  if (!r.ok) {
    let msg = "Request failed";
    try {
      const j = await r.json();
      msg = j?.error ?? msg;
    } catch {
      try {
        msg = await r.text();
      } catch {}
    }
    throw new Error(msg);
  }

  // 204 No Content or empty body tolerance
  if (r.status === 204) return {} as T;
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await r.text().catch(() => "");
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return {} as T;
    }
  }
  return r.json();
}

// ---------- Nail Tech ----------

export function useCreateNailTech() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const d = await postJSON<{ nailTech: NailTech }>("/api/nail-tech", {
        name,
      });
      return d.nailTech;
    },

    // optimistic insert
    onMutate: async (name) => {
      await qc.cancelQueries({ queryKey: qk.nailTechs() });
      const prev = qc.getQueryData<NailTech[]>(qk.nailTechs());
      const temp: NailTech = { id: -Date.now(), name };
      if (prev) qc.setQueryData(qk.nailTechs(), [...prev, temp]);
      return { prev, tempId: temp.id };
    },

    onError: (err: Error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.nailTechs(), ctx.prev);
      toast.error(err.message || "Failed to create nail tech.");
    },

    onSuccess: (created, _vars, ctx) => {
      const list = qc.getQueryData<NailTech[]>(qk.nailTechs());
      if (list && ctx?.tempId) {
        qc.setQueryData<NailTech[]>(
          qk.nailTechs(),
          list.map((t) => (t.id === ctx.tempId ? created : t))
        );
      } else {
        qc.setQueryData<NailTech[]>(qk.nailTechs(), (prev = []) => [
          ...prev,
          created,
        ]);
      }
      toast.success("Nail tech created");
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.nailTechs() });
    },
  });
}

// ---------- Services ----------

export function useServices() {
  return useQuery({
    queryKey: qk.services(),
    queryFn: async () => {
      const d = await fetchJSON<{ services: ServiceWithDesign[] }>(
        "/api/services"
      );
      return d.services ?? [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useNailTechs() {
  return useQuery({
    queryKey: qk.nailTechs(),
    queryFn: async () => {
      const d = await fetchJSON<{ nailTechs: { id: number; name: string }[] }>(
        "/api/nail-tech"
      );
      return d.nailTechs ?? [];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      id: number;
      patch: Partial<ServiceWithDesign>;
    }) => {
      // Works with 200 + JSON or 204 No Content
      await fetchJSON(`/api/services/${vars.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(vars.patch),
      });
      return vars;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.services() });
      const prev = qc.getQueryData<ServiceWithDesign[]>(qk.services());
      if (prev) {
        qc.setQueryData<ServiceWithDesign[]>(
          qk.services(),
          prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.services(), ctx.prev);
      toast.error("Failed to update");
    },
    onSuccess: () => {
      toast.success("Updated");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.services() });
    },
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      // Accepts { softDeleted?: boolean }, { ok?: boolean }, or 204
      try {
        const d = await fetchJSON<{ softDeleted?: boolean; ok?: boolean }>(
          `/api/services/${id}`,
          { method: "DELETE" }
        );
        return d;
      } catch (e: any) {
        // Re-throw so onError runs
        throw e;
      }
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.services() });
      const prev = qc.getQueryData<ServiceWithDesign[]>(qk.services());
      if (prev) {
        qc.setQueryData<ServiceWithDesign[]>(
          qk.services(),
          prev.filter((s) => s.id !== id)
        );
      }
      return { prev };
    },
    onError: (e: any, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.services(), ctx.prev);
      toast.error(e?.message || "Delete failed");
    },
    onSuccess: (d) => {
      if (d?.softDeleted) {
        toast("Service in use → set to inactive.");
      } else {
        toast.success("Deleted");
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.services() });
    },
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      priceCents: number;
      durationMin?: number | null;
      active?: boolean;
      designMode?: "none" | "fixed" | "custom";
      designPriceCents?: number | null;
      designPriceOptions?: { label?: string; priceCents: number }[];
    }) => {
      const r = await fetch("/api/services", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        let msg = "Failed to create service";
        try {
          const j = await r.json();
          msg = j?.error ?? msg;
        } catch {
          try {
            msg = await r.text();
          } catch {}
        }
        throw new Error(msg);
      }

      // tolerate either { service } or the entity itself
      const text = await r.text();
      if (!text) return {} as ServiceWithDesign;
      try {
        const data = JSON.parse(text);
        return (data.service ?? data) as ServiceWithDesign;
      } catch {
        return {} as ServiceWithDesign;
      }
    },

    // optimistic insert
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: qk.services() });
      const prev = qc.getQueryData<ServiceWithDesign[]>(qk.services());
      const temp: ServiceWithDesign = {
        id: -Date.now(),
        name: body.name,
        priceCents: body.priceCents,
        durationMin: body.durationMin ?? null,
        active: body.active ?? true,
        designMode: body.designMode ?? "none",
        designPriceCents: body.designPriceCents ?? null,
      };
      if (prev) qc.setQueryData(qk.services(), [temp, ...prev]);
      return { prev, tempId: temp.id };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.services(), ctx.prev);
      toast.error(err.message || "Failed to create service.");
    },
    onSuccess: (created, _vars, ctx) => {
      const list = qc.getQueryData<ServiceWithDesign[]>(qk.services());
      if (list && ctx?.tempId) {
        qc.setQueryData<ServiceWithDesign[]>(
          qk.services(),
          list.map((s) => (s.id === ctx.tempId ? created : s))
        );
      } else {
        qc.setQueryData<ServiceWithDesign[]>(qk.services(), (prev = []) => [
          created,
          ...prev,
        ]);
      }
      toast.success("Service created");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.services() });
    },
  });
}
