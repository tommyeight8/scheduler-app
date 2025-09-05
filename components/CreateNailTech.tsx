"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type Props = {
  className?: string;
  onCreated?: (nailTech: { id: number; name: string }) => void;
};

export default function CreateNailTech({ className, onCreated }: Props) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setError("Nail tech name is required.");
      return;
    }
    setError(null);

    try {
      setSubmitting(true);
      const res = await fetch("/api/nail-tech", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error ?? "Failed to create nail tech.";
        toast.error(msg);
        setError(msg); // also show inline if it's a validation error
        return;
      }

      toast.success("Nail tech created");
      setName("");
      onCreated?.(data.nailTech);
    } catch {
      toast.error("Network error—please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={className ?? "bg-white p-4 rounded-xl border"}
    >
      <h2 className="text-lg font-semibold mb-3">Add Nail Tech</h2>
      <div className="flex flex-col md:flex-row gap-3">
        {/* input column */}
        <div className="flex-1 flex flex-col">
          <input
            className={`w-full rounded px-3 py-2 border ${
              error ? "border-red-500" : "border-gray-300"
            } bg-gray-50`}
            placeholder="Full name (e.g., Alice Nguyen)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            aria-label="Nail tech name"
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        {/* button column */}
        <div className="flex items-start">
          <button
            type="submit"
            disabled={submitting}
            className="rounded px-4 py-2 text-white bg-violet-600 hover:bg-violet-500 transition duration-150 cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Create"}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Names must be unique. You can edit later in the Nail Techs list.
      </p>
    </form>
  );
}
