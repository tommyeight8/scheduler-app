// ServiceList.tsx
"use client";

import { useMemo, useState } from "react";
import Skeleton from "./Skeleton";
import { FaTrash, FaPencilAlt } from "react-icons/fa"; // ⬅️ add
import { GiSaveArrow } from "react-icons/gi";

export type Service = {
  id: number;
  name: string;
  priceCents: number;
  durationMin?: number | null;
  active: boolean;

  // ⬇️ optional design fields for UI logic
  designMode?: "none" | "fixed" | "custom";
  designPriceCents?: number | null;
};

type Props = {
  services: Service[];
  loading?: boolean;
  onUpdate: (id: number, patch: Partial<Service>) => void;
  onRequestDelete: (id: number, name: string) => void;
  className?: string;

  // ⬇️ new prop
  onEditFixedPrice?: (svc: Service) => void;
};

export default function ServiceList({
  services,
  loading = false,
  onUpdate,
  onRequestDelete,
  className,
  onEditFixedPrice,
}: Props) {
  const rows = useMemo(() => services, [services]);

  const placeholderRows = Array.from({ length: 2 }).map((_, i) => (
    <tr key={`sk-${i}`} className="border-b border-gray-200">
      <td className="p-3">
        <Skeleton className="h-8 w-56 skeleton-shimmer" />
      </td>
      <td className="p-3">
        <Skeleton className="h-8 w-24 skeleton-shimmer" />
      </td>
      <td className="p-3">
        <Skeleton className="h-8 w-20 skeleton-shimmer" />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded skeleton-shimmer" />
          <Skeleton className="h-4 w-16 skeleton-shimmer" />
        </div>
      </td>
      <td className="p-3 text-right">
        <div className="inline-flex gap-2">
          <Skeleton className="h-8 w-16 skeleton-shimmer" />
          <Skeleton className="h-8 w-16 skeleton-shimmer" />
        </div>
      </td>
    </tr>
  ));

  return (
    <div
      className={className ?? "bg-white rounded-xl overflow-x-auto shadow-lg/5"}
    >
      <table className="w-full text-sm">
        <thead className="bg-violet-100 border-b border-b-violet-200">
          <tr>
            <th className="text-left p-3 text-gray-700">Serives</th>
            <th className="text-left p-3 text-gray-700">Price</th>
            <th className="text-left p-3 text-gray-700">Duration</th>
            <th className="text-left p-3 text-gray-700">Active</th>
            <th className="text-right p-3 text-gray-700">Actions</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            placeholderRows
          ) : rows.length === 0 ? (
            <tr>
              <td className="p-3" colSpan={5}>
                No services yet.
              </td>
            </tr>
          ) : (
            rows.map((s) => (
              <ServiceRow
                key={s.id}
                s={s}
                onUpdate={onUpdate}
                onRequestDelete={onRequestDelete}
                onEditFixedPrice={onEditFixedPrice}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ServiceRow({
  s,
  onUpdate,
  onRequestDelete,
  onEditFixedPrice,
}: {
  s: Service;
  onUpdate: (id: number, patch: Partial<Service>) => void;
  onRequestDelete: (id: number, name: string) => void;
  onEditFixedPrice?: (svc: Service) => void;
}) {
  const [name, setName] = useState(s.name);
  const [price, setPrice] = useState((s.priceCents / 100).toFixed(2));
  const [duration, setDuration] = useState(s.durationMin?.toString() ?? "");
  const [active, setActive] = useState(s.active);

  const dirty =
    name !== s.name ||
    price !== (s.priceCents / 100).toFixed(2) ||
    duration !== (s.durationMin?.toString() ?? "") ||
    active !== s.active;

  const priceCents = Math.round((Number(price) || 0) * 100);
  const priceInvalid = isNaN(priceCents) || priceCents <= 0;

  return (
    <tr className="border-b border-gray-200">
      <td className="p-3">
        <input
          className="rounded px-2 py-1 flex-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Service name"
        />
      </td>

      <td className="p-3">
        <input
          className="rounded px-2 py-1 w-32"
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          aria-label="Price (USD)"
        />
      </td>

      <td className="p-3">
        <input
          className="rounded px-2 py-1 w-28"
          type="number"
          placeholder="min"
          min="0"
          step="1"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          aria-label="Duration (minutes)"
        />
      </td>

      <td className="p-3">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            aria-label="Active"
          />
          <span className="text-sm text-gray-600">Active</span>
        </label>
      </td>

      <td className="p-3 text-right space-x-2 flex justify-end items-center gap-2">
        <button
          className="h-6 w-6 rounded-full flex justify-center items-center bg-gray-200 hover:bg-gray-100 transition duration-150 cursor-pointer disabled:opacity-50"
          disabled={!dirty || priceInvalid || !name.trim()}
          onClick={() =>
            onUpdate(s.id, {
              name: name.trim(),
              priceCents,
              durationMin: duration ? Number(duration) : null,
              active,
            })
          }
        >
          <GiSaveArrow />
        </button>

        {/* ⬇️ Pencil shows only when service has fixed design mode */}
        {s.designMode === "fixed" && (
          <button
            onClick={() => onEditFixedPrice?.(s)}
            className="h-6 w-6 rounded-full flex justify-center items-center bg-blue-100 hover:bg-blue-200 text-blue-600 transition duration-150 cursor-pointer"
            title="Edit fixed design price"
          >
            <FaPencilAlt />
          </button>
        )}

        <button
          className="h-6 w-6 rounded-full flex justify-center items-center bg-rose-100 hover:bg-rose-200 transition duration-150 cursor-pointer text-rose-600"
          onClick={() => onRequestDelete(s.id, s.name)}
        >
          <FaTrash />
        </button>
      </td>
    </tr>
  );
}
