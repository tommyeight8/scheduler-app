"use client";

import ConfirmDelete from "@/components/ConfirmDelete";
import toast from "react-hot-toast";
import CreateNailTech from "@/components/CreateNailTech";
import CreateService from "@/components/CreateService";
import ServiceList, { Service } from "@/components/ServiceList";
import NailTechList from "@/components/NailTectList";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  useDeleteService,
  useNailTechs,
  useServices,
  useUpdateService,
} from "@/hooks/useServices";
import RevenueChart from "@/components/RevenueChart";

type ServiceWithDesign = Service & {
  designMode?: "none" | "fixed" | "custom";
  designPriceCents?: number | null;
};
type NailTech = { id: number; name: string };

export default function ServicesAdminPage() {
  const router = useRouter();

  const { data: services = [], isLoading: loadingServices } = useServices();
  const {
    data: nailTechs = [],
    isLoading: loadingTechs,
    refetch: refetchTechs,
  } = useNailTechs();

  const updateSvc = useUpdateService();
  const deleteSvc = useDeleteService();

  // DELETE MODAL
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // EDIT FIXED DESIGN PRICE MODAL
  const [editTarget, setEditTarget] = useState<ServiceWithDesign | null>(null);

  const activeServices = useMemo(
    () => services.filter((s) => s.active),
    [services]
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <RevenueChart />

      <CreateNailTech
        className="bg-white p-4 rounded-xl shadow-lg/5"
        onCreated={() => refetchTechs()}
      />

      <NailTechList
        techs={nailTechs as NailTech[]}
        loading={loadingTechs}
        onView={(id) => router.push(`/admin/nail-tech/${id}`)}
      />

      <CreateService
        className="bg-white p-4 rounded-xl shadow-lg/5"
        onCreated={() => {
          // Easiest: invalidate by querying again
          // (Because CreateService probably POSTs; after success, you can invalidate here too.)
          // If CreateService can accept a callback, call qc.invalidateQueries(['services']) there.
          toast.success("Created");
        }}
      />

      <ServiceList
        services={services}
        loading={loadingServices}
        onUpdate={(id, patch) => updateSvc.mutate({ id, patch })}
        onRequestDelete={(id, name) => setPendingDelete({ id, name })}
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
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteSvc.mutateAsync(pendingDelete.id);
          setPendingDelete(null);
        }}
      />

      {editTarget && editTarget.designMode === "fixed" && (
        <EditDesignPriceModal
          service={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(cents) => {
            updateSvc.mutate({
              id: editTarget.id,
              patch: { designPriceCents: cents },
            });
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
