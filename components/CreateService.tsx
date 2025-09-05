// components/CreateService.tsx
"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useCreateService } from "@/hooks/useServices";
import LoadingSpinner from "./LoadingSpinner";

type Props = {
  className?: string;
  onCreated?: (service: {
    id: number;
    name: string;
    priceCents: number;
    durationMin?: number | null;
    active: boolean;
  }) => void;
};

type DesignMode = "none" | "fixed" | "custom";
type PresetRow = { id: string; label: string; price: string }; // USD string

export default function CreateService({ className, onCreated }: Props) {
  // base fields
  const [name, setName] = useState("");
  const [price, setPrice] = useState(""); // USD string
  const [duration, setDuration] = useState(""); // minutes (optional)

  // design config
  const [designMode, setDesignMode] = useState<DesignMode>("none");
  const [fixedDesignPrice, setFixedDesignPrice] = useState(""); // USD string
  const [presets, setPresets] = useState<PresetRow[]>([]); // for custom

  // validation state
  const [errors, setErrors] = useState<{
    name?: string;
    price?: string;
    fixedDesignPrice?: string;
    presets?: string;
  }>({});

  // 🔹 TanStack mutation
  const createService = useCreateService();
  const submitting = createService.isPending;

  const basePriceCents = Math.round((Number(price) || 0) * 100);
  const fixedPriceCents = Math.round((Number(fixedDesignPrice) || 0) * 100);

  function validate() {
    const errs: typeof errors = {};

    if (!name.trim()) errs.name = "Service name is required.";
    if (!price.trim()) errs.price = "Price is required.";
    else if (isNaN(basePriceCents) || basePriceCents <= 0)
      errs.price = "Enter a valid price.";

    if (designMode === "fixed") {
      if (!fixedDesignPrice.trim())
        errs.fixedDesignPrice = "Design price is required.";
      else if (isNaN(fixedPriceCents) || fixedPriceCents <= 0)
        errs.fixedDesignPrice = "Enter a valid design price.";
    }

    if (designMode === "custom") {
      const bad = presets.some(
        (p) => p.price.trim() !== "" && !(Number(p.price) > 0)
      );
      if (bad) errs.presets = "Each preset must have a valid positive price.";
    }

    return errs;
  }

  function addPreset() {
    setPresets((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "", price: "" },
    ]);
  }
  function removePreset(id: string) {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }
  function updatePreset(id: string, patch: Partial<PresetRow>) {
    setPresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  }

  const payloadDesignPriceOptions = useMemo(
    () =>
      designMode === "custom"
        ? presets
            .filter((p) => p.price.trim() && Number(p.price) > 0)
            .map((p) => ({
              label: p.label?.trim() ? p.label.trim() : undefined,
              priceCents: Math.round(Number(p.price) * 100),
            }))
        : [],
    [designMode, presets]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const body: any = {
      name: name.trim(),
      priceCents: basePriceCents,
      durationMin: duration ? Number(duration) : undefined,
      active: true,
      designMode,
      designPriceCents: designMode === "fixed" ? fixedPriceCents : null, // server will normalize if not fixed
      ...(designMode === "custom" && payloadDesignPriceOptions.length
        ? { designPriceOptions: payloadDesignPriceOptions }
        : {}),
    };

    try {
      const created = await createService.mutateAsync(body);

      // reset form
      setName("");
      setPrice("");
      setDuration("");
      setDesignMode("none");
      setFixedDesignPrice("");
      setPresets([]);
      setErrors({});

      onCreated?.(created as any);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create service.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={className ?? "bg-white p-4 rounded-xl shadow-lg/5"}
    >
      <h2 className="text-lg font-semibold mb-3">Add Service</h2>

      <div className="grid gap-3 md:grid-cols-4">
        {/* Name */}
        <div>
          <input
            className="rounded px-3 py-2 w-full bg-gray-50 border border-gray-300"
            placeholder="Service name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            aria-label="Service name"
          />
          {errors.name && (
            <p className="text-xs text-red-500 mt-1">{errors.name}</p>
          )}
        </div>

        {/* Base price */}
        <div>
          <input
            className="rounded px-3 py-2 w-full bg-gray-50 border border-gray-300"
            placeholder="Price (USD)"
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={submitting}
            aria-label="Price (USD)"
          />
          {errors.price && (
            <p className="text-xs text-red-500 mt-1">{errors.price}</p>
          )}
        </div>

        {/* Duration */}
        <div>
          <input
            className="rounded px-3 py-2 w-full bg-gray-50 border border-gray-300"
            placeholder="Duration (min) – optional"
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            disabled={submitting}
            aria-label="Duration (minutes)"
          />
        </div>

        {/* Submit */}
        <div className="flex items-start">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-violet-600 hover:bg-violet-500 transition duration-150 cursor-pointer text-white px-4 py-2 disabled:opacity-50"
          >
            {submitting ? <LoadingSpinner text="Adding" /> : "Add Service"}
          </button>
        </div>
      </div>

      {/* Design config */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-300 rounded-lg">
        <div className="font-medium mb-2">Design add-on</div>

        <div className="flex flex-wrap gap-4 mb-3">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="designMode"
              value="none"
              checked={designMode === "none"}
              onChange={() => setDesignMode("none")}
              disabled={submitting}
            />
            <span>None</span>
          </label>

          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="designMode"
              value="fixed"
              checked={designMode === "fixed"}
              onChange={() => setDesignMode("fixed")}
              disabled={submitting}
            />
            <span>Fixed price</span>
          </label>

          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="designMode"
              value="custom"
              checked={designMode === "custom"}
              onChange={() => setDesignMode("custom")}
              disabled={submitting}
            />
            <span>Custom (set at booking)</span>
          </label>
        </div>

        {/* Fixed price input */}
        {designMode === "fixed" && (
          <div>
            <input
              className="rounded px-3 py-2 w-full bg-white border border-gray-300"
              placeholder="Design add-on price (USD)"
              type="number"
              step="0.01"
              value={fixedDesignPrice}
              onChange={(e) => setFixedDesignPrice(e.target.value)}
              disabled={submitting}
              aria-label="Design add-on price (USD)"
            />
            {errors.fixedDesignPrice && (
              <p className="text-xs text-red-500 mt-1">
                {errors.fixedDesignPrice}
              </p>
            )}
          </div>
        )}

        {/* Custom presets */}
        {designMode === "custom" && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">
                Optional presets shown during booking.
              </div>
              <button
                type="button"
                onClick={addPreset}
                disabled={submitting}
                className="text-sm rounded px-2 py-1 bg-gray-200 hover:bg-gray-300"
              >
                + Add Preset
              </button>
            </div>

            {presets.length === 0 ? (
              <div className="text-xs text-gray-500">
                No presets added. Clients can still enter a custom price at
                booking.
              </div>
            ) : (
              <div className="space-y-2">
                {presets.map((p) => (
                  <div key={p.id} className="grid grid-cols-5 gap-2">
                    <input
                      className="col-span-3 rounded px-3 py-2 bg-white border border-gray-300"
                      placeholder="Label (optional)"
                      value={p.label}
                      onChange={(e) =>
                        updatePreset(p.id, { label: e.target.value })
                      }
                      disabled={submitting}
                      aria-label="Preset label"
                    />
                    <input
                      className="col-span-1 rounded px-3 py-2 bg-white border border-gray-300"
                      placeholder="Price (USD)"
                      type="number"
                      step="0.01"
                      value={p.price}
                      onChange={(e) =>
                        updatePreset(p.id, { price: e.target.value })
                      }
                      disabled={submitting}
                      aria-label="Preset price (USD)"
                    />
                    <button
                      type="button"
                      onClick={() => removePreset(p.id)}
                      className="col-span-1 rounded px-3 py-2 bg-rose-100 text-rose-600 hover:bg-rose-200"
                      disabled={submitting}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {errors.presets && (
              <p className="text-xs text-red-500 mt-2">{errors.presets}</p>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
