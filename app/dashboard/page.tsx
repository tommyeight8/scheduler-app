// ServicesAdminPage.tsx
"use client";

import ConfirmDelete from "@/components/ConfirmDelete";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import CreateNailTech from "@/components/CreateNailTech";
import CreateService from "@/components/CreateService";
import ServiceList, { Service } from "@/components/ServiceList";
import NailTechList from "@/components/NailTectList";
import { useRouter } from "next/navigation";

// ⬇️ Extend type to include design fields
type NailTech = { id: number; name: string };
type ServiceWithDesign = Service & {
  designMode?: "none" | "fixed" | "custom";
  designPriceCents?: number | null;
};

export default function ServicesAdminPage() {
  const router = useRouter();

  // SERVICES
  const [services, setServices] = useState<ServiceWithDesign[]>([]);
  const [loading, setLoading] = useState(true);

  // NAIL TECHS
  const [nailTechs, setNailTechs] = useState<NailTech[]>([]);
  const [loadingTechs, setLoadingTechs] = useState(true);

  // DELETE MODAL
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // EDIT FIXED DESIGN PRICE MODAL
  const [editTarget, setEditTarget] = useState<ServiceWithDesign | null>(null);

  async function loadServices() {
    try {
      setLoading(true);
      const r = await fetch("/api/services");
      if (!r.ok) throw new Error();
      const d = await r.json();
      setServices(d.services ?? []);
    } catch {
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  }

  async function loadNailTechs() {
    try {
      setLoadingTechs(true);
      const r = await fetch("/api/nail-tech");
      if (!r.ok) throw new Error();
      const d = await r.json();
      setNailTechs(d.nailTechs ?? []);
    } catch {
      toast.error("Failed to load nail techs");
    } finally {
      setLoadingTechs(false);
    }
  }

  useEffect(() => {
    loadServices();
    loadNailTechs();
  }, []);

  async function updateService(id: number, patch: Partial<ServiceWithDesign>) {
    const r = await fetch(`/api/services/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!r.ok) return toast.error("Failed to update");
    toast.success("Updated");
    loadServices();
  }

  function handleTechCreated() {
    loadNailTechs();
  }

  async function deleteService(id: number) {
    const r = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (!r.ok) {
      toast.error("Delete failed");
      return setPendingDelete(null);
    }
    const d = await r.json();
    if (d.softDeleted) toast("Service in use → set to inactive.");
    else toast.success("Deleted");
    setPendingDelete(null);
    loadServices();
  }

  const activeServices = useMemo(
    () => services.filter((s) => s.active),
    [services]
  );

  return (
    <div className="p-6 space-y-6">
      <CreateNailTech
        className="bg-white p-4 rounded-xl shadow-lg/5"
        onCreated={handleTechCreated}
      />

      <NailTechList
        techs={nailTechs}
        loading={loadingTechs}
        onView={(id) => router.push(`/admin/nail-tech/${id}`)}
      />

      <CreateService
        className="bg-white p-4 rounded-xl shadow-lg/5"
        onCreated={() => loadServices()}
      />

      <ServiceList
        services={services}
        loading={loading}
        onUpdate={updateService}
        onRequestDelete={(id, name) => setPendingDelete({ id, name })}
        // ⬇️ new prop: open modal when clicking pencil
        onEditFixedPrice={(svc) => setEditTarget(svc)}
      />

      <div className="text-sm text-gray-500">
        Tip: “Delete” turns into “Deactivate” automatically if a service is
        referenced by appointments.
      </div>

      <ConfirmDelete
        open={!!pendingDelete}
        title="Delete service"
        message={`Delete "${pendingDelete?.name}"? This can’t be undone. If it’s used by appointments, it will be set inactive instead.`}
        confirmText="Delete"
        cancelText="Cancel"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteService(pendingDelete.id)}
      />

      {/* ⬇️ Edit fixed design price modal */}
      {editTarget && editTarget.designMode === "fixed" && (
        <EditDesignPriceModal
          service={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(cents) => {
            updateService(editTarget.id, { designPriceCents: cents });
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}

/** Small inline modal component */
function EditDesignPriceModal({
  service,
  onClose,
  onSaved,
}: {
  service: Service & { designPriceCents?: number | null };
  onClose: () => void;
  onSaved: (newCents: number) => void;
}) {
  const [price, setPrice] = useState(
    ((service.designPriceCents ?? 0) / 100).toFixed(2)
  );
  const [saving, setSaving] = useState(false);

  const cents = Math.round((Number(price) || 0) * 100);
  const invalid = isNaN(cents) || cents <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-5 rounded-xl w-[92vw] max-w-sm shadow-lg">
        <h3 className="text-lg font-semibold mb-3">
          Edit Design Price — {service.name}
        </h3>
        <div className="space-y-2">
          <label className="block text-sm text-gray-600">
            Fixed add-on price (USD)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
          {invalid && (
            <p className="text-xs text-red-500">Enter a valid price &gt; 0.</p>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              if (invalid) return;
              setSaving(true);
              try {
                onSaved(cents);
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving || invalid}
            className="px-3 py-2 rounded bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
